import { useState, useEffect } from 'react';
import { BacklogItem, User, Vote } from '../types';
import { Eye, EyeOff, SkipForward, CheckCircle, ArrowLeft, Users, Clock, Settings, MessageCircle, FileText, Video } from 'lucide-react';
import VotingCards from './VotingCards';
import UserIcon from './UserIcon';
import Chat from './ChatPanel';
import VideoConference from './VideoConference';
import ErrorBoundary from './ErrorBoundary';
import { calculateConsensus } from '../utils/planningPoker';
import { submitEstimation, getEstimationsForItem, getUserVote, getSessionItems, getAllBacklogItems } from '../utils/planningSession';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';
import { getUserInitials, getUserDisplayName } from '../utils/userUtils';

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
  const [lastNotifiedTime, setLastNotifiedTime] = useState<number | null>(null);
  const [votesLoading, setVotesLoading] = useState(false);
  const [voteNotification, setVoteNotification] = useState<string | null>(null);
  const [participants, setParticipants] = useState<Array<{
    id: string;
    name: string;
    role: string;
    isOnline: boolean;
    lastSeen: Date;
  }>>([]);
  const [isChatVisible, setIsChatVisible] = useState(true);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const [isVideoCallActive, setIsVideoCallActive] = useState(false);

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
        })
        .on('broadcast', { event: 'vote-submitted' }, (payload) => {
          const { itemId, voterId, voterName } = payload.payload;
          // Only refresh votes if it's for the current item and not our own vote
          if (itemId === currentItem?.id && voterId !== user?.id) {
            loadVotesForCurrentItem();
            // Show notification
            setVoteNotification(`${voterName} submitted a vote`);
            setTimeout(() => setVoteNotification(null), 3000);
          }
        })
        .on('broadcast', { event: 'vote-changed' }, (payload) => {
          const { itemId, voterId, voterName } = payload.payload;
          // Only refresh votes if it's for the current item and not our own vote
          if (itemId === currentItem?.id && voterId !== user?.id) {
            loadVotesForCurrentItem();
            // Show notification
            setVoteNotification(`${voterName} changed their vote`);
            setTimeout(() => setVoteNotification(null), 3000);
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
        })
        .on('broadcast', { event: 'votes-revealed' }, (payload) => {
          const { itemId, revealedBy } = payload.payload;
          // Only update if it's for the current item and not revealed by this user
          if (itemId === currentItem?.id && revealedBy !== user?.id) {
            setIsRevealed(true);
            setTimerActive(false);
            if (currentUser.role === 'Team Member') {
              setVoteNotification('Votes have been revealed!');
              setTimeout(() => setVoteNotification(null), 3000);
            }
          }
        })        .on('broadcast', { event: 'estimation-type-changed' }, (payload) => {
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
          }
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            // Track this user's presence in the session
            await newChannel.track({
              user_id: user.id,
              user_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
              user_role: currentUser.role,
              joined_at: new Date().toISOString()
            });
          }
        });

      setChannel(newChannel);

      return () => {
        newChannel.unsubscribe();
      };
    }
  }, [sessionId, user?.id, lastNotifiedTime, currentItemIndex]);

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
          };
        })
        .filter((item: BacklogItem) => item.status === 'Pending');
      
      setSessionItems(sessionBacklogItems);
    } catch (error) {
      console.error('Error loading session items:', error);
    } finally {
      setSessionItemsLoading(false);
    }
  };

  const pendingItems = sessionItems;
  const currentItem = pendingItems[currentItemIndex];

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
  const loadVotesForCurrentItem = async () => {
    if (!currentItem || !sessionId) return;
    
    setVotesLoading(true);    try {      console.log('🔍 Loading votes - Initial state:', {
        currentItem_id: currentItem.id,
        sessionId,
        user_id: user?.id,
        user_email: user?.email,
        user_metadata: user?.user_metadata,
        currentUser: currentUser,
        participants_count: participants.length,
        participants: participants.map(p => ({id: p.id, name: p.name, role: p.role}))
      });
      
      // Add auth user debug info
      console.log('🔄 AUTHENTICATED USER DEBUG:', {
        id: user?.id,
        email: user?.email,
        displayName: getUserDisplayName(user),
        metadata: user?.user_metadata,
        role: currentUser?.role,
        initials: getUserInitials(getUserDisplayName(user))
      });
      
      const estimations = await getEstimationsForItem(sessionId, currentItem.id);
      console.log('🔍 Raw estimations count:', estimations.length);
      console.log('🔍 Raw estimations from database:', estimations);
        // Check if there are any votes from users with IDs that match "User X" pattern
      const potentialProblemUsers = estimations.filter((est: any) => {
        // Check if this might need special handling
        const isCurrentUser = est.user_id === user?.id;
        const hasProperName = est.user_profiles?.full_name || est.user_metadata?.full_name || est.email;
        return !isCurrentUser && !hasProperName;
      });
      
      if (potentialProblemUsers.length > 0) {
        console.log('⚠️ POTENTIAL PROBLEM USERS DETECTED:', potentialProblemUsers);
      }
        // Create a map to ensure unique votes by user_id
      const voteMap = new Map();      
      
      estimations.forEach((est: any) => {
        console.log('🔍 Processing estimation for user:', {
          est_user_id: est.user_id,
          is_current_user: est.user_id === user?.id,
          est_user_profiles: est.user_profiles ? true : false,
          est_user_metadata: est.user_metadata ? true : false,
          userId_last4: est.user_id.slice(-4),
          email: est.email || est.user_profiles?.email || 'no-email'
        });// Enhanced user name resolution to match header display
        let userName, nameSource;        // If this is the current user, use authenticated user info
        if (est.user_id === user?.id && user) {
          // Use getUserDisplayName for consistent display across the app
          userName = getUserDisplayName(user);
          nameSource = 'auth_user_data';
          
          console.log('🔍 Current user name from auth data:', {
            user_id: user.id,
            email: user.email,
            metadata: user.user_metadata,
            final_userName: userName,
            nameSource: nameSource,
            note: 'Using getUserDisplayName for consistency with header'
          });        } else {
          // Enhanced debug for other user resolution
          console.log('🔎 DETAILED OTHER USER DEBUG for user_id:', est.user_id, {
            raw_data: est,
            user_profiles: est.user_profiles,
            user_metadata: est.user_metadata,
            email: est.email,
            users_email: est.users?.email
          });
          
          // Check for participants first, which is populated from presence tracking and most accurate
          const participant = participants.find(p => p.id === est.user_id);
          if (participant && participant.name && participant.name !== 'User') {
            userName = participant.name;
            nameSource = 'participant_data';
          } else if (est.user_profiles?.full_name) {
            userName = est.user_profiles.full_name;
            nameSource = 'database_profile';
          } else if (est.user_metadata?.full_name) {
            userName = est.user_metadata.full_name;
            nameSource = 'estimation_metadata';
          } else if (est.email) {
            // Try email directly from estimation record
            userName = est.email.split('@')[0];
            nameSource = 'estimation_email';
          } else if (est.users?.email) {
            // Try email from users relation
            userName = est.users.email.split('@')[0];
            nameSource = 'users_table_email';          } else {
            // Check if this User ID matches the current authenticated user before using generic User efaf
            if (est.user_id === user?.id) {
              // Force use of authenticated user display name for the current user
              console.log('🔴 CRITICAL: Found vote from current user without proper name data!');
              userName = getUserDisplayName(user);
              nameSource = 'forced_auth_user_correction';
            } else {
              // Last fallback: Use a part of the user ID
              userName = `User ${est.user_id.slice(-4)}`;
              nameSource = 'user_id_fallback';
            }
          }
          
          console.log('🔍 Other user name resolution:', {
            est_user_id: est.user_id,
            participant: participant,
            user_profiles: est.user_profiles,
            user_metadata: est.user_metadata,
            email: est.email,
            users_email: est.users?.email,
            final_userName: userName,
            nameSource: nameSource
          });
        }let userRole;
        
        // Always use the current user's role from auth context
        if (est.user_id === user?.id) {
          userRole = currentUser.role || 'Moderator';
        } else if (est.user_profiles?.role) {
          userRole = est.user_profiles.role;
        } else {
          // For other users, try participant data or estimation data
          const participant = participants.find(p => p.id === est.user_id);
          if (participant?.role) {
            userRole = participant.role;
          } else if (est.role) {
            userRole = est.role;
          } else {
            userRole = 'Team Member'; // default fallback
          }
        }
        
        console.log('🔍 Role resolution for user:', {
          est_user_id: est.user_id,
          is_current_user: est.user_id === user?.id,
          est_user_profiles_role: est.user_profiles?.role,
          currentUser_role: currentUser.role,
          participant_role: participants.find(p => p.id === est.user_id)?.role,
          est_role: est.role,
          final_userRole: userRole
        });
        
        voteMap.set(est.user_id, {
          userId: est.user_id,
          userName,
          userRole,
          points: est.value,
          timestamp: new Date(est.created_at),
          canEdit: est.user_id === user?.id
        });
      });      const formattedVotes: Vote[] = Array.from(voteMap.values());
      console.log('🔍 Final formatted votes:', formattedVotes);
        // Check specifically for cases where we have a vote with the current user's ID but wrong name format
      if (user) {
        const currentUserVote = formattedVotes.find(vote => vote.userId === user.id);
        if (currentUserVote) {
          const expectedName = getUserDisplayName(user);
          const actualName = currentUserVote.userName;
          
          // If we detect a mismatch between expected and actual name for the current user,
          // fix it directly in the votes array before setting state
          if (expectedName !== actualName) {
            console.warn('🚨 CRITICAL MISMATCH: Current user vote has incorrect name - fixing it', {
              userId: currentUserVote.userId,
              expectedName,
              actualName,
              isUserIdFallback: currentUserVote.userName.match(/User [a-f0-9]{4}/i) ? true : false
            });
            
            // Update the vote object directly
            currentUserVote.userName = expectedName;
          }
        }
      }
      
      // Enhanced debug logging for each vote entry
      console.log('🔍 DETAILED VOTE USER DEBUG: ');
      formattedVotes.forEach(vote => {
        console.log(`Vote for user ${vote.userId}:`, {
          userId: vote.userId,
          userName: vote.userName,
          userRole: vote.userRole,
          isCurrentUser: vote.userId === user?.id,
          matchesCurrentEmail: user?.email?.includes(vote.userName),
          fallbackPattern: vote.userName.match(/User [a-f0-9]{4}/i) ? true : false
        });
      });
        console.log('📊 VOTE SUMMARY:', {
        total_votes: formattedVotes.length,
        auth_user_vote_present: formattedVotes.some(v => v.userId === user?.id),
        fallback_name_count: formattedVotes.filter(v => v.userName.match(/User [a-f0-9]{4}/i)).length
      });
      
      setVotes(formattedVotes);
    } catch (error) {
      console.error('Error loading votes:', error);
      setVotes([]);
    } finally {
      setVotesLoading(false);
    }
  };

  const loadUserVote = async () => {
    if (!currentItem || !sessionId || !user) return;
    
    try {
      const userEstimation = await getUserVote(sessionId, currentItem.id, user.id);
      setMyVote(userEstimation?.value || null);
    } catch (error) {
      console.error('Error loading user vote:', error);
      setMyVote(null);
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
          startedByName: getUserDisplayName(user),
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
    
    try {
      await submitEstimation(sessionId, currentItem.id, user.id, value);
      setMyVote(value.toString());
      
      // Refresh votes immediately to show updated state
      await loadVotesForCurrentItem();
      
      // Broadcast vote event to other participants
      if (channel) {
        channel.send({
          type: 'broadcast',
          event: wasExistingVote ? 'vote-changed' : 'vote-submitted',
          payload: {
            itemId: currentItem.id,
            voterId: user.id,
            voterName: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
            value: value.toString(),
            timestamp: new Date().toISOString()
          }
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

  const revealVotes = () => {
    setIsRevealed(true);
    setTimerActive(false);
    
    // Broadcast vote reveal to all participants
    if (currentUser.role === 'Moderator' && channel && currentItem) {
      channel.send({
        type: 'broadcast',
        event: 'votes-revealed',
        payload: {
          itemId: currentItem.id,
          revealedBy: user?.id
        }
      });
    }
  };

  const nextItem = () => {
    if (currentItemIndex < pendingItems.length - 1) {
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
            newItemTitle: pendingItems[newIndex]?.title || 'Unknown Item'
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
            newItemTitle: pendingItems[newIndex]?.title || 'Unknown Item'
          }
        });
      }
    }
  };

  const resetForNewItem = () => {
    setIsRevealed(false);
    setMyVote(null);
    setVotes([]);
    setTimerActive(false);
    setTimeRemaining(null);
  };

  const handleAcceptEstimate = async () => {
    if (!currentItem) return;
    
    try {
      // Update the backlog item with the final estimate
      // const finalEstimate = consensus || Math.round(average);
      // TODO: Update backlog item status and story points in database
      nextItem();
    } catch (error) {
      console.error('Error accepting estimate:', error);
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
        )}      </div>
      
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
        </div>
      )}
      
      {/* Navigation Controls */}
      <NavigationControls />

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Voting Cards */}
        <div>
          <VotingCards
            onVote={handleVote}
            selectedVote={myVote}
            disabled={isRevealed || loading}
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
                  )}
                  {loading && (
                    <div className="flex items-center gap-2 text-sm text-blue-600">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      Saving...
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Vote submission instructions */}
          {!myVote && !isRevealed && (
            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-center gap-2 text-blue-800">
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                <span className="font-medium text-sm">Select your estimate above to participate in voting</span>
              </div>
            </div>
          )}
        </div>

        {/* Votes Display */}
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Team Votes</h3>
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

          <div className="space-y-3">
            {votesLoading && (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-600">Updating votes...</span>
              </div>
            )}                {!votesLoading && votes.length > 0 && votes.map((vote) => (
              <div key={vote.userId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg transition-all duration-300 hover:bg-gray-100 relative">                  
                <div className="flex items-center gap-3">                    
                  {vote.userName.match(/User [a-f0-9]{4}/i) && vote.userId === user?.id && (() => {
                    console.log('🔴 CRITICAL: Authenticated user still showing as User efaf:', {
                      vote_userId: vote.userId,
                      vote_userName: vote.userName,
                      currentUserId: user?.id,
                      authUserName: getUserDisplayName(user)
                    });
                    
                    // If this is the current user with a "User efaf" name, we'll render 
                    // a warning but continue to display the avatar correctly
                    return (
                      <div className="absolute right-2 top-2">
                        <div className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded-full" title="Debug info">
                          Auth User ID Match
                        </div>
                      </div>
                    );
                  })()}
                  
                  {vote.userName.match(/User [a-f0-9]{4}/i) && vote.userId !== user?.id && (
                    <div className="absolute right-2 top-2">
                      <div className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full" title="Debug info">
                        Fallback Name
                      </div>
                    </div>
                  )}                    {vote.userId === user?.id ? (
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white">
                        <span className="text-sm font-medium">
                          {/* Always use auth user data for consistency */}
                          {getUserInitials(getUserDisplayName(user))}
                        </span>
                      </div>
                    ) : (
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-blue-800">
                          {getUserInitials(vote.userName)}
                        </span>
                      </div>
                    )}
                  <div>                      <div className="flex items-center space-x-1">                        <span className="font-medium text-gray-900">
                          {/* Always use authenticated user name when the vote belongs to the current user */}
                          {vote.userId === user?.id ? getUserDisplayName(user) : vote.userName}
                        </span>
                        {vote.userRole === 'Moderator' && (
                          <div title="Moderator">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-crown w-4 h-4 text-yellow-500">
                              <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14"></path>
                            </svg>
                          </div>
                        )}
                      </div>
                      <span className="text-sm text-gray-500">
                        {vote.userRole}
                      </span>
                      {vote.userId === user?.id && user?.email && (
                        <span className="text-xs text-gray-400 block">{user.email}</span>
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
              ))}
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
                <div className="text-sm text-gray-600 mb-2">Estimation Result</div>
                <div className="text-3xl font-bold text-gray-900 mb-2">
                  {consensus || (estimationType === 'fibonacci' ? average.toFixed(1) : 'M')}
                  {estimationType === 'fibonacci' ? ' SP' : ''}
                </div>
                <div className="text-sm text-gray-600 mb-4">
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