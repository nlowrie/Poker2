import { useState, useEffect } from 'react';
import { BacklogItem, User, Vote } from '../types';
import { Eye, SkipForward, CheckCircle, Users, Clock } from 'lucide-react';
import VotingCards from './VotingCards';
import Chat from './ChatPanel';
import VideoConference from './VideoConference';
import ErrorBoundary from './ErrorBoundary';
import { calculateConsensus } from '../utils/planningPoker';
import { submitEstimation, getEstimationsForItem, getSessionItems } from '../utils/planningSession';
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
  const [estimationType] = useState<'fibonacci' | 'tshirt'>('fibonacci');
  const [sessionItems, setSessionItems] = useState<BacklogItem[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [myVote, setMyVote] = useState<string | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);  
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [timerActive, setTimerActive] = useState(false);
  const [votingTimeLimit, setVotingTimeLimit] = useState(300); // 5 minutes default
  const [showTimerConfig, setShowTimerConfig] = useState(false);
  const [tempTimeLimit, setTempTimeLimit] = useState(300);
  const [loading, setLoading] = useState(false);
  const [channel, setChannel] = useState<any>(null);
  const [votesLoading, setVotesLoading] = useState(false);
  const [participants, setParticipants] = useState<Array<{
    id: string;
    name: string;
    role: string;
    isOnline: boolean;
    lastSeen: Date;
  }>>([]);
  const [isChatVisible, setIsChatVisible] = useState(false);
  const [, setChatUnreadCount] = useState(0); // Keep setter for chat notifications
  const [isVideoCallActive, setIsVideoCallActive] = useState(false);

  // Current item from session items
  const currentItem = sessionItems[currentItemIndex] || null;

  // Helper function to format time
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Load session items when sessionId changes
  useEffect(() => {
    const loadSessionItems = async () => {
      if (!sessionId) return;
      
      try {
        const items = await getSessionItems(sessionId);
        console.log('Session items structure:', JSON.stringify(items, null, 2));
        // For now, just convert to any to avoid TypeScript errors during development
        setSessionItems(items as any);
      } catch (error) {
        console.error('Error loading session items:', error);
      }
    };
    
    loadSessionItems();
  }, [sessionId]);

  // Set up real-time channel
  useEffect(() => {
    if (!sessionId || !user) return;
    
    // Create a channel for real-time updates
    const newChannel = supabase.channel(`planning-poker-${sessionId}`);
    
    // Handle presence updates (who's online)
    newChannel      .on('presence', { event: 'sync' }, () => {
        const presentUsers = newChannel.presenceState();
        console.log('Presence state:', presentUsers);
        
        const participantsList = Object.keys(presentUsers).map(key => {
          const userData = presentUsers[key][0] as any;
          return {
            id: userData.user_id || key,
            name: userData.user_name || 'User',
            role: userData.user_role || 'Team Member',
            isOnline: true,
            lastSeen: new Date()
          };
        });
        
        setParticipants(participantsList);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await newChannel.track({
            user_id: user.id,
            user_name: getUserDisplayName(user),
            user_role: currentUser.role,
            online_at: new Date().toISOString()
          });
        }
      });
    
    setChannel(newChannel);
    
    return () => {
      newChannel.unsubscribe();
    };
  }, [sessionId, user, currentUser]);

  // Process vote changes
  useEffect(() => {
    if (!sessionId || !currentItem) return;
    
    const votesChannel = supabase
      .channel(`votes-${sessionId}-${currentItem.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'estimations',
        filter: `session_id=eq.${sessionId},item_id=eq.${currentItem.id}`
      }, () => {
        loadVotesForCurrentItem();
      })
      .subscribe();
    
    // Load initial votes
    loadVotesForCurrentItem();
    
    return () => {
      votesChannel.unsubscribe();
    };
  }, [currentItem, sessionId, user]);

  const loadVotesForCurrentItem = async () => {
    if (!currentItem || !sessionId) return;
    
    setVotesLoading(true);
    try {
      console.log('🔍 Loading votes - Initial state:', {
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
        });
        
        // Enhanced user name resolution to match header display
        let userName, nameSource;
        
        // If this is the current user, use authenticated user info
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
          });
        } else {
          // Enhanced debug for other user resolution
          console.log('🔎 DETAILED OTHER USER DEBUG for user_id:', est.user_id, {
            user_profiles: est.user_profiles,
            user_metadata: est.user_metadata,
            email: est.email,
            users_email: est.users?.email,
            participant: participants.find(p => p.id === est.user_id)
          });
          
          // Check for participants first, which is populated from presence tracking and most accurate
          const participant = participants.find(p => p.id === est.user_id);
          
          // DEBUGGING - Special attention to potential "User efaf" cases
          const isPotentialProblemUser = !participant?.name && !est.user_profiles?.full_name && 
                                       !est.user_metadata?.full_name && !est.email && !est.users?.email;
          
          if (isPotentialProblemUser) {
            console.log(`⚠️ POTENTIAL "User efaf" DETECTED:`, {
              user_id: est.user_id,
              last4: est.user_id.slice(-4),
              participant_match: participant ? true : false,
              participant_name: participant?.name,
              has_profiles: est.user_profiles ? true : false,
              has_metadata: est.user_metadata ? true : false,
              email: est.email || est.user_profiles?.email || est.users?.email || 'no-email'
            });
          }
          
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
            // Check if this User ID matches the current authenticated user before using generic User efaf
            if (est.user_id === user?.id) {
              // Force use of authenticated user display name for the current user
              console.log('🔴 CRITICAL: Found vote from current user without proper name data!');
              userName = getUserDisplayName(user);
              nameSource = 'forced_auth_user_correction';
            } else {
              // Try email from users relation
              userName = est.users.email.split('@')[0];
              nameSource = 'users_table_email';
            }
          } else {
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
        }
        
        let userRole;
        
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
      });
      
      const formattedVotes: Vote[] = Array.from(voteMap.values());
      
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
  };  // Comment out unused function for now
  /*const loadUserVote = async () => {
    if (!currentItem || !sessionId || !user) return;
    
    try {
      const userEstimation = await getUserVote(sessionId, currentItem.id, user.id);
      setMyVote(userEstimation?.value || null);
    } catch (error) {
      console.error('Error loading user vote:', error);
      setMyVote(null);
    }
  };*/

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
  }, [timerActive, timeRemaining, currentUser.role, channel, currentItem]);

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
          pausedByName: getUserDisplayName(user),
          timeLeft: timeRemaining,
          itemId: currentItem?.id
        }
      });
    }
  };

  const resetTimer = () => {
    setTimerActive(false);
    setTimeRemaining(null);
    
    // Broadcast timer reset to all clients
    if (channel && currentUser.role === 'Moderator') {
      channel.send({
        type: 'broadcast',
        event: 'timer-reset',
        payload: {
          resetBy: user?.id,
          resetByName: getUserDisplayName(user),
          itemId: currentItem?.id
        }
      });
    }
  };

  const handleTimerConfigSave = () => {
    setVotingTimeLimit(tempTimeLimit);
    setShowTimerConfig(false);
    
    // Broadcast timer configuration change to all participants
    if (channel && currentUser.role === 'Moderator') {
      channel.send({
        type: 'broadcast',
        event: 'timer-config-changed',
        payload: {
          newTimeLimit: tempTimeLimit
        }
      });
    }
  };
  
  const handleTimerConfigCancel = () => {
    setTempTimeLimit(votingTimeLimit);
    setShowTimerConfig(false);
  };

  const timerPresets = [
    { label: '1 minute', value: 60 },
    { label: '3 minutes', value: 180 },
    { label: '5 minutes', value: 300 },
    { label: '10 minutes', value: 600 },
    { label: '15 minutes', value: 900 },
    { label: '30 minutes', value: 1800 }
  ];

  const nextItem = () => {
    if (currentItemIndex < sessionItems.length - 1) {
      setCurrentItemIndex(currentItemIndex + 1);
      setIsRevealed(false);
      setMyVote(null);
      resetTimer();
      
      if (channel) {
        channel.send({
          type: 'broadcast',
          event: 'move-to-next-item',
          payload: {
            movedBy: user?.id,
            movedByName: getUserDisplayName(user),
            fromItemIndex: currentItemIndex,
            toItemIndex: currentItemIndex + 1,
            newItemId: sessionItems[currentItemIndex + 1]?.id,
            newItemTitle: sessionItems[currentItemIndex + 1]?.title
          }
        });
      }
    }
  };

  const handleVote = async (value: string | number) => {
    if (!currentItem || !sessionId || !user) return;
    
    setLoading(true);
    try {      // Convert number vote to string if needed
      const voteAsString = value.toString();
      await submitEstimation(sessionId, currentItem.id, voteAsString, user.id);
      setMyVote(voteAsString);
      loadVotesForCurrentItem();
    } catch (error) {
      console.error('Error submitting vote:', error);
    } finally {
      setLoading(false);
    }
  };

  const revealVotes = async () => {
    setIsRevealed(true);
    
    // Broadcast reveal votes to all clients
    if (channel) {
      channel.send({
        type: 'broadcast',
        event: 'reveal-votes',
        payload: {
          revealedBy: user?.id,
          revealedByName: getUserDisplayName(user),
          itemId: currentItem?.id,
          itemTitle: currentItem?.title,
          votes: votes.map(v => ({ userId: v.userId, userName: v.userName, value: v.points }))
        }
      });
    }
  };

  // Calculate consensus
  const voteValues = isRevealed ? votes.map((vote) => vote.points) : [];
  const { consensus, average, hasConsensus } = calculateConsensus(voteValues, estimationType);

  // Timer Configuration Modal Component
  const TimerConfigModal = () => {
    if (!showTimerConfig || currentUser.role !== 'Moderator') return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Timer Configuration</h2>
          
          {/* Timer Presets */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Timer Presets
            </label>
            <div className="flex flex-wrap gap-2">
              {timerPresets.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => setTempTimeLimit(preset.value)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
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
          <div className="mb-6">
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
                  const mins = parseInt(e.target.value, 10) || 0;
                  const secs = tempTimeLimit % 60;
                  setTempTimeLimit(mins * 60 + secs);
                }}
                className="block w-20 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
              <span className="text-xl">:</span>
              <input
                type="number"
                min="0"
                max="59"
                value={tempTimeLimit % 60}
                onChange={(e) => {
                  const secs = parseInt(e.target.value, 10) || 0;
                  const mins = Math.floor(tempTimeLimit / 60);
                  setTempTimeLimit(mins * 60 + secs);
                }}
                className="block w-20 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 mt-6">
            <button
              onClick={handleTimerConfigCancel}
              className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
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
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      {/* Session Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
        <div>
          <button
            onClick={onBackToBacklog}
            className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-2"
          >
            <SkipForward className="w-4 h-4 mr-1 rotate-180" />
            <span>Back to Backlog</span>
          </button>
          
          <h1 className="text-3xl font-bold text-gray-900">
            {currentItem?.title || 'Loading...'}
          </h1>
          
          {currentItem?.description && (
            <p className="mt-2 text-gray-600 max-w-3xl">{currentItem.description}</p>
          )}
        </div>
        
        <div className="flex items-center gap-2 self-end md:self-auto">
          {/* Timer Controls for Moderator */}
          {currentUser.role === 'Moderator' && (
            <div className="flex items-center gap-2">
              {!timerActive && timeRemaining === null && (
                <button
                  onClick={startTimer}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center gap-2"
                >
                  <Clock className="w-4 h-4" />
                  Start Timer
                </button>
              )}
              
              {timerActive && timeRemaining !== null && (
                <button
                  onClick={pauseTimer}
                  className="bg-yellow-500 text-white px-4 py-2 rounded-lg hover:bg-yellow-600 transition-colors duration-200 flex items-center gap-2"
                >
                  <Clock className="w-4 h-4" />
                  Pause
                </button>
              )}
              
              {!timerActive && timeRemaining !== null && timeRemaining > 0 && (
                <button
                  onClick={startTimer}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors duration-200 flex items-center gap-2"
                >
                  <Clock className="w-4 h-4" />
                  Resume
                </button>
              )}
              
              {timeRemaining !== null && (
                <button
                  onClick={resetTimer}
                  className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors duration-200 flex items-center gap-2"
                >
                  <Clock className="w-4 h-4" />
                  Reset
                </button>
              )}
              
              <button
                onClick={() => setShowTimerConfig(true)}
                className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors duration-200 flex items-center gap-2"
              >
                <Clock className="w-4 h-4" />
                Configure
              </button>
            </div>
          )}
          
          {/* Timer Display */}
          {timeRemaining !== null && (
            <div className={`px-4 py-2 rounded-lg text-white font-semibold ${
              timerActive ? 'bg-blue-600' : 'bg-gray-500'
            }`}>
              {formatTime(timeRemaining)}
            </div>
          )}
        </div>
      </div>
      
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
                  : 'Timer Running'
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
              <div className="font-bold">Timer Paused</div>
              <div className="text-sm opacity-90">{formatTime(timeRemaining)} remaining when resumed</div>
            </div>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Voting Cards */}
        <div>          <VotingCards
            onVote={handleVote}
            selectedVote={myVote}
            estimationType={estimationType}
            disabled={isRevealed || timerActive === false}
          />
          
          {/* Submit status and instructions */}
          <div className="mt-4">
            <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {myVote && (
                    <div className="flex items-center gap-1 text-green-600">
                      <CheckCircle className="w-5 h-5" />
                      <span className="text-sm font-medium">Vote submitted</span>
                    </div>
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
          <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200 mt-6">
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
              )}
              
              {!votesLoading && votes.length > 0 && votes.map((vote) => (
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
                    )}
                    
                    {vote.userId === user?.id ? (
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
                    
                    <div>
                      <div className="flex items-center space-x-1">
                        <span className="font-medium text-gray-900">
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
              
              {!votesLoading && votes.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>Waiting for team votes...</p>
                </div>
              )}
            </div>
            
            {/* Consensus Display */}
            {isRevealed && votes.length > 0 && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex flex-col items-center">
                  <span className="text-sm text-gray-500 mb-1">Team Consensus</span>
                  <div className="text-2xl font-bold text-gray-900 mb-2">
                    {consensus || (estimationType === 'fibonacci' ? average.toFixed(1) : 'M')}
                    {estimationType === 'fibonacci' && <span className="text-gray-500 ml-1 text-lg">SP</span>}
                  </div>
                  <p className="text-sm text-gray-600 text-center">
                    {hasConsensus ? (
                      <span className="text-green-600 font-medium">✓ Team has reached consensus!</span>
                    ) : (
                      <span className="text-orange-500 font-medium">
                        {estimationType === 'fibonacci'
                        ? `Average: ${average.toFixed(1)} - Discussion needed`
                        : 'No clear consensus - Discussion needed'}
                      </span>
                    )}
                  </p>
                  
                  {currentUser.role === 'Moderator' && (
                    <button
                      onClick={nextItem}
                      className="mt-4 bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors duration-200 flex items-center gap-2"
                    >
                      <SkipForward className="w-4 h-4" />
                      Next Item
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Chat Panel */}
        <ErrorBoundary>
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden h-full min-h-[600px]">
            <Chat
              sessionId={sessionId}
              currentUser={currentUser}
              channel={channel}
              currentItemId={currentItem?.id}
              isVisible={isChatVisible}
              onClose={() => setIsChatVisible(false)}
              onUnreadCountChange={(count) => setChatUnreadCount(count)}
            />
          </div>
        </ErrorBoundary>
        
        {/* Video Conference Modal */}
        {isVideoCallActive && (
          <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full h-[80vh] overflow-hidden">              <VideoConference
                sessionId={sessionId}
                onClose={() => setIsVideoCallActive(false)}
              />
            </div>
          </div>
        )}

        {/* Timer Configuration Modal */}
        <TimerConfigModal />
      </div>
    </div>
  );
}
