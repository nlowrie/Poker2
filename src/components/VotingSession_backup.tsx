import { useState, useEffect, useRef, useCallback } from 'react';
import { BacklogItem, User, Vote } from '../types';
import { Eye, EyeOff, SkipForward, CheckCircle, ArrowLeft, Users, Clock, MessageCircle, Video } from 'lucide-react';
import VotingCards from './VotingCards';
import UserIcon from './UserIcon';
import Chat from './ChatPanel';
import VideoConference from './VideoConference';
import ErrorBoundary from './ErrorBoundary';
import { calculateConsensus } from '../utils/planningPoker';
import { submitEstimation, getEstimationsForItem, getUserVote, getSessionItems } from '../utils/planningSession';
import { getUserDisplayName, getUserInitials } from '../utils/userUtils';
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
  const [isRevealed, setIsRevealed] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [timerActive, setTimerActive] = useState(false);
  const [votingTimeLimit, setVotingTimeLimit] = useState(300);
  const [loading, setLoading] = useState(false);
  const [sessionItemsLoading, setSessionItemsLoading] = useState(true);
  const [channel, setChannel] = useState<any>(null);
  const [channelSubscribed, setChannelSubscribed] = useState(false);
  const [votesLoading, setVotesLoading] = useState(false);
  const [voteNotification, setVoteNotification] = useState<string | null>(null);
  
  const [participants, setParticipants] = useState<Array<{
    id: string;
    name: string;
    role: string;
    isOnline: boolean;
    lastSeen: Date;
  }>>([]);
  const [isChatVisible, setIsChatVisible] = useState(false);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const [isVideoCallActive, setIsVideoCallActive] = useState(false);

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
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Helper function to reset all session state
  const resetSessionState = useCallback(() => {
    setVotes([]);
    setMyVote(null);
    setIsRevealed(false);
    setTimeRemaining(null);
    setTimerActive(false);
    setVoteNotification(null);
  }, []);

  // Helper function to reset voting state
  const resetVotingState = useCallback(() => {
    setVotes([]);
    setMyVote(null);
    setIsRevealed(false);
    setVoteNotification(null);
  }, []);

  // Load session items
  const loadSessionItems = async () => {
    setSessionItemsLoading(true);
    try {
      const items = await getSessionItems(sessionId);
      setSessionItems(items);
      console.log('🔍 Loaded session items:', items.length);
    } catch (error) {
      console.error('Error loading session items:', error);
    } finally {
      setSessionItemsLoading(false);
    }
  };

  const pendingItems = sessionItems;
  const currentItem = pendingItems[currentItemIndex];

  // Load votes and user's vote for current item
  const loadVotesForCurrentItem = async () => {
    if (!currentItem) return;
    
    setVotesLoading(true);
    try {
      const [allVotes, userVote] = await Promise.all([
        getEstimationsForItem(sessionId, currentItem.id),
        getUserVote(sessionId, currentItem.id, user?.id || '')
      ]);
      
      setVotes(allVotes);
      setMyVote(userVote?.value || null);
      
      // Check if votes are already revealed
      const hasAnyRevealedVote = allVotes.some(vote => vote.isRevealed);
      setIsRevealed(hasAnyRevealedVote);
    } catch (error) {
      console.error('Error loading votes:', error);
    } finally {
      setVotesLoading(false);
    }
  };

  // Initialize session and load data
  useEffect(() => {
    loadSessionItems();
  }, [sessionId]);

  // Load votes when current item changes
  useEffect(() => {
    if (currentItem) {
      loadVotesForCurrentItem();
    }
  }, [currentItem, sessionId, user?.id]);

  // Setup real-time channel
  useEffect(() => {
    if (!user || !sessionId) return;

    const newChannel = supabase.channel(`planning-session-${sessionId}`, {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    newChannel
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
        
        setParticipants(Array.from(participantMap.values()));
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('User joined:', newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('User left:', leftPresences);
      })
      .on('broadcast', { event: 'vote-submitted' }, (payload) => {
        console.log('Vote submitted broadcast received:', payload);
        loadVotesForCurrentItem();
      })
      .on('broadcast', { event: 'votes-revealed' }, () => {
        console.log('Votes revealed broadcast received');
        setIsRevealed(true);
      })
      .on('broadcast', { event: 'votes-reset' }, () => {
        console.log('Votes reset broadcast received');
        resetVotingState();
      })
      .on('broadcast', { event: 'timer-started' }, (payload) => {
        const { timeLimit } = payload.payload;
        setTimeRemaining(timeLimit);
        setTimerActive(true);
      })
      .on('broadcast', { event: 'timer-paused' }, () => {
        setTimerActive(false);
      })
      .on('broadcast', { event: 'timer-resumed' }, () => {
        setTimerActive(true);
      })
      .on('broadcast', { event: 'timer-reset' }, () => {
        setTimeRemaining(null);
        setTimerActive(false);
      })
      .on('broadcast', { event: 'item-changed' }, (payload) => {
        const { newItemIndex } = payload.payload;
        const currentItemIndexValue = currentItemIndexRef.current;
        if (newItemIndex !== currentItemIndexValue) {
          setCurrentItemIndex(newItemIndex);
          resetVotingState();
        }
      })
      .subscribe((status) => {
        console.log('Subscription status:', status);
        if (status === 'SUBSCRIBED') {
          setChannelSubscribed(true);
          // Track presence
          newChannel.track({
            user_id: user.id,
            user_name: getUserDisplayName(user),
            user_role: currentUser.role,
            online_at: new Date().toISOString(),
          });
        }
      });

    setChannel(newChannel);
    
    return () => {
      if (newChannel) {
        newChannel.unsubscribe();
      }
    };
  }, [user, sessionId, currentUser.role, resetVotingState]);

  // Timer countdown effect
  useEffect(() => {
    if (timerActive && timeRemaining !== null && timeRemaining > 0) {
      const timer = setTimeout(() => {
        setTimeRemaining(prev => {
          if (prev === null || prev <= 1) {
            setTimerActive(false);
            // Auto-reveal votes when timer reaches 0
            if (votes.length > 0 && !isRevealed) {
              revealVotes();
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [timerActive, timeRemaining, votes.length, isRevealed]);

  // Handle vote submission
  const handleVote = async (value: string) => {
    if (!currentItem || !user) return;
    
    setLoading(true);
    try {
      await submitEstimation(sessionId, currentItem.id, user.id, value, isRevealed);
      setMyVote(value);
      
      // Broadcast vote submission
      if (channel && channelSubscribed) {
        await channel.send({
          type: 'broadcast',
          event: 'vote-submitted',
          payload: {
            voterId: user.id,
            voterName: getUserDisplayName(user),
            itemId: currentItem.id,
            value: value
          }
        });
      }
      
      // Refresh votes
      await loadVotesForCurrentItem();
    } catch (error) {
      console.error('Error submitting vote:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle vote reveal
  const revealVotes = async () => {
    if (!currentItem || !channel || !channelSubscribed) return;
    
    try {
      // Update all votes to revealed in database
      const { error } = await supabase
        .from('estimations')
        .update({ is_revealed: true })
        .eq('session_id', sessionId)
        .eq('backlog_item_id', currentItem.id);
        
      if (error) throw error;
      
      setIsRevealed(true);
      
      // Broadcast to all participants
      await channel.send({
        type: 'broadcast',
        event: 'votes-revealed',
        payload: {
          itemId: currentItem.id
        }
      });
      
      // Stop timer if active
      if (timerActive) {
        setTimerActive(false);
        await channel.send({
          type: 'broadcast',
          event: 'timer-paused',
          payload: {}
        });
      }
    } catch (error) {
      console.error('Error revealing votes:', error);
    }
  };

  // Handle vote reset
  const resetVotes = async () => {
    if (!currentItem || !channel || !channelSubscribed) return;
    
    try {
      // Delete all votes for current item
      const { error } = await supabase
        .from('estimations')
        .delete()
        .eq('session_id', sessionId)
        .eq('backlog_item_id', currentItem.id);
        
      if (error) throw error;
      
      resetVotingState();
      
      // Broadcast to all participants
      await channel.send({
        type: 'broadcast',
        event: 'votes-reset',
        payload: {
          itemId: currentItem.id,
          resetBy: user?.id,
          resetByName: getUserDisplayName(user)
        }
      });
    } catch (error) {
      console.error('Error resetting votes:', error);
    }
  };

  // Handle skip to next item
  const handleSkip = () => {
    if (currentItemIndex < sessionItems.length - 1) {
      const newIndex = currentItemIndex + 1;
      setCurrentItemIndex(newIndex);
      resetVotingState();
      
      // Broadcast item change
      if (channel && channelSubscribed) {
        channel.send({
          type: 'broadcast',
          event: 'item-changed',
          payload: {
            newItemIndex: newIndex,
            changedBy: user?.id,
            changedByName: getUserDisplayName(user)
          }
        });
      }
    }
  };

  // Timer functions
  const startTimer = () => {
    setTimeRemaining(votingTimeLimit);
    setTimerActive(true);
    
    if (channel && channelSubscribed) {
      channel.send({
        type: 'broadcast',
        event: 'timer-started',
        payload: {
          timeLimit: votingTimeLimit,
          startedBy: user?.id,
          startedByName: getUserDisplayName(user)
        }
      });
    }
  };

  const pauseTimer = () => {
    setTimerActive(false);
    
    if (channel && channelSubscribed) {
      channel.send({
        type: 'broadcast',
        event: 'timer-paused',
        payload: {
          pausedBy: user?.id,
          pausedByName: getUserDisplayName(user)
        }
      });
    }
  };

  const resumeTimer = () => {
    setTimerActive(true);
    
    if (channel && channelSubscribed) {
      channel.send({
        type: 'broadcast',
        event: 'timer-resumed',
        payload: {
          resumedBy: user?.id,
          resumedByName: getUserDisplayName(user)
        }
      });
    }
  };

  const resetTimer = () => {
    setTimeRemaining(null);
    setTimerActive(false);
    
    if (channel && channelSubscribed) {
      channel.send({
        type: 'broadcast',
        event: 'timer-reset',
        payload: {
          resetBy: user?.id,
          resetByName: getUserDisplayName(user)
        }
      });
    }
  };

  const toggleVideoCall = () => {
    setIsVideoCallActive(!isVideoCallActive);
  };

  // Early returns for loading states
  if (sessionItemsLoading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="text-center py-12">
          <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading session items...</p>
        </div>
      </div>
    );
  }

  if (!currentItem) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <h2 className="text-xl font-bold text-red-800 mb-2">No Items Available</h2>
          <p className="text-red-600 mb-4">There are no items in this planning session.</p>
          <button
            onClick={onBackToBacklog}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Backlog
          </button>
        </div>
      </div>
    );
  }

  // Calculate consensus for display
  const voteValues = votes.map(vote => vote.value);
  const consensus = calculateConsensus(voteValues, estimationType);
  const numericVotes = votes
    .map(vote => vote.value)
    .filter(value => {
      if (estimationType === 'fibonacci') {
        const num = parseFloat(value);
        return !isNaN(num);
      }
      return false;
    })
    .map(value => parseFloat(value));
  
  const average = numericVotes.length > 0 
    ? numericVotes.reduce((sum, val) => sum + val, 0) / numericVotes.length 
    : 0;
  
  const hasConsensus = consensus !== null;

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Vote notification */}
      {voteNotification && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            {voteNotification}
          </div>
        </div>
      )}
      
      {/* Navigation Controls */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onBackToBacklog}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Backlog
        </button>
        
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">
            Item {currentItemIndex + 1} of {sessionItems.length}
          </span>
          
          <div className="flex gap-2">
            <button
              onClick={toggleVideoCall}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                isVideoCallActive 
                  ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                  : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
              }`}
            >
              <Video className="w-4 h-4" />
              {isVideoCallActive ? 'End Call' : 'Video Call'}
            </button>
            
            <button
              onClick={() => setIsChatVisible(!isChatVisible)}
              className="relative flex items-center gap-2 bg-purple-100 text-purple-700 px-3 py-2 rounded-lg hover:bg-purple-200 transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              Chat
              {chatUnreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center animate-bounce">
                  {chatUnreadCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Voting Cards */}
        <div>
          <VotingCards
            onVote={handleVote}
            selectedVote={myVote}
            disabled={loading}
            estimationType={estimationType}
          />
          
          {/* User's Vote Display */}
          {myVote && (
            <div className="mt-4 bg-green-50 border border-green-200 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <div className="font-medium text-green-900">Your Vote</div>
                    <div className="text-green-700 flex items-center gap-2">
                      <span className="text-lg font-bold">{myVote}</span>
                      {estimationType === 'fibonacci' && <span>SP</span>}
                    </div>
                  </div>
                </div>
                {isRevealed && (
                  <button
                    onClick={() => setMyVote(null)}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors"
                  >
                    ✏️ Edit Vote
                  </button>
                )}
              </div>
            </div>
          )}
          
          {/* Vote submission instructions */}
          {!myVote && (
            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-center gap-2 text-blue-800">
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                <span className="font-medium text-sm">
                  {isRevealed 
                    ? "Select your new estimate above to update your vote" 
                    : "Select your estimate above to participate in voting"
                  }
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Votes Display */}
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Team Votes</h3>
            <div className="flex gap-2">
              {currentUser.role === 'Moderator' && votes.length > 0 && !isRevealed && (
                <button
                  onClick={revealVotes}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  Reveal Votes
                </button>
              )}
              
              {currentUser.role === 'Moderator' && votes.length > 0 && isRevealed && (
                <button
                  onClick={resetVotes}
                  className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors duration-200"
                >
                  Reset Voting
                </button>
              )}
              
              {currentUser.role === 'Moderator' && currentItemIndex < sessionItems.length - 1 && (
                <button
                  onClick={handleSkip}
                  className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors duration-200 flex items-center gap-2"
                >
                  <SkipForward className="w-4 h-4" />
                  Next Item
                </button>
              )}
            </div>
          </div>

          {/* Votes List */}
          <div className="space-y-3 mb-6">
            {votes.map((vote, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <UserIcon name={vote.voterName} />
                  <span className="font-medium text-gray-900">{vote.voterName}</span>
                </div>
                <div className="flex items-center gap-2">
                  {isRevealed ? (
                    <span className="text-lg font-bold text-gray-900">
                      {vote.value}
                      {estimationType === 'fibonacci' ? ' SP' : ''}
                    </span>
                  ) : (
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {votes.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No votes yet. Waiting for team members to vote...
              </div>
            )}
          </div>

          {/* Consensus Display */}
          {isRevealed && votes.length > 0 && (
            <div className={`rounded-xl p-4 text-center ${
              hasConsensus 
                ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200' 
                : 'bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200'
            }`}>
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
            </div>
          )}

          {/* Timer Display */}
          {(timeRemaining !== null || currentUser.role === 'Moderator') && (
            <div className="mt-6 bg-gray-50 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-gray-600" />
                  <span className="font-medium text-gray-900">Voting Timer</span>
                </div>
                
                {timeRemaining !== null && (
                  <div className={`text-lg font-bold ${
                    timeRemaining <= 30 ? 'text-red-600' : 'text-gray-900'
                  }`}>
                    {formatTime(timeRemaining)}
                  </div>
                )}
                
                {currentUser.role === 'Moderator' && (
                  <div className="flex gap-2">
                    {!timerActive && timeRemaining === null && (
                      <button
                        onClick={startTimer}
                        className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 transition-colors"
                      >
                        Start Timer
                      </button>
                    )}
                    
                    {!timerActive && timeRemaining !== null && timeRemaining > 0 && (
                      <button
                        onClick={resumeTimer}
                        className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors"
                      >
                        Resume
                      </button>
                    )}
                    
                    {timerActive && (
                      <button
                        onClick={pauseTimer}
                        className="bg-yellow-600 text-white px-3 py-1 rounded text-sm hover:bg-yellow-700 transition-colors"
                      >
                        Pause
                      </button>
                    )}
                    
                    {timeRemaining !== null && (
                      <button
                        onClick={resetTimer}
                        className="bg-gray-600 text-white px-3 py-1 rounded text-sm hover:bg-gray-700 transition-colors"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Current Item Details */}
      <div className="mt-6 bg-gray-50 rounded-xl p-6">
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

      {/* Chat Panel */}
      <ErrorBoundary fallback={
        <div className="fixed right-0 top-0 h-full w-80 bg-red-50 border-l border-red-200 p-4 flex items-center justify-center">
          <div className="text-center">
            <div className="text-red-600 text-4xl mb-2">⚠️</div>
            <p className="text-red-800 font-medium">Chat temporarily unavailable</p>
          </div>
        </div>
      }>
        {isChatVisible && (
          <Chat
            sessionId={sessionId}
            currentUser={currentUser}
            onClose={() => setIsChatVisible(false)}
            onUnreadCountChange={setChatUnreadCount}
          />
        )}
      </ErrorBoundary>

      {/* Video Conference Modal */}
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
    </div>
  );
}
