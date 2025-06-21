import { useState, useEffect, useRef, useCallback } from 'react';
import { BacklogItem, User, Vote } from '../types';
import { Eye, EyeOff, SkipForward, CheckCircle, ArrowLeft, Users, Clock, Settings, MessageCircle, FileText, Video } from 'lucide-react';
import VotingCards from './VotingCards';
import UserIcon from './UserIcon';
import Chat from './ChatPanel';
import VideoConference from './VideoConference';
import ErrorBoundary from './ErrorBoundary';
import { calculateConsensus } from '../utils/planningPoker';
import { submitEstimation, getEstimationsForItem, getUserVote, getSessionItems, getAllBacklogItems, updateBacklogItem } from '../utils/planningSession';
import { getUserDisplayName, getUserInitials, getUserInfoById } from '../utils/userUtils';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';

interface VotingSessionProps {
  backlogItems: BacklogItem[];
  currentUser: User;
  onUpdateBacklog: (items: BacklogItem[]) => void;
  onBackToBacklog: () => void;
  sessionId: string;
}

export default function VotingSession({ 
  currentUser, 
  onBackToBacklog,
  sessionId
}: VotingSessionProps) {
  const { user } = useAuth();
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [estimationType, setEstimationType] = useState<'fibonacci' | 'tshirt'>('fibonacci');
  const [sessionItems, setSessionItems] = useState<BacklogItem[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [myVote, setMyVote] = useState<string | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [timerActive, setTimerActive] = useState(false);
  const [votingTimeLimit, setVotingTimeLimit] = useState(300); // 5 minutes default, now configurable
  const [showTimerConfig, setShowTimerConfig] = useState(false);
  const [tempTimeLimit, setTempTimeLimit] = useState(300);
  const [loading, setLoading] = useState(false);
  const [sessionItemsLoading, setSessionItemsLoading] = useState(true);
  const [channel, setChannel] = useState<any>(null);
  const [channelSubscribed, setChannelSubscribed] = useState(false);
  const [lastNotifiedTime, setLastNotifiedTime] = useState<number | null>(null);
  const [votesLoading, setVotesLoading] = useState(false);
  const [voteNotification, setVoteNotification] = useState<string | null>(null);  const [participants, setParticipants] = useState<Array<{
    id: string;
    name: string;
    role: string;
    isOnline: boolean;
    lastSeen: Date;
  }>>([]);
  const [isChatVisible, setIsChatVisible] = useState(false);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);  const [isVideoCallActive, setIsVideoCallActive] = useState(false);
  const [moderatorConsensus, setModeratorConsensus] = useState<string | null>(null);
  const [isEditingConsensus, setIsEditingConsensus] = useState(false);
  const [editedConsensusValue, setEditedConsensusValue] = useState<string>('');
  const [consensusLoading, setConsensusLoading] = useState(false);

  // Refs to access current state in broadcast handlers
  const sessionItemsRef = useRef(sessionItems);
  const currentItemIndexRef = useRef(currentItemIndex);
  
  // Update refs when state changes
  useEffect(() => {
    sessionItemsRef.current = sessionItems;
  }, [sessionItems]);
  
  useEffect(() => {
    currentItemIndexRef.current = currentItemIndex;
  }, [currentItemIndex]);

  // Helper function to format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  // Helper function for audio notifications
  const playNotification = () => {
    // Create a simple beep sound using Web Audio API
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      console.log('Audio notification not supported');
    }
  };

  // Warning notification for 30-60 seconds
  const playWarningNotification = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.4, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
      console.log('Audio notification not supported');
    }
  };

  // Urgent notification for final 10 seconds
  const playUrgentNotification = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Double beep for urgency
      for (let i = 0; i < 2; i++) {
        setTimeout(() => {
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          
          oscillator.frequency.setValueAtTime(1000, audioContext.currentTime);
          oscillator.type = 'sine';
          
          gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
          
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.2);
        }, i * 150);
      }
    } catch (error) {
      console.log('Audio notification not supported');
    }
  };

  // Setup real-time channel for timer synchronization and participant tracking
  useEffect(() => {
    if (sessionId && user) {
      const newChannel = supabase.channel(`session-${sessionId}`)        .on('broadcast', { event: 'timer-start' }, (payload) => {
          const { timeLimit, startedBy, startedByName } = payload.payload;
          if (startedBy !== user?.id) {
            setTimeRemaining(timeLimit);
            setTimerActive(true);
            playNotification(); // Notify team members when timer starts
            setVoteNotification(`⏰ ${startedByName} started the voting timer!`);
            setTimeout(() => setVoteNotification(null), 3000);
          }
        })
        .on('broadcast', { event: 'timer-pause' }, (payload) => {
          const { pausedBy, pausedByName } = payload.payload;
          if (pausedBy !== user?.id) {
            setTimerActive(false);
            setVoteNotification(`⏸️ Timer paused by ${pausedByName || 'Moderator'}`);
            setTimeout(() => setVoteNotification(null), 3000);
          }
        })
        .on('broadcast', { event: 'timer-resume' }, (payload) => {
          const { resumedBy, resumedByName } = payload.payload;
          if (resumedBy !== user?.id) {
            setTimerActive(true);
            setVoteNotification(`▶️ Timer resumed by ${resumedByName || 'Moderator'}`);
            setTimeout(() => setVoteNotification(null), 3000);
          }
        })
        .on('broadcast', { event: 'timer-reset' }, (payload) => {
          const { resetBy, resetByName, timeLimit } = payload.payload;
          if (resetBy !== user?.id) {
            setTimerActive(false);
            setTimeRemaining(timeLimit);
            setVoteNotification(`🔄 Timer reset by ${resetByName || 'Moderator'}`);
            setTimeout(() => setVoteNotification(null), 3000);
          }
        }).on('broadcast', { event: 'timer-tick' }, (payload) => {
          const { timeLeft, isActive } = payload.payload;
          setTimeRemaining(timeLeft);
          setTimerActive(isActive);
          
          // Enhanced notifications with different sounds for different phases
          const shouldNotify = (timeLeft === 60 || timeLeft === 30 || timeLeft === 10 || timeLeft === 5) && 
                              lastNotifiedTime !== timeLeft;
          
          if (shouldNotify) {
            // Different notification patterns for different urgency levels
            if (timeLeft <= 10) {
              // Urgent notification for final 10 seconds
              playUrgentNotification();
            } else if (timeLeft <= 30) {
              // Warning notification for 30 seconds
              playWarningNotification();
            } else {
              // Standard notification for 60 seconds
              playNotification();
            }
            setLastNotifiedTime(timeLeft);
            
            // Show visual notification
            setVoteNotification(`⏰ ${timeLeft} seconds remaining!`);
            setTimeout(() => setVoteNotification(null), 2000);
          }
          
          if (timeLeft === 0) {
            setTimerActive(false);
            playNotification(); // Final notification when timer ends
            setVoteNotification('⏰ Time\'s up! Votes will be revealed.');
            setTimeout(() => setVoteNotification(null), 3000);
          }
        })        .on('broadcast', { event: 'vote-submitted' }, (payload) => {
          console.log('📥 Received vote-submitted broadcast:', payload);
          const { itemId, voterId, voterName } = payload.payload;
          
          // Get current item from refs to avoid stale closure
          const currentSessionItems = sessionItemsRef.current;
          const currentItemIndexValue = currentItemIndexRef.current;
          const currentActiveItem = currentSessionItems[currentItemIndexValue];
          
          console.log('🔍 Processing vote-submitted broadcast:', {
            itemId_from_broadcast: itemId,
            current_item_id: currentActiveItem?.id,
            current_item_index: currentItemIndexValue,
            session_items_length: currentSessionItems.length,
            voter_id: voterId,
            current_user_id: user?.id
          });
          
          if (!currentActiveItem) {
            console.log('🚫 No current item set, cannot process vote broadcast', {
              sessionItems_length: currentSessionItems.length,
              currentItemIndex: currentItemIndexValue,
              itemId_from_broadcast: itemId
            });
            return;
          }          if (itemId === currentActiveItem.id && voterId !== user?.id) {
            console.log('🔄 Refreshing votes due to broadcast from:', voterName);
            console.log('🔍 CROSS-USER VOTE DEBUG:', {
              broadcast_from_user: voterName,
              broadcast_from_user_id: voterId,
              current_user_id: user?.id,
              current_user_email: user?.email,
              current_item_id: currentActiveItem.id,
              broadcast_item_id: itemId,
              will_reload_votes: true,
              current_votes_before_reload: votes.length
            });            // Load votes and add extra logging
            // Add a small delay to ensure database consistency before querying
            setTimeout(() => {
              console.log('🔍 CROSS-USER: About to load votes for item after delay:', currentActiveItem.id);
              loadVotesForCurrentItem().then(() => {
                console.log('✅ CROSS-USER VOTE: Vote refresh completed');
                // We can't access the votes state directly here due to closure issues
                // The vote state will be updated by the loadVotesForCurrentItem function
                setTimeout(() => {
                  console.log('🔍 VOTE STATE AFTER REFRESH: Vote loading completed, UI should be updated');
                  // Force a re-check of votes from DOM
                  const voteElements = document.querySelectorAll('.space-y-3 .flex.items-center.justify-between.p-3');
                  console.log('🔍 DOM CHECK: Found', voteElements.length, 'vote elements in UI');
                  
                  // If no votes found in DOM but we should have some, trigger another refresh
                  if (voteElements.length === 0) {
                    console.log('⚠️ No votes in DOM, triggering additional refresh in 1 second...');
                    setTimeout(() => {
                      loadVotesForCurrentItem().then(() => {
                        console.log('✅ ADDITIONAL REFRESH: Completed');
                      }).catch((error) => {
                        console.error('❌ ADDITIONAL REFRESH: Failed:', error);
                      });
                    }, 1000);
                  }
                }, 200);
              }).catch((error) => {
                console.error('❌ CROSS-USER VOTE: Vote refresh failed:', error);
              });
            }, 150); // Small delay before querying database
            
            // Show notification
            setVoteNotification(`${voterName} submitted a vote`);
            setTimeout(() => setVoteNotification(null), 3000);          } else {
            const reason = itemId !== currentActiveItem.id ? 'different item' : 'own vote';
            console.log(`🚫 Ignoring broadcast (${reason}):`, { 
              currentItemId: currentActiveItem.id,
              broadcastItemId: itemId,
              isOwnVote: voterId === user?.id,
              current_user_id: user?.id,
              broadcast_voter_id: voterId
            });
          }
        })
        .on('broadcast', { event: 'vote-changed' }, (payload) => {
          console.log('📥 Received vote-changed broadcast:', payload);
          const { itemId, voterId, voterName, newValue } = payload.payload;
          
          // Get current item from refs to avoid stale closure
          const currentSessionItems = sessionItemsRef.current;
          const currentItemIndexValue = currentItemIndexRef.current;
          const currentActiveItem = currentSessionItems[currentItemIndexValue];
          
          console.log('🔍 Processing vote-changed broadcast:', {
            itemId_from_broadcast: itemId,
            current_item_id: currentActiveItem?.id,
            voter_id: voterId,
            current_user_id: user?.id,
            new_value: newValue
          });
          
          if (!currentActiveItem) {
            console.log('🚫 No current item set, cannot process vote change broadcast');
            return;
          }
          
          // Only update if the vote change wasn't made by this user and it's for the current item
          if (itemId === currentActiveItem.id && voterId !== user?.id) {
            console.log('🔄 Refreshing votes due to vote change from:', voterName);
            
            // Refresh the votes to show the updated vote
            setTimeout(() => {
              loadVotesForCurrentItem().then(() => {
                console.log('✅ Vote refresh completed after vote change');
              }).catch((error) => {
                console.error('❌ Vote refresh failed after vote change:', error);
              });
            }, 150);
            
            // Show notification about the vote update
            setVoteNotification(`${voterName} updated their vote to ${newValue}`);
            setTimeout(() => setVoteNotification(null), 3000);
          } else {
            const reason = itemId !== currentActiveItem.id ? 'different item' : 'own vote change';
            console.log(`🚫 Ignoring vote change broadcast (${reason})`);
          }
        })
        .on('broadcast', { event: 'vote-changed' }, (payload) => {
          console.log('📥 Received vote-changed broadcast:', payload);
          const { itemId, voterId, voterName } = payload.payload;
          
          // Get current item from refs to avoid stale closure
          const currentSessionItems = sessionItemsRef.current;
          const currentItemIndexValue = currentItemIndexRef.current;
          const currentActiveItem = currentSessionItems[currentItemIndexValue];
          
          console.log('🔍 Processing vote-changed broadcast:', {
            itemId_from_broadcast: itemId,
            current_item_id: currentActiveItem?.id,
            current_item_index: currentItemIndexValue,
            session_items_length: currentSessionItems.length,
            voter_id: voterId,
            current_user_id: user?.id
          });
          
          if (!currentActiveItem) {
            console.log('🚫 No current item set, cannot process vote-changed broadcast', {
              sessionItems_length: currentSessionItems.length,
              currentItemIndex: currentItemIndexValue,
              itemId_from_broadcast: itemId
            });
            return;
          }
            if (itemId === currentActiveItem.id && voterId !== user?.id) {
            console.log('🔄 Refreshing votes due to vote change from:', voterName);
            console.log('🔍 CROSS-USER VOTE CHANGE DEBUG:', {
              broadcast_from_user: voterName,
              broadcast_from_user_id: voterId,
              current_user_id: user?.id,
              current_user_email: user?.email,
              current_item_id: currentActiveItem.id,
              broadcast_item_id: itemId,
              will_reload_votes: true
            });
            
            // Load votes and add extra logging
            loadVotesForCurrentItem().then(() => {
              console.log('✅ CROSS-USER VOTE CHANGE: Vote refresh completed');
            }).catch((error) => {
              console.error('❌ CROSS-USER VOTE CHANGE: Vote refresh failed:', error);
            });
            
            // Show notification
            setVoteNotification(`${voterName} changed their vote`);
            setTimeout(() => setVoteNotification(null), 3000);
          } else {
            const reason = itemId !== currentActiveItem.id ? 'different item' : 'own vote';
            console.log(`🚫 Ignoring vote-changed broadcast (${reason}):`, { 
              currentItemId: currentActiveItem.id,
              broadcastItemId: itemId,
              isOwnVote: voterId === user?.id,
              current_user_id: user?.id,
              broadcast_voter_id: voterId
            });
          }
        })
        .on('broadcast', { event: 'item-changed' }, (payload) => {
          const { newItemIndex, changedBy } = payload.payload;
          // Only update if the change wasn't made by this user
          if (changedBy !== user?.id) {
            setCurrentItemIndex(newItemIndex);
            resetForNewItem();
            // Show notification for team members
            if (currentUser.role === 'Team Member') {
              setVoteNotification('Moderator moved to a new item');
              setTimeout(() => setVoteNotification(null), 3000);
            }
          }
        })        .on('broadcast', { event: 'votes-revealed' }, (payload) => {
          console.log('🎯 VOTES-REVEALED BROADCAST RECEIVED:', payload);
          
          const { 
            itemId, 
            itemTitle, 
            revealedBy, 
            revealedByName, 
            votes: broadcastVotes,
            consensus, 
            estimationType: broadcastEstimationType,
            timestamp 
          } = payload.payload;
          
          console.log('📡 RECEIVED REVEAL VOTES BROADCAST:', {
            itemId,
            itemTitle,
            revealedBy,
            revealedByName,
            votesCount: broadcastVotes?.length || 0,
            consensus,
            estimationType: broadcastEstimationType,
            timestamp,
            currentItemId: currentItem?.id,
            isCurrentUser: revealedBy === user?.id
          });          // Only update if it's not revealed by this user (be more lenient about item matching)
          const isNotOwnBroadcast = revealedBy !== user?.id;
          const isForCurrentItem = currentItem?.id === itemId || 
                                  sessionItems.some(item => item.id === itemId);
          
          // Allow broadcast if it's not our own broadcast (relaxed item matching for late state sync)
          if (isNotOwnBroadcast) {
            console.log('✅ Applying reveal votes broadcast');
            
            setIsRevealed(true);
            setTimerActive(false);
            
            // Update votes if provided in broadcast (for consistency)
            if (broadcastVotes && Array.isArray(broadcastVotes)) {
              setVotes(broadcastVotes);
            }
            
            // Update estimation type if provided
            if (broadcastEstimationType && broadcastEstimationType !== estimationType) {
              setEstimationType(broadcastEstimationType);
            }
            
            // Show notification to participants
            const notificationMessage = revealedByName 
              ? `${revealedByName} revealed the votes!`
              : 'Votes have been revealed!';
              
            setVoteNotification(notificationMessage);
            setTimeout(() => setVoteNotification(null), 4000);
            
            // Refresh votes to ensure we have the latest data
            loadVotesForCurrentItem();          } else {
            console.log('⏭️ Skipping reveal votes broadcast:', {
              reason: 'own broadcast',
              itemId,
              currentItemId: currentItem?.id,
              sessionItemsCount: sessionItems.length,
              sessionItemIds: sessionItems.map(item => item.id),
              revealedBy,
              userId: user?.id,
              isForCurrentItem,
              isNotOwnBroadcast
            });
          }
        }).on('broadcast', { event: 'estimation-type-changed' }, (payload) => {
          const { newEstimationType, changedBy, hadVotes } = payload.payload;
          // Only update if the change wasn't made by this user
          if (changedBy !== user?.id) {
            setEstimationType(newEstimationType);
            // Reset votes when estimation type changes
            setMyVote(null);
            setVotes([]);
            setIsRevealed(false);
            if (currentUser.role === 'Team Member') {
              const message = hadVotes 
                ? `Moderator changed estimation to ${newEstimationType === 'fibonacci' ? 'Fibonacci' : 'T-Shirt Sizes'}. All votes reset.`
                : `Estimation type changed to ${newEstimationType === 'fibonacci' ? 'Fibonacci' : 'T-Shirt Sizes'}`;
              setVoteNotification(message);
              setTimeout(() => setVoteNotification(null), 4000);
            }
          }
        })
        .on('broadcast', { event: 'timer-config-changed' }, (payload) => {
          const { newTimeLimit, changedBy, changedByName } = payload.payload;
          // Only update if the change wasn't made by this user
          if (changedBy !== user?.id) {
            setVotingTimeLimit(newTimeLimit);
            if (currentUser.role === 'Team Member') {
              const minutes = Math.floor(newTimeLimit / 60);
              const seconds = newTimeLimit % 60;
              const timeDisplay = `${minutes}:${seconds.toString().padStart(2, '0')}`;
              setVoteNotification(`⚙️ ${changedByName} configured timer to ${timeDisplay}`);
              setTimeout(() => setVoteNotification(null), 4000);
            }
          }        })        .on('broadcast', { event: 'consensus-changed' }, (payload) => {
          console.log('📥 Received consensus-changed broadcast:', payload);
          const { itemId, newConsensusValue, changedBy, changedByName, isEstimatedItem } = payload.payload;
          
          // Get current item from refs to avoid stale closure
          const currentSessionItems = sessionItemsRef.current;
          const currentItemIndexValue = currentItemIndexRef.current;
          const currentActiveItem = currentSessionItems[currentItemIndexValue];
          
          if (!currentActiveItem) {
            console.log('🚫 No current item set, cannot process consensus change broadcast');
            return;
          }
          
          // Only update if the change wasn't made by this user and it's for the current item
          if (itemId === currentActiveItem.id && changedBy !== user?.id) {
            console.log('🔄 Updating consensus due to moderator change');
            
            // For estimated items, update the session items array
            if (isEstimatedItem) {
              const updatedPoints = estimationType === 'fibonacci' 
                ? parseFloat(newConsensusValue) 
                : newConsensusValue;
              
              setSessionItems(prevItems => 
                prevItems.map(item => 
                  item.id === itemId 
                    ? { ...item, storyPoints: updatedPoints }
                    : item
                )
              );
              
              console.log('✅ Updated session items for estimated item:', {
                itemId,
                newStoryPoints: updatedPoints
              });
            } else {
              // Update the moderator consensus for non-estimated items
              setModeratorConsensus(newConsensusValue);
            }
              // Show notification about the consensus update
            const message = isEstimatedItem 
              ? `🎯 Moderator ${changedByName} updated final estimate to ${newConsensusValue}`
              : `🎯 Moderator ${changedByName} set consensus to ${newConsensusValue}`;
            setVoteNotification(message);
            setTimeout(() => setVoteNotification(null), 4000);
          }
        })
        .on('presence', { event: 'sync' }, () => {
          const presenceState = newChannel.presenceState();
          const allPresences = Object.values(presenceState).flat();
          
          // Create a map to ensure unique participants by user_id
          const participantMap = new Map();
          allPresences.forEach((presence: any) => {
            participantMap.set(presence.user_id, {
              id: presence.user_id,
              name: presence.user_name,
              role: presence.user_role,
              isOnline: true,
              lastSeen: new Date()
            });
          });
          
          const currentParticipants = Array.from(participantMap.values());
          setParticipants(currentParticipants);
        })
        .on('presence', { event: 'join' }, ({ newPresences }) => {
          const joinedUsers = newPresences.map((presence: any) => presence.user_name).join(', ');
          if (joinedUsers) {
            setVoteNotification(`${joinedUsers} joined the session`);
            setTimeout(() => setVoteNotification(null), 3000);
          }
        })
        .on('presence', { event: 'leave' }, ({ leftPresences }) => {
          const leftUsers = leftPresences.map((presence: any) => presence.user_name).join(', ');
          if (leftUsers) {
            setVoteNotification(`${leftUsers} left the session`);
            setTimeout(() => setVoteNotification(null), 3000);
          }        })        .subscribe(async (status) => {
          console.log('📡 Channel subscription status:', status);
          if (status === 'SUBSCRIBED') {
            console.log('✅ Successfully subscribed to channel');
            setChannelSubscribed(true);
            // Track this user's presence in the session
            await newChannel.track({
              user_id: user.id,
              user_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
              user_role: currentUser.role,
              joined_at: new Date().toISOString()
            });
          } else if (status === 'CLOSED') {
            console.log('❌ Channel subscription closed');
            setChannelSubscribed(false);
          } else if (status === 'CHANNEL_ERROR') {
            console.error('❌ Channel subscription error');
            setChannelSubscribed(false);
          }
        });

      setChannel(newChannel);      return () => {
        console.log('🔌 Unsubscribing from channel');
        setChannelSubscribed(false);
        newChannel.unsubscribe();
      };
    }
  }, [sessionId, user?.id]); // Removed currentItemIndex and lastNotifiedTime to prevent unnecessary channel recreation

  // Load items assigned to this session
  useEffect(() => {
    if (sessionId) {
      loadSessionItems();
    }
  }, [sessionId]);

  const loadSessionItems = async () => {
    setSessionItemsLoading(true);
    try {
      // Load all backlog items first
      const allItems = await getAllBacklogItems();
      const formattedItems = allItems.map((item: any) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        priority: item.priority,
        status: item.status,
        storyPoints: item.story_points,
        estimationType: item.estimation_type,
        acceptanceCriteria: item.acceptance_criteria || [],
        votingTimeLimit: item.voting_time_limit || 300
      }));
      
      // Then load session-specific items
      const items = await getSessionItems(sessionId);
      const sessionBacklogItems = items
        .filter((item: any) => item.backlog_items)
        .map((item: any) => {
          const backlogItem = formattedItems.find(bi => bi.id === item.backlog_items.id);
          return backlogItem || {
            id: item.backlog_items.id,
            title: item.backlog_items.title,
            description: item.backlog_items.description,
            priority: item.backlog_items.priority,
            status: item.backlog_items.status,
            storyPoints: item.backlog_items.story_points,
            estimationType: item.backlog_items.estimation_type,
            acceptanceCriteria: item.backlog_items.acceptance_criteria || [],
            votingTimeLimit: item.backlog_items.voting_time_limit || 300
          };        })
        // Remove filter to include both pending and estimated items
        // .filter((item: BacklogItem) => item.status === 'Pending');
      
      setSessionItems(sessionBacklogItems);
    } catch (error) {
      console.error('Error loading session items:', error);
    } finally {
      setSessionItemsLoading(false);
    }  };
  const allSessionItems = sessionItems; // Include both pending and estimated items
  const currentItem = allSessionItems[currentItemIndex];

  // Debug current item state
  useEffect(() => {
    console.log('🔍 Current item state:', {
      sessionItems_length: sessionItems.length,
      currentItemIndex,      currentItem_id: currentItem?.id,
      currentItem_title: currentItem?.title,
      allSessionItems_length: allSessionItems.length
    });
  }, [currentItem, currentItemIndex, sessionItems]);
  // Load votes and user's vote for current item
  useEffect(() => {
    if (currentItem && sessionId && user) {
      loadVotesForCurrentItem();
      loadUserVote();
      
      // Set estimation type from item preference if moderator and item has preference
      if (currentUser.role === 'Moderator' && currentItem.estimationType && currentItem.estimationType !== estimationType) {
        handleEstimationTypeChange(currentItem.estimationType as 'fibonacci' | 'tshirt');
      }
    }
  }, [currentItem, sessionId, user]);
  // Auto-reveal votes for estimated items and initialize moderator consensus
  useEffect(() => {
    if (currentItem?.status === 'Estimated') {
      console.log('🔍 Auto-revealing votes for estimated item:', currentItem.title);
      setIsRevealed(true);
      
      // Initialize moderator consensus with the stored story points for estimated items
      if (currentItem.storyPoints !== undefined && currentItem.storyPoints !== null) {
        setModeratorConsensus(String(currentItem.storyPoints));
        console.log('🔍 Initialized moderator consensus for estimated item:', currentItem.storyPoints);
      }
    } else {
      // Reset reveal state for non-estimated items
      setIsRevealed(false);
      // Clear moderator consensus for non-estimated items
      setModeratorConsensus(null);
    }
  }, [currentItem?.id, currentItem?.status, currentItem?.storyPoints]);

  // Helper function to detect vote changes
  const hasVoteChanges = (newEstimations: any[], currentVotes: Vote[]) => {
    // Create a map of current votes by user_id
    const currentVoteMap = new Map();
    currentVotes.forEach(vote => {
      currentVoteMap.set(vote.userId, {
        points: vote.points,
        timestamp: vote.timestamp?.getTime()
      });
    });
    
    // Check if any estimation differs from current votes
    for (const est of newEstimations) {
      const currentVote = currentVoteMap.get(est.user_id);
      if (!currentVote) {
        // New vote found
        return true;
      }
      if (currentVote.points !== est.value) {
        // Vote value changed
        return true;
      }
      const estTimestamp = new Date(est.created_at).getTime();
      if (currentVote.timestamp !== estTimestamp) {
        // Vote timestamp changed (likely updated)
        return true;
      }
    }
    
    return false;
  };

  // Auto-refresh Team Votes section periodically to catch any missed updates
  useEffect(() => {
    if (!currentItem || !sessionId || !user) return;
    
    console.log('🔄 Setting up auto-refresh for Team Votes section');
    
    const refreshInterval = setInterval(async () => {
      console.log('🔄 AUTO-REFRESH: Checking for vote updates...');
      try {
        const estimations = await getEstimationsForItem(sessionId, currentItem.id);
        console.log('🔄 AUTO-REFRESH: Found', estimations.length, 'estimations');        if (estimations.length !== votes.length || hasVoteChanges(estimations, votes)) {
          console.log('🔄 AUTO-REFRESH: Vote changes detected, refreshing...');
          // Trigger a manual refresh by calling the vote loading logic directly
          setVotesLoading(true);
          
          const voteMap = new Map();
          estimations.forEach((est: any) => {
            let userName = 'User';
            
            if (est.user_id === user?.id && user) {
              userName = getUserDisplayName(user);
            } else {
              const participant = participants.find(p => p.id === est.user_id);
              if (participant && participant.name && participant.name !== 'User') {
                userName = participant.name;
              } else {
                const userInfo = getUserInfoById(est.user_id);
                userName = userInfo.name;
              }
            }
            
            let userRole = 'Team Member';
            if (est.user_id === user?.id) {
              userRole = currentUser.role;
            } else {
              const participant = participants.find(p => p.id === est.user_id);
              if (participant?.role) {
                userRole = participant.role;
              }
            }
            
            voteMap.set(est.user_id, {
              userId: est.user_id,
              userName,
              userRole,
              points: est.value,
              timestamp: new Date(est.created_at),
              canEdit: est.user_id === user?.id
            });
          });
          
          const formattedVotes: Vote[] = Array.from(voteMap.values());
          setVotes(formattedVotes);
          setVotesLoading(false);
          
          console.log('🔄 AUTO-REFRESH: Updated votes to', formattedVotes.length, 'votes');
        }
      } catch (error) {
        console.error('❌ AUTO-REFRESH: Vote refresh failed:', error);
      }
    }, 2000); // Check every 2 seconds
    
    return () => {
      console.log('🔄 Cleaning up auto-refresh interval');
      clearInterval(refreshInterval);
    };
  }, [currentItem, sessionId, user, votes.length, participants, currentUser.role]);

  // Add debug function to window for manual testing
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).forceRefreshVotes = () => {
        console.log('🔧 MANUAL REFRESH: Forcing vote refresh...');
        return loadVotesForCurrentItem().then(() => {
          console.log('🔧 MANUAL REFRESH: Completed');
        }).catch((error) => {
          console.error('❌ MANUAL REFRESH: Failed:', error);
        });
      };
      
      (window as any).checkVoteDOM = () => {
        const voteElements = document.querySelectorAll('.space-y-3 .flex.items-center.justify-between.p-3');
        console.log('🔧 DOM CHECK: Found', voteElements.length, 'vote elements');
        Array.from(voteElements).forEach((el, index) => {
          const nameEl = el.querySelector('.font-medium.text-gray-900');
          const pointsEl = el.querySelector('.px-3.py-1.rounded-lg.font-bold');
          console.log(`   ${index + 1}. ${nameEl?.textContent} - ${pointsEl?.textContent}`);
        });
        return voteElements.length;
      };
    }
  }, []);  const loadVotesForCurrentItem = useCallback(async () => {
    if (!currentItem || !sessionId) return;
    
    console.log('🔍 Loading votes for item:', currentItem.id);
    console.log('🔍 VOTE LOADING DEBUG:', {
      current_item_id: currentItem.id,
      session_id: sessionId,
      current_user_id: user?.id,
      current_user_email: user?.email,
      participants_count: participants.length,
      participants_list: participants.map(p => ({ id: p.id, name: p.name }))
    });
    
    setVotesLoading(true);
    try {
      const estimations = await getEstimationsForItem(sessionId, currentItem.id);
      console.log('🔍 Raw estimations received:', estimations.length, 'records');
      
      // Create a map to ensure unique votes by user_id
      const voteMap = new Map();
      estimations.forEach((est: any) => {
        console.log('🔍 Processing estimation:', {
          est_user_id: est.user_id,
          current_user_id: user?.id,
          current_user_email: user?.email,
          current_user_metadata: user?.user_metadata,
          is_current_user: est.user_id === user?.id,
          est_value: est.value
        });
        
        // Enhanced user name resolution
        let userName = 'User';
        
        if (est.user_id === user?.id && user) {
          // This is the current user - use consistent logic
          userName = getUserDisplayName(user);
          console.log('🔍 Current user display name:', userName);        } else {
          // For other users, try to find them in session participants first
          const participant = participants.find(p => p.id === est.user_id);
          if (participant && participant.name && participant.name !== 'User') {
            userName = participant.name;
            console.log('🔍 Found participant name:', userName);
          } else {
            // Use the getUserInfoById function for consistent naming
            const userInfo = getUserInfoById(est.user_id);
            userName = userInfo.name;
            console.log('🔍 Using getUserInfoById result:', userName);
          }
        }
        
        // Role resolution
        let userRole = 'Team Member';
        if (est.user_id === user?.id) {
          userRole = currentUser.role;
        } else {
          const participant = participants.find(p => p.id === est.user_id);
          if (participant?.role) {
            userRole = participant.role;
          }
        }
        
        console.log('🔍 Final user info:', { userId: est.user_id, userName, userRole });
        
        voteMap.set(est.user_id, {
          userId: est.user_id,
          userName,
          userRole,
          points: est.value,
          timestamp: new Date(est.created_at),
          canEdit: est.user_id === user?.id
        });      });const formattedVotes: Vote[] = Array.from(voteMap.values());
      console.log('🔍 Loaded', formattedVotes.length, 'votes for item');
      console.log('🔍 DETAILED VOTE DATA:', formattedVotes.map(vote => ({
        userId: vote.userId,
        userName: vote.userName,
        points: vote.points,
        timestamp: vote.timestamp?.toLocaleTimeString(),
        canEdit: vote.canEdit
      })));
      
      setVotes(formattedVotes);
      
      // Add a small delay and then verify votes were set
      setTimeout(() => {
        console.log('🔍 VOTE STATE VERIFICATION:', {
          votesSetTo: formattedVotes.length,
          currentVotesState: votes.length,
          stateMatches: formattedVotes.length === votes.length
        });
      }, 100);
    } catch (error) {
      console.error('Error loading votes:', error);
      setVotes([]);
    } finally {
      setVotesLoading(false);
    }
  }, [currentItem, sessionId, user, participants, currentUser.role]);
  const loadUserVote = async () => {
    if (!currentItem || !sessionId || !user) return;
    
    try {
      console.log('🔍 Loading user vote for current user');
      const userEstimation = await getUserVote(sessionId, currentItem.id, user.id);
      setMyVote(userEstimation?.value || null);
      console.log('✅ User vote loaded:', userEstimation?.value || 'no vote');
    } catch (error) {
      console.error('❌ Error loading user vote:', error);
      setMyVote(null);
      // Don't let this error break the component
    }
  };

  // Timer functionality with real-time synchronization
  useEffect(() => {
    if (timerActive && timeRemaining !== null && timeRemaining > 0) {
      const timer = setTimeout(() => {
        const newTimeRemaining = timeRemaining - 1;
        setTimeRemaining(newTimeRemaining);
          // Broadcast timer tick to all clients (only from moderator)
        if (currentUser.role === 'Moderator' && channel) {
          const totalTime = currentItem?.votingTimeLimit || 300;
          const progress = ((totalTime - newTimeRemaining) / totalTime) * 100;
          const warningPhase = newTimeRemaining <= 60;
          const criticalPhase = newTimeRemaining <= 30;
          const urgentPhase = newTimeRemaining <= 10;
          
          channel.send({
            type: 'broadcast',
            event: 'timer-tick',
            payload: {
              timeLeft: newTimeRemaining,
              isActive: newTimeRemaining > 0,
              totalTime,
              progress,
              warningPhase,
              criticalPhase,
              urgentPhase,
              itemId: currentItem?.id
            }
          });
        }
      }, 1000);
      return () => clearTimeout(timer);
    } else if (timeRemaining === 0) {
      setTimerActive(false);
      if (currentUser.role === 'Moderator') {
        revealVotes();
      }
    }
  }, [timerActive, timeRemaining, currentUser.role, channel]);
  const startTimer = () => {
    // Use the configured voting time limit
    const timeLimit = votingTimeLimit;
    setTimeRemaining(timeLimit);
    setTimerActive(true);
    
    // Broadcast timer start to all clients
    if (channel && currentUser.role === 'Moderator') {
      channel.send({
        type: 'broadcast',
        event: 'timer-start',
        payload: {
          timeLimit,
          startedBy: user?.id,
          startedByName: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Moderator',
          itemId: currentItem?.id,
          itemTitle: currentItem?.title
        }
      });
    }
  };
  const pauseTimer = () => {
    setTimerActive(false);
    
    // Broadcast timer pause to all clients
    if (channel && currentUser.role === 'Moderator') {
      channel.send({
        type: 'broadcast',
        event: 'timer-pause',
        payload: {
          pausedBy: user?.id,
          pausedByName: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Moderator'
        }
      });
    }
  };

  const resumeTimer = () => {
    setTimerActive(true);
    
    // Broadcast timer resume to all clients
    if (channel && currentUser.role === 'Moderator') {
      channel.send({
        type: 'broadcast',
        event: 'timer-resume',
        payload: {
          resumedBy: user?.id,
          resumedByName: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Moderator'
        }
      });
    }
  };
  const resetTimer = () => {
    setTimerActive(false);
    const timeLimit = votingTimeLimit; // Use configured time limit
    setTimeRemaining(timeLimit);
    
    // Broadcast timer reset to all clients
    if (channel && currentUser.role === 'Moderator') {
      channel.send({
        type: 'broadcast',
        event: 'timer-reset',
        payload: {
          timeLimit,
          resetBy: user?.id,
          resetByName: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Moderator'
        }
      });
    }
  };

  // Voting functions
  const handleVote = async (value: string | number) => {
    if (!currentItem || !user || loading) return;
    
    setLoading(true);
    const wasExistingVote = myVote !== null;
    
    try {      await submitEstimation(sessionId, currentItem.id, user.id, value);
      setMyVote(value.toString());
      
      // Refresh votes immediately to show updated state
      await loadVotesForCurrentItem();
        // Wait a moment to ensure database write is fully committed before broadcasting
      await new Promise(resolve => setTimeout(resolve, 250));
      
      // Broadcast vote event to other participants
      if (channel && channelSubscribed) {
        const voterDisplayName = getUserDisplayName(user);
        const voterInitials = getUserInitials(voterDisplayName);
        
        const broadcastPayload = {
          type: 'broadcast',
          event: wasExistingVote ? 'vote-changed' : 'vote-submitted',
          payload: {
            itemId: currentItem.id,
            voterId: user.id,
            voterName: voterDisplayName,
            voterInitials: voterInitials,
            value: value.toString(),
            timestamp: new Date().toISOString()
          }
        };
        
        console.log('📡 Attempting to send vote broadcast:', {
          channel_state: channel.state,
          channel_subscribed: channelSubscribed,
          payload: broadcastPayload,
          currentItem_id: currentItem.id,
          user_id: user.id
        });
        
        // Send immediately without delay, but with better error handling
        channel.send(broadcastPayload).then((result: any) => {
          console.log('✅ Vote broadcast sent successfully:', result);
        }).catch((error: any) => {
          console.error('❌ Vote broadcast failed:', error);
          console.error('❌ Channel state when failed:', channel.state);
          console.error('❌ Channel subscribed status:', channelSubscribed);
        });
      } else {
        console.error('❌ Cannot broadcast vote - channel not ready', {
          channel_exists: !!channel,
          channel_subscribed: channelSubscribed,
          user_id: user?.id,
          sessionId: sessionId
        });
      }
    } catch (error: any) {
      console.error('Error submitting vote:', error);
      // Show specific error message based on the error type
      let errorMessage = 'Error submitting vote. Please try again.';
      
      if (error?.message?.includes('issue_id')) {
        errorMessage = 'Database schema issue detected. Please contact support.';
      } else if (error?.message?.includes('not-null constraint')) {
        errorMessage = 'Database constraint error. Please refresh and try again.';
      } else if (error?.message?.includes('unique constraint')) {
        errorMessage = 'Vote conflict detected. Please refresh and try again.';
      }
      
      setVoteNotification(errorMessage);
      setTimeout(() => setVoteNotification(null), 5000);
    } finally {
      setLoading(false);
    }
  };
  const revealVotes = async () => {    console.log('🔍 REVEAL VOTES TRIGGERED:', {
      currentItem: currentItem?.id,
      votesCount: votes.length,
      moderator: currentUser.role === 'Moderator',
      channelReady: !!channel,
      channelSubscribed: channelSubscribed,
      userId: user?.id,
      sessionId: sessionId
    });

    setIsRevealed(true);
    setTimerActive(false);    // Calculate consensus for broadcasting
    const voteValues = votes.map(v => v.points);
    const consensus = calculateConsensus(voteValues, estimationType);
    
    // Check if there are other participants to broadcast to
    const otherParticipants = participants.filter(p => p.id !== user?.id);
    console.log('👥 Other participants to broadcast to:', otherParticipants.length, otherParticipants.map(p => p.name));
      // Broadcast vote reveal to all participants with complete voting data
    if (currentUser.role === 'Moderator' && channel && channelSubscribed && currentItem) {
      const broadcastPayload = {
        itemId: currentItem.id,
        itemTitle: currentItem.title,
        revealedBy: user?.id,
        revealedByName: getUserDisplayName(user),
        votes: votes,
        consensus: consensus,
        estimationType: estimationType,
        timestamp: new Date().toISOString()
      };

      console.log('📡 BROADCASTING REVEAL VOTES:', broadcastPayload);      try {
        const result = await channel.send({
          type: 'broadcast',
          event: 'votes-revealed',
          payload: broadcastPayload
        });
        
        console.log('✅ Reveal votes broadcast result:', result);
        console.log('✅ Reveal votes broadcast sent successfully');
        
        // Verify broadcast was actually sent
        if (result && result.status === 'ok') {
          console.log('✅ Broadcast confirmed as sent');
        } else {
          console.warn('⚠️ Broadcast result uncertain:', result);
        }
        
        // Show confirmation to moderator
        setVoteNotification('Votes revealed to all participants!');
        setTimeout(() => setVoteNotification(null), 3000);
          } catch (error) {
        console.error('❌ Failed to broadcast reveal votes:', error);
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        const errorStack = error instanceof Error ? error.stack : undefined;
        console.error('❌ Error details:', {
          message: errorMsg,
          stack: errorStack,
          channelStatus: channel ? 'exists' : 'missing',
          subscriptionStatus: channelSubscribed
        });
        setVoteNotification('Error revealing votes to participants');
        setTimeout(() => setVoteNotification(null), 3000);
      }
    } else {      console.warn('⚠️ Cannot broadcast reveal votes:', {
        isModerator: currentUser.role === 'Moderator',
        hasChannel: !!channel,
        channelSubscribed: channelSubscribed,
        hasCurrentItem: !!currentItem,
        userId: user?.id,
        sessionId: sessionId
      });
      
      // Show error notification to moderator
      setVoteNotification('Cannot broadcast - check connection');
      setTimeout(() => setVoteNotification(null), 3000);
    }
  };
  const nextItem = () => {
    if (currentItemIndex < allSessionItems.length - 1) {
      const newIndex = currentItemIndex + 1;
      setCurrentItemIndex(newIndex);
      resetForNewItem();
      
      // Broadcast item change to all participants (only from moderator)
      if (currentUser.role === 'Moderator' && channel) {
        channel.send({
          type: 'broadcast',
          event: 'item-changed',
          payload: {
            newItemIndex: newIndex,
            changedBy: user?.id,
            newItemTitle: allSessionItems[newIndex]?.title || 'Unknown Item'
          }
        });
      }
    }
  };
  const previousItem = () => {
    if (currentItemIndex > 0) {
      const newIndex = currentItemIndex - 1;
      setCurrentItemIndex(newIndex);
      resetForNewItem();
      
      // Broadcast item change to all participants (only from moderator)
      if (currentUser.role === 'Moderator' && channel) {
        channel.send({
          type: 'broadcast',
          event: 'item-changed',
          payload: {
            newItemIndex: newIndex,
            changedBy: user?.id,
            newItemTitle: allSessionItems[newIndex]?.title || 'Unknown Item'
          }
        });
      }
    }
  };const resetForNewItem = () => {
    setIsRevealed(false);
    setMyVote(null);
    setVotes([]);
    setTimerActive(false);
    setTimeRemaining(null);
    setModeratorConsensus(null); // Clear moderator consensus for new item
    setIsEditingConsensus(false); // Exit edit mode if active
    setEditedConsensusValue(''); // Clear edit value
  };
  const handleAcceptEstimate = async () => {
    if (!currentItem) return;
    
    try {
      // Get the final estimate value (moderator override takes precedence)
      const finalEstimate = moderatorConsensus || consensus || (estimationType === 'fibonacci' ? average.toFixed(1) : 'M');
      
      console.log('📝 Accepting estimate for item:', {
        itemId: currentItem.id,
        finalEstimate,
        estimationType,
        moderatorConsensus,
        calculatedConsensus: consensus,
        average: average.toFixed(1)
      });      // Update the backlog item with the final estimate
      await updateBacklogItem(currentItem.id, {
        story_points: String(finalEstimate),
        estimation_type: estimationType,
        status: 'Estimated' // Mark as estimated
      });
      
      console.log('✅ Backlog item updated successfully');
        // Update local session items to reflect the change
      setSessionItems(prevItems => 
        prevItems.map(item => 
          item.id === currentItem.id 
            ? { 
                ...item, 
                storyPoints: String(finalEstimate),
                estimationType: estimationType,
                status: 'Estimated' as const
              }
            : item
        )
      );
      
      // Show success notification
      setVoteNotification(`✅ Estimate ${finalEstimate}${estimationType === 'fibonacci' ? ' SP' : ''} saved for "${currentItem.title}"`);
      setTimeout(() => setVoteNotification(null), 4000);
      
      // Move to next item
      nextItem();
    } catch (error) {
      console.error('Error accepting estimate:', error);
      setVoteNotification('Error saving estimate. Please try again.');
      setTimeout(() => setVoteNotification(null), 3000);
    }
  };

  const handleSkip = () => {
    nextItem();
  };

  // Handle estimation type change with real-time sync
  const handleEstimationTypeChange = (newType: 'fibonacci' | 'tshirt') => {
    const hadVotes = votes.length > 0;
    
    setEstimationType(newType);
    
    // Reset voting state when changing estimation type
    setMyVote(null);
    setVotes([]);
    setIsRevealed(false);
    
    // Show confirmation message if there were existing votes
    if (hadVotes) {
      setVoteNotification(`Estimation type changed to ${newType === 'fibonacci' ? 'Fibonacci' : 'T-Shirt Sizes'}. All votes have been reset.`);
      setTimeout(() => setVoteNotification(null), 4000);
    }
    
    // Broadcast estimation type change to all participants
    if (currentUser.role === 'Moderator' && channel) {
      channel.send({
        type: 'broadcast',
        event: 'estimation-type-changed',
        payload: {
          newEstimationType: newType,
          changedBy: user?.id,
          hadVotes: hadVotes
        }
      });
    }
  };  // Timer UI Component
  const TimerDisplay = () => {
    // Always show timer display if there's a current item
    if (!currentItem) return null;

    const totalTime = votingTimeLimit; // Use configured timer limit
    const progress = timeRemaining !== null ? ((totalTime - timeRemaining) / totalTime) * 100 : 0;
    const isWarning = timeRemaining !== null && timeRemaining <= 60;
    const isCritical = timeRemaining !== null && timeRemaining <= 30;
    const isUrgent = timeRemaining !== null && timeRemaining <= 10;

    return (
      <div className={`rounded-xl p-4 shadow-lg border mb-6 transition-all duration-300 ${
        isUrgent 
          ? 'bg-gradient-to-r from-red-50 to-red-100 border-red-300 animate-pulse' 
          : isCritical 
          ? 'bg-gradient-to-r from-orange-50 to-orange-100 border-orange-300' 
          : isWarning 
          ? 'bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-300' 
          : 'bg-white border-gray-200'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock className={`w-5 h-5 transition-all duration-300 ${
              timerActive 
                ? isUrgent 
                  ? 'text-red-600 animate-bounce' 
                  : isCritical 
                  ? 'text-orange-600 animate-pulse' 
                  : isWarning 
                  ? 'text-yellow-600 animate-pulse' 
                  : 'text-blue-600 animate-pulse'
                : 'text-blue-600'
            }`} />
            <div>
              <span className={`font-medium transition-colors duration-300 ${
                isUrgent ? 'text-red-900' : isCritical ? 'text-orange-900' : isWarning ? 'text-yellow-900' : 'text-gray-900'
              }`}>
                Voting Timer
              </span>
              {timerActive && (
                <div className={`text-xs font-medium transition-colors duration-300 ${
                  isUrgent 
                    ? 'text-red-700 animate-pulse' 
                    : isCritical 
                    ? 'text-orange-700' 
                    : isWarning 
                    ? 'text-yellow-700' 
                    : 'text-blue-600'
                }`}>
                  {isUrgent ? '🚨 URGENT - Vote Now!' : isCritical ? '⚠️ Critical - Vote Now!' : isWarning ? '⏰ Time Running Out!' : '⏰ Timer Active - Vote Now!'}
                </div>
              )}              {!timerActive && timeRemaining !== null && timeRemaining > 0 && (
                <div className="text-xs text-yellow-600 font-medium">
                  {currentUser.role === 'Moderator' 
                    ? '⏸️ Timer Paused' 
                    : '⏸️ Timer Paused - Waiting for moderator'
                  }
                </div>
              )}{!timerActive && timeRemaining === null && currentUser.role === 'Team Member' && (
                <div className="text-xs text-gray-500">
                  Waiting for moderator to start timer
                </div>
              )}
              {!timerActive && timeRemaining === null && currentUser.role === 'Moderator' && (
                <div className="text-xs text-blue-600">
                  Configured: {formatTime(votingTimeLimit)} ⚙️
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {timeRemaining !== null && (
              <div className={`text-lg font-mono font-bold transition-all duration-300 ${
                isUrgent 
                  ? 'text-red-600 text-xl animate-pulse' 
                  : isCritical 
                  ? 'text-orange-600 text-lg' 
                  : isWarning 
                  ? 'text-yellow-600' 
                  : timeRemaining < 60 
                  ? 'text-red-600' 
                  : 'text-gray-900'
              }`}>
                {formatTime(timeRemaining)}
              </div>
            )}
              {currentUser.role === 'Moderator' && (
              <div className="flex gap-2">                {!timerActive && (
                  <button
                    onClick={() => {
                      setTempTimeLimit(votingTimeLimit); // Initialize with current value
                      setShowTimerConfig(true);
                    }}
                    className="bg-purple-600 text-white px-2 py-1 rounded text-xs hover:bg-purple-700 transition-colors flex items-center gap-1"
                    title="Configure Timer"
                  >
                    ⚙️
                  </button>
                )}
                
                {!timerActive && timeRemaining === null && (
                  <button
                    onClick={startTimer}
                    className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 transition-colors flex items-center gap-1"
                  >
                    <Clock className="w-3 h-3" />
                    Start Timer
                  </button>
                )}
                
                {!timerActive && timeRemaining !== null && timeRemaining > 0 && (
                  <button
                    onClick={resumeTimer}
                    className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors flex items-center gap-1"
                  >
                    ▶️ Resume
                  </button>
                )}
                
                {timerActive && (
                  <button
                    onClick={pauseTimer}
                    className="bg-yellow-600 text-white px-3 py-1 rounded text-sm hover:bg-yellow-700 transition-colors flex items-center gap-1"
                  >
                    ⏸️ Pause
                  </button>
                )}
                
                {timeRemaining !== null && (
                  <button
                    onClick={resetTimer}
                    className="bg-gray-600 text-white px-3 py-1 rounded text-sm hover:bg-gray-700 transition-colors flex items-center gap-1"
                  >
                    🔄 Reset
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
        
        {timeRemaining !== null && (
          <div className="mt-3">
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div 
                className={`h-3 rounded-full transition-all duration-1000 ${
                  isUrgent 
                    ? 'bg-gradient-to-r from-red-500 to-red-600 animate-pulse' 
                    : isCritical 
                    ? 'bg-gradient-to-r from-orange-500 to-orange-600' 
                    : isWarning 
                    ? 'bg-gradient-to-r from-yellow-500 to-yellow-600' 
                    : 'bg-gradient-to-r from-blue-500 to-blue-600'
                }`}
                style={{ width: `${progress}%` }}
              ></div>
            </div>            <div className="flex justify-between items-center mt-2">
              <span className={`text-xs ${
                isUrgent ? 'text-red-600' : isCritical ? 'text-orange-600' : isWarning ? 'text-yellow-600' : 'text-gray-500'
              }`}>
                {Math.round(progress)}% elapsed
              </span>
              <span className="text-xs text-gray-500">
                {formatTime(totalTime)} total
              </span>
            </div>
          </div>
        )}
      </div>
    );
  };
  // Navigation Component
  const NavigationControls = () => {
    if (currentUser.role !== 'Moderator') return null;

    const estimatedCount = sessionItems.filter(item => item.status === 'Estimated').length;

    return (
      <div className="bg-white rounded-xl p-4 shadow-lg border border-gray-200 mb-6">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Session Navigation</h3>
          <div className="text-sm text-gray-600">
            Item {currentItemIndex + 1} of {sessionItems.length} • {estimatedCount} Estimated
          </div>
        </div>
        
        {/* Item Progress Indicators */}
        <div className="flex gap-2 mt-4 mb-4 overflow-x-auto">
          {sessionItems.map((item, index) => (
            <button
              key={item.id}
              onClick={() => {
                if (index !== currentItemIndex) {
                  setCurrentItemIndex(index);
                  resetForNewItem();
                  
                  // Broadcast item change to all participants
                  if (channel) {
                    channel.send({
                      type: 'broadcast',
                      event: 'item-changed',
                      payload: {
                        newItemIndex: index,
                        changedBy: user?.id,
                        newItemTitle: item.title || 'Unknown Item'
                      }
                    });
                  }
                }
              }}
              className={`
                relative min-w-[40px] h-10 rounded-lg border-2 transition-all duration-200 flex items-center justify-center                ${index === currentItemIndex
                  ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                  : item.status === 'Estimated'
                  ? 'border-green-300 bg-green-50 text-green-700 hover:border-green-400'
                  : 'border-gray-300 bg-gray-50 text-gray-600 hover:border-gray-400 hover:bg-gray-100'
                }
              `}
              title={`${item.title}${item.status === 'Estimated' ? ' - Estimated' : ' - Not estimated'}`}
            >
              <span className="text-sm font-medium">{index + 1}</span>
              {item.status === 'Estimated' && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-2 h-2 text-white" />
                </div>
              )}
              {index === currentItemIndex && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full"></div>
              )}
            </button>
          ))}
        </div>
        
        {/* Navigation Buttons */}
        <div className="flex gap-3">
          <button
            onClick={previousItem}
            disabled={currentItemIndex === 0}
            className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Previous Item
          </button>
          
          <button
            onClick={nextItem}
            disabled={currentItemIndex >= sessionItems.length - 1}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            Next Item
            <ArrowLeft className="w-4 h-4 rotate-180" />
          </button>
        </div>
      </div>
    );
  };

  // Show loading screen while session items are being fetched
  if (sessionItemsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Loading Session...</h2>
          <p className="text-gray-600">Please wait while we prepare your planning session</p>
        </div>
      </div>
    );
  }

  // Show empty session screen if no items are assigned to this session
  if (!sessionItemsLoading && sessionItems.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No Items in Session</h2>
          <p className="text-gray-600 mb-6">This session doesn't have any backlog items assigned yet</p>
          <button
            onClick={onBackToBacklog}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors duration-200"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Show session complete screen only if items have loaded and current item is null
  if (!sessionItemsLoading && sessionItems.length > 0 && !currentItem) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 flex items-center justify-center p-4">
        <div className="text-center">
          <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Session Complete!</h2>
          <p className="text-gray-600 mb-6">All pending items have been estimated</p>
          <button
            onClick={onBackToBacklog}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors duration-200"
          >
            Back to Backlog
          </button>
        </div>
      </div>
    );
  }
  const voteValues = votes.map(v => {
    // Convert string numbers to numbers for Fibonacci, keep strings for T-shirt
    if (estimationType === 'fibonacci' && typeof v.points === 'string') {
      const numValue = parseFloat(v.points);
      return isNaN(numValue) ? 0 : numValue;
    }
    return v.points;
  });
  const { consensus, average, hasConsensus } = calculateConsensus(voteValues, estimationType);

  // Timer configuration functions
  const handleTimerConfigSave = () => {
    setVotingTimeLimit(tempTimeLimit);
    setShowTimerConfig(false);
    
    // Broadcast timer configuration change to all participants
    if (channel && currentUser.role === 'Moderator') {
      channel.send({
        type: 'broadcast',
        event: 'timer-config-changed',
        payload: {
          newTimeLimit: tempTimeLimit,
          changedBy: user?.id,
          changedByName: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Moderator'
        }
      });
    }
    
    setVoteNotification(`Timer configured to ${Math.floor(tempTimeLimit / 60)}:${(tempTimeLimit % 60).toString().padStart(2, '0')}`);
    setTimeout(() => setVoteNotification(null), 3000);
  };

  const handleTimerConfigCancel = () => {
    setTempTimeLimit(votingTimeLimit);
    setShowTimerConfig(false);  };

  // Consensus editing functions
  const handleStartConsensusEdit = () => {
    if (currentUser.role !== 'Moderator') return;
    
    const currentValue = moderatorConsensus || consensus || (estimationType === 'fibonacci' ? average.toFixed(1) : 'M');
    setEditedConsensusValue(String(currentValue));
    setIsEditingConsensus(true);
  };

  const handleCancelConsensusEdit = () => {
    setIsEditingConsensus(false);
    setEditedConsensusValue('');
  };
  const handleSaveConsensus = async () => {
    if (!currentItem || !user || !editedConsensusValue.trim() || consensusLoading) return;
    
    setConsensusLoading(true);
    
    try {
      // Update local moderator consensus
      setModeratorConsensus(editedConsensusValue.trim());
      
      // For estimated items, update the database and session items
      if (currentItem.status === 'Estimated') {
        const updatedPoints = estimationType === 'fibonacci' 
          ? parseFloat(editedConsensusValue.trim()) 
          : editedConsensusValue.trim();
        
        // Update the database
        await updateBacklogItem(currentItem.id, {
          story_points: String(updatedPoints),
          status: 'Estimated'
        });
        
        // Update the session items array
        setSessionItems(prevItems => 
          prevItems.map(item => 
            item.id === currentItem.id 
              ? { ...item, storyPoints: updatedPoints }
              : item
          )
        );
        
        console.log('✅ Updated estimated item in database:', {
          itemId: currentItem.id,
          newStoryPoints: updatedPoints
        });
      }
      
      // Broadcast consensus change to all participants
      if (channel && channelSubscribed) {
        const moderatorDisplayName = getUserDisplayName(user);
        
        const broadcastPayload = {
          type: 'broadcast',
          event: 'consensus-changed',
          payload: {
            itemId: currentItem.id,
            newConsensusValue: editedConsensusValue.trim(),
            changedBy: user.id,
            changedByName: moderatorDisplayName,
            timestamp: new Date().toISOString(),
            isEstimatedItem: currentItem.status === 'Estimated'
          }
        };
        
        console.log('📡 Broadcasting consensus change:', broadcastPayload);
        await channel.send(broadcastPayload);
        console.log('✅ Consensus change broadcast sent successfully');
        
        // Show local notification
        const message = currentItem.status === 'Estimated' 
          ? `Final estimate updated to ${editedConsensusValue.trim()}`
          : `Consensus updated to ${editedConsensusValue.trim()}`;
        setVoteNotification(message);
        setTimeout(() => setVoteNotification(null), 3000);
        
      } else {
        console.error('❌ Cannot broadcast consensus change - channel not ready');
        setVoteNotification('Error: Unable to broadcast consensus change');
        setTimeout(() => setVoteNotification(null), 3000);
      }
      
      // Exit edit mode
      setIsEditingConsensus(false);
      setEditedConsensusValue('');
      
    } catch (error: any) {
      console.error('Error saving consensus:', error);
      setVoteNotification('Error saving consensus. Please try again.');
      setTimeout(() => setVoteNotification(null), 3000);
    } finally {
      setConsensusLoading(false);
    }
  };

  // Predefined timer options
  const timerPresets = [
    { label: '1 minute', value: 60 },
    { label: '2 minutes', value: 120 },
    { label: '3 minutes', value: 180 },
    { label: '5 minutes', value: 300 },
    { label: '10 minutes', value: 600 },
    { label: '15 minutes', value: 900 },
    { label: '30 minutes', value: 1800 }
  ];
  // Timer Configuration Modal Component
  const TimerConfigModal = () => {
    if (!showTimerConfig || currentUser.role !== 'Moderator') return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Configure Voting Timer</h3>
            <button
              onClick={handleTimerConfigCancel}
              className="text-gray-400 hover:text-gray-600 text-xl"
            >
              ×
            </button>
          </div>
          
          <div className="space-y-4">
            {/* Quick Presets */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quick Presets
              </label>
              <div className="grid grid-cols-2 gap-2">
                {timerPresets.map((preset) => (
                  <button
                    key={preset.value}
                    onClick={() => setTempTimeLimit(preset.value)}
                    className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                      tempTimeLimit === preset.value
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Custom Timer Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Custom Timer (minutes:seconds)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={Math.floor(tempTimeLimit / 60)}
                  onChange={(e) => {
                    const minutes = parseInt(e.target.value) || 0;
                    const seconds = tempTimeLimit % 60;
                    setTempTimeLimit(minutes * 60 + seconds);
                  }}
                  className="w-16 px-2 py-1 border border-gray-300 rounded text-center"
                  placeholder="5"
                />
                <span className="text-gray-500">:</span>
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={tempTimeLimit % 60}
                  onChange={(e) => {
                    const seconds = parseInt(e.target.value) || 0;
                    const minutes = Math.floor(tempTimeLimit / 60);
                    setTempTimeLimit(minutes * 60 + seconds);
                  }}
                  className="w-16 px-2 py-1 border border-gray-300 rounded text-center"
                  placeholder="00"
                />
                <span className="text-sm text-gray-500 ml-2">
                  Total: {formatTime(tempTimeLimit)}
                </span>
              </div>
            </div>
            
            {/* Current Selection Display */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="text-sm text-blue-800 font-medium">
                Selected Timer Duration: {formatTime(tempTimeLimit)}
              </div>
              <div className="text-xs text-blue-600 mt-1">
                This will be the default timer for new voting rounds
              </div>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-3 mt-6">
            <button
              onClick={handleTimerConfigCancel}
              className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleTimerConfigSave}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Save Configuration
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={onBackToBacklog}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors duration-200"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Backlog
            </button>
            <div className="flex items-center gap-4">
              <UserIcon />
              {currentUser.role === 'Moderator' && (
                <div className="flex items-center gap-2">
                  <Settings className="w-4 h-4 text-gray-500" />
                  <label className="text-sm text-gray-600 font-medium">Estimation Type:</label>
                  <select
                    value={estimationType}
                    onChange={(e) => handleEstimationTypeChange(e.target.value as 'fibonacci' | 'tshirt')}
                    className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={isRevealed}
                  >
                    <option value="fibonacci">Fibonacci</option>
                    <option value="tshirt">T-Shirt Sizes</option>
                  </select>
                  {isRevealed && (
                    <span className="text-xs text-gray-400">(disabled - votes revealed)</span>
                  )}
                </div>
              )}
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <button
                  onClick={() => setIsVideoCallActive(true)}
                  className="flex items-center gap-2 px-3 py-1 rounded-lg transition-colors bg-green-100 text-green-700 hover:bg-green-200"
                  title="Start Video Call"
                >
                  <Video className="w-4 h-4" />
                  Video Call
                </button>
                <button
                  onClick={() => {
                    const newVisibility = !isChatVisible;
                    setIsChatVisible(newVisibility);
                    if (newVisibility) {
                      setChatUnreadCount(0); // Reset unread count when opening chat
                    }
                  }}
                  className={`flex items-center gap-2 px-3 py-1 rounded-lg transition-colors relative ${
                    isChatVisible 
                      ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  title={isChatVisible ? 'Hide Chat' : 'Show Chat'}
                >
                  <MessageCircle className="w-4 h-4" />
                  Chat
                  {!isChatVisible && chatUnreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {chatUnreadCount > 9 ? '9+' : chatUnreadCount}
                    </span>
                  )}
                </button>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  {votes.length} votes
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Item {currentItemIndex + 1} of {allSessionItems.length}
                </div>
              </div>
            </div>
          </div>
          
          {/* Participants List */}
          <div className="border-t border-gray-200 pt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-gray-900 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Session Participants ({participants.length})
              </h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {participants.map((participant) => (
                <div
                  key={participant.id}
                  className="flex items-center gap-2 bg-gray-50 hover:bg-gray-100 transition-colors duration-200 px-3 py-2 rounded-lg border border-gray-200"
                >
                  <div className="relative">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-xs font-medium text-blue-800">
                        {participant.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
                      participant.isOnline ? 'bg-green-400' : 'bg-gray-400'
                    }`}></div>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-900 leading-tight">
                      {participant.name}
                      {participant.id === user?.id && (
                        <span className="text-xs text-blue-600 ml-1">(You)</span>
                      )}
                    </span>
                    <span className="text-xs text-gray-500 leading-tight">
                      {participant.role}
                    </span>
                  </div>
                </div>
              ))}
              {participants.length === 0 && (
                <div className="text-sm text-gray-500 italic">
                  Connecting to session...
                </div>
              )}
            </div>
          </div>
          
          {/* Item Change Notification for Team Members */}
          {currentUser.role === 'Team Member' && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-blue-800">
                    <Clock className="w-5 h-5" />
                    <span className="font-medium">Current Item: {currentItemIndex + 1} of {allSessionItems.length}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-sm text-blue-600">
                    Estimation Type:
                  </div>
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                    estimationType === 'fibonacci' 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'bg-purple-100 text-purple-800'
                  }`}>
                    {estimationType === 'fibonacci' ? 'Fibonacci' : 'T-Shirt Sizes'}
                  </div>
                </div>
              </div>
              <div className="text-sm text-blue-600 mt-2">
                The moderator controls which item you're voting on and the estimation method
              </div>
            </div>
          )}
          
          <div className="bg-gray-50 rounded-xl p-6">
            <div className="flex items-start justify-between mb-3">
              <h1 className="text-2xl font-bold text-gray-900">{currentItem.title}</h1>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                currentItem.priority === 'Critical' ? 'bg-red-100 text-red-800' :
                currentItem.priority === 'High' ? 'bg-orange-100 text-orange-800' :
                currentItem.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                'bg-green-100 text-green-800'
              }`}>
                {currentItem.priority} Priority
              </span>
            </div>
            <p className="text-gray-700 mb-4">{currentItem.description}</p>
            
            {currentItem.acceptanceCriteria && currentItem.acceptanceCriteria.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Acceptance Criteria:</h3>
                <ul className="space-y-2">
                  {currentItem.acceptanceCriteria.map((criteria, index) => (
                    <li key={index} className="flex items-start gap-2 text-gray-700">
                      <span className="text-blue-500 mt-1 font-bold">•</span>
                      {criteria}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Timer Display */}
        <TimerDisplay />
          {/* Enhanced Timer Notification Banners for Team Members */}
        {timerActive && currentUser.role === 'Team Member' && timeRemaining !== null && (
          <div className={`text-white rounded-xl p-4 mb-6 shadow-lg transition-all duration-300 ${
            timeRemaining <= 10 
              ? 'bg-gradient-to-r from-red-600 to-red-700 animate-bounce border-2 border-red-400' 
              : timeRemaining <= 30 
              ? 'bg-gradient-to-r from-orange-500 to-red-500 animate-pulse border-2 border-orange-400' 
              : timeRemaining <= 60 
              ? 'bg-gradient-to-r from-yellow-500 to-orange-500 animate-pulse border-2 border-yellow-400' 
              : 'bg-gradient-to-r from-blue-500 to-purple-500 animate-pulse'
          }`}>
            <div className="flex items-center justify-center gap-3">
              <Clock className={`w-6 h-6 ${
                timeRemaining <= 10 ? 'animate-bounce' : 'animate-spin'
              }`} />
              <div className="text-center">
                <div className={`font-bold ${timeRemaining <= 10 ? 'text-xl' : 'text-lg'}`}>
                  {timeRemaining <= 10 
                    ? '🚨 URGENT - Vote NOW!' 
                    : timeRemaining <= 30 
                    ? '⚠️ Critical - Vote Now!' 
                    : timeRemaining <= 60 
                    ? '⏰ Time Running Out!' 
                    : '⏱️ Voting Timer Active!'
                  }
                </div>
                <div className={`opacity-90 ${timeRemaining <= 10 ? 'text-base animate-pulse font-medium' : 'text-sm'}`}>
                  {timeRemaining <= 10 
                    ? `Only ${formatTime(timeRemaining)} left!` 
                    : `Cast your vote now - ${formatTime(timeRemaining)} remaining`
                  }
                </div>
                {timeRemaining <= 10 && (
                  <div className="text-xs mt-1 animate-pulse font-bold">
                    Votes will be auto-revealed when timer ends!
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* Timer Paused Banner for Team Members */}
        {!timerActive && timeRemaining !== null && timeRemaining > 0 && currentUser.role === 'Team Member' && (
          <div className="bg-gradient-to-r from-yellow-500 to-orange-400 text-white rounded-xl p-4 mb-6 shadow-lg">
            <div className="flex items-center justify-center gap-3">
              <Clock className="w-6 h-6" />
              <div className="text-center">
                <div className="font-bold text-lg">⏸️ Timer Paused</div>
                <div className="text-sm opacity-90">
                  Waiting for moderator to resume - {timeRemaining && formatTime(timeRemaining)} remaining
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Vote Notification */}
        {voteNotification && (
          <div className="fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              {voteNotification}
            </div>
          </div>        )}          {/* Navigation Controls */}
        {/* Commented out redundant Current Item section - story info is now in voting section
        {currentItem && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Current Item</h2>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600">
                  Item {currentItemIndex + 1} of {sessionItems.length}
                </span>                {currentItem.status === 'Estimated' && (
                  <div className="flex items-center gap-2 bg-green-100 text-green-800 px-3 py-1 rounded-lg">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">Estimated</span>
                    {currentItem.storyPoints && (
                      <span className="text-sm">({currentItem.storyPoints}{currentItem.estimationType === 'fibonacci' ? ' SP' : ''})</span>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            <div className="space-y-3">
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">{currentItem.title}</h3>
                {currentItem.description && (
                  <p className="text-gray-600 text-sm">{currentItem.description}</p>
                )}
              </div>
                {currentItem.acceptanceCriteria && currentItem.acceptanceCriteria.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-800 mb-2 text-sm">Acceptance Criteria:</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {currentItem.acceptanceCriteria.map((criteria: string, index: number) => (
                      <li key={index} className="text-xs text-gray-600">{criteria}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              <div className="flex items-center gap-4 text-sm">
                <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded">
                  Priority: {currentItem.priority || 'Medium'}
                </span>
                <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded">
                  Type: {estimationType === 'fibonacci' ? 'Story Points' : 'T-Shirt Sizes'}
                </span>
              </div>
            </div>          </div>        {/* Navigation Controls */}
        <NavigationControls />

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Voting Cards */}
          <div>
            {/* Story Information */}
            {currentItem && (
              <div className="mb-6 bg-white rounded-xl p-4 shadow-lg border border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900">{currentItem.title}</h3>
                  {currentItem.status === 'Estimated' && (
                    <div className="flex items-center gap-2 bg-green-100 text-green-800 px-3 py-1 rounded-lg">
                      <CheckCircle className="w-4 h-4" />
                      <span className="text-sm font-medium">Estimated</span>
                      {currentItem.storyPoints && (
                        <span className="text-sm">({currentItem.storyPoints}{currentItem.estimationType === 'fibonacci' ? ' SP' : ''})</span>
                      )}
                    </div>
                  )}
                </div>
                
                {currentItem.description && (
                  <p className="text-gray-600 text-sm mb-3">{currentItem.description}</p>
                )}
                
                {currentItem.acceptanceCriteria && currentItem.acceptanceCriteria.length > 0 && (
                  <div className="mb-3">
                    <h4 className="font-medium text-gray-800 mb-2 text-sm">Acceptance Criteria:</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {currentItem.acceptanceCriteria.map((criteria: string, index: number) => (
                        <li key={index} className="text-xs text-gray-600">{criteria}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                <div className="flex items-center gap-3 text-xs">
                  <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded">
                    Priority: {currentItem.priority || 'Medium'}
                  </span>
                  <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded">
                    Type: {estimationType === 'fibonacci' ? 'Story Points' : 'T-Shirt Sizes'}
                  </span>
                </div>
              </div>
            )}
            
            <VotingCards
              onVote={handleVote}
              selectedVote={myVote}
              disabled={loading}
              estimationType={estimationType}
            />
            {/* User's Vote Display */}
            {myVote && (
              <div className="mt-4 bg-white rounded-xl p-4 shadow-lg border border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900">Your Vote:</span>
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-lg font-bold ${
                      estimationType === 'fibonacci' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                    }`}>
                      {myVote}
                    </span>
                    {!isRevealed && !loading && (
                      <span className="text-sm text-gray-500">(You can change this)</span>
                    )}                    {isRevealed && !loading && (
                      <button
                        onClick={() => {
                          setMyVote(null);
                          setVoteNotification('You can now select a new vote from the cards above');
                          setTimeout(() => setVoteNotification(null), 3000);
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
                        title="Edit your vote"
                      >
                        ✏️ Edit Vote
                      </button>
                    )}
                    {loading && (
                      <div className="flex items-center gap-2 text-sm text-blue-600">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                        Saving...
                      </div>
                    )}
                  </div>
                </div>
                {isRevealed && (
                  <div className="mt-2 text-xs text-gray-500">
                    💡 You can edit your vote even after reveal - changes will be shown to all participants
                  </div>
                )}
              </div>
            )}            {/* Vote submission instructions */}
            {!myVote && (
              <div className={`mt-4 rounded-xl p-4 ${
                isRevealed 
                  ? 'bg-green-50 border border-green-200' 
                  : 'bg-blue-50 border border-blue-200'
              }`}>
                <div className={`flex items-center gap-2 ${
                  isRevealed ? 'text-green-800' : 'text-blue-800'
                }`}>
                  <div className={`w-2 h-2 rounded-full animate-pulse ${
                    isRevealed ? 'bg-green-600' : 'bg-blue-600'
                  }`}></div>
                  <span className="font-medium text-sm">
                    {isRevealed 
                      ? "✏️ Select your new estimate above to update your vote" 
                      : "Select your estimate above to participate in voting"
                    }
                  </span>
                </div>
                {isRevealed && (
                  <div className="mt-2 text-xs text-green-700">
                    🎯 Your new vote will be saved and all participants will see the updated results
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Votes Display */}
          <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Team Votes</h3>
              <div className="flex items-center gap-3">
                {currentItem?.status === 'Estimated' && isRevealed && (
                  <span className="text-sm text-green-600 font-medium flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" />
                    Auto-revealed (Item Estimated)
                  </span>
                )}
                {currentUser.role === 'Moderator' && votes.length > 0 && !isRevealed && (
                  <button
                    onClick={revealVotes}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    Reveal Votes
                  </button>
                )}
              </div>
            </div><div className="space-y-3">
              {(() => {
                console.log('🔍 VOTE RENDERING DEBUG:', {
                  votesLoading,
                  votesLength: votes.length,
                  votes: votes.map(v => ({ userId: v.userId, userName: v.userName, points: v.points })),
                  shouldShowVotes: !votesLoading && votes.length > 0,
                  shouldShowWaiting: !votesLoading && votes.length === 0
                });
                return null;
              })()}
              
              {votesLoading && (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  <span className="ml-2 text-gray-600">Updating votes...</span>
                </div>
              )}
                {!votesLoading && votes.length > 0 && votes.map((vote) => {
                console.log('🔍 RENDERING VOTE:', vote);
                return (
                <div key={vote.userId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg transition-all duration-300 hover:bg-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-blue-800">
                        {vote.userName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-900">{vote.userName}</span>
                      <span className="text-sm text-gray-500 ml-2">                        ({vote.userName === 'nicholas.d.lowrie' ? 'Moderator' : 'Team Member'})
                      </span>
                      {vote.userName === currentUser?.name && (
                        <span className="text-xs text-blue-600 ml-2 font-medium">You</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {vote.timestamp && (
                      <span className="text-xs text-gray-400">
                        {new Date(vote.timestamp).toLocaleTimeString()}
                      </span>
                    )}
                    <div className={`
                      px-3 py-1 rounded-lg font-bold transition-all duration-300
                      ${isRevealed 
                        ? estimationType === 'fibonacci' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-purple-100 text-purple-800'
                        : 'bg-gray-300 text-gray-300'
                      }
                    `}>
                      {isRevealed ? vote.points : '?'}
                    </div>
                  </div>
                </div>
                );
              })}
            </div>

            {!votesLoading && votes.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Waiting for team votes...</p>
                <p className="text-sm mt-1">Team members need to select their estimates</p>
              </div>
            )}

            {isRevealed && votes.length > 0 && (
              <div className={`mt-6 p-4 rounded-xl border ${
                estimationType === 'fibonacci' 
                  ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200'
                  : 'bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200'
              }`}>                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <span className="text-sm text-gray-600">
                      {currentItem?.status === 'Estimated' ? 'Final Estimate (Saved)' : 'Estimation Result'}
                    </span>
                    {currentItem?.status === 'Estimated' && (
                      <div className="flex items-center gap-1 bg-green-100 text-green-800 px-2 py-1 rounded-full">
                        <CheckCircle className="w-3 h-3" />
                        <span className="text-xs font-medium">Saved</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Consensus Display/Edit */}
                  {isEditingConsensus && currentUser.role === 'Moderator' ? (
                    <div className="mb-4">
                      <input
                        type="text"
                        value={editedConsensusValue}
                        onChange={(e) => setEditedConsensusValue(e.target.value)}
                        className="text-3xl font-bold text-gray-900 text-center bg-white border-2 border-blue-500 rounded-lg px-4 py-2 w-32 mx-auto block"
                        placeholder="8"
                        autoFocus
                        disabled={consensusLoading}
                      />
                      <div className="text-sm text-gray-600 mt-2">
                        {estimationType === 'fibonacci' ? 'Enter story points' : 'Enter T-shirt size'}
                      </div>
                      <div className="flex gap-2 justify-center mt-3">
                        <button
                          onClick={handleSaveConsensus}
                          disabled={consensusLoading || !editedConsensusValue.trim()}
                          className="bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                        >
                          {consensusLoading ? (
                            <>
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                              Saving...
                            </>
                          ) : (
                            <>
                              ✓ Save
                            </>
                          )}
                        </button>
                        <button
                          onClick={handleCancelConsensusEdit}
                          disabled={consensusLoading}
                          className="bg-gray-500 text-white px-3 py-1 rounded-lg hover:bg-gray-600 transition-colors text-sm font-medium disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mb-2">
                      <div className="text-3xl font-bold text-gray-900 mb-2 flex items-center justify-center gap-2">
                        <span>
                          {moderatorConsensus || consensus || (estimationType === 'fibonacci' ? average.toFixed(1) : 'M')}
                          {estimationType === 'fibonacci' ? ' SP' : ''}
                        </span>
                        {currentUser.role === 'Moderator' && (
                          <button
                            onClick={handleStartConsensusEdit}
                            className="ml-2 text-blue-600 hover:text-blue-700 transition-colors"
                            title="Edit consensus value"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  )}                  <div className="text-sm text-gray-600 mb-4">
                    {hasConsensus ? (
                      <span className="text-green-600 font-medium">✓ Team Consensus</span>
                    ) : (
                      <span className="text-orange-600 font-medium">
                        {estimationType === 'fibonacci' 
                          ? `Average: ${average.toFixed(1)} - Discussion needed`
                          : 'Mixed estimates - Discussion needed'
                        }
                      </span>
                    )}
                    {currentUser.role === 'Moderator' && !isEditingConsensus && (
                      <div className="text-xs text-gray-500 mt-1">
                        💡 Click the edit icon to override the consensus value
                      </div>
                    )}
                  </div>
                  
                  {currentUser.role === 'Moderator' && (
                    <div className="flex gap-3 justify-center">
                      <button
                        onClick={handleAcceptEstimate}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors duration-200 flex items-center gap-2"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Accept Estimate
                      </button>
                      <button
                        onClick={handleSkip}
                        className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors duration-200 flex items-center gap-2"
                      >
                        <SkipForward className="w-4 h-4" />
                        Skip for Now
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {!isRevealed && votes.length > 0 && (
              <div className="mt-4 text-center text-gray-500">
                <EyeOff className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Votes hidden until revealed</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chat Component */}
      <ErrorBoundary fallback={
        <div className="fixed right-0 top-0 h-full w-80 bg-red-50 border-l border-red-200 p-4 flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-600 font-medium">Chat temporarily unavailable</p>
            <p className="text-red-500 text-sm mt-1">Please refresh to restore chat functionality</p>
          </div>
        </div>
      }>
        <Chat 
          sessionId={sessionId}
          currentUser={currentUser}
          channel={channel}
          currentItemId={currentItem?.id}
          isVisible={isChatVisible}
          onClose={() => setIsChatVisible(false)}
          onUnreadCountChange={(count) => setChatUnreadCount(count)}
        />
      </ErrorBoundary>      {/* Video Conference Modal */}
      {isVideoCallActive && (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg w-full h-full max-w-7xl max-h-screen m-4 overflow-hidden">
            <VideoConference
              sessionId={sessionId}
              onClose={() => setIsVideoCallActive(false)}
            />
          </div>
        </div>
      )}

      {/* Timer Configuration Modal */}
      <TimerConfigModal />
    </div>
  );
}