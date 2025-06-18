import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Video, VideoOff, Mic, MicOff, PhoneOff, Settings
} from 'lucide-react';
import { VideoParticipant, VideoConferenceState, VideoCallSignal } from '../types';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';
import { getUserDisplayName, getUserInitials } from '../utils/userUtils';

interface CompactVideoConferenceProps {
  sessionId: string;
  isActive: boolean;
  onToggle: () => void;
  currentUser?: {
    role: string;
    name?: string;
  };
  hasUserJoined?: boolean;
  initiatorId?: string | null;
}

export default function CompactVideoConference({ 
  sessionId, 
  isActive, 
  onToggle,
  currentUser,
  hasUserJoined = false,
  initiatorId
}: CompactVideoConferenceProps) {
  const { user } = useAuth();
  
  // State management
  const [videoState, setVideoState] = useState<VideoConferenceState>({
    isActive: false,
    participants: [],
    isVideoEnabled: true,
    isAudioEnabled: true,
    isScreenSharing: false,
  });
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [participants, setParticipants] = useState<VideoParticipant[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showFallbackOptions, setShowFallbackOptions] = useState(false);
  // Refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const channel = useRef<any>(null);  const isInitializing = useRef(false);
  const cleanupInProgress = useRef(false);
  
  // Helper function to get remote participants (excluding current user)
  const getRemoteParticipants = () => {
    return participants.filter(participant => participant.id !== user?.id);
  };
  
  // WebRTC configuration
  const rtcConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
  };
  // Initialize video conference
  const initializeVideoConference = useCallback(async () => {
    if (isInitializing.current || cleanupInProgress.current) {
      return;
    }
    
    isInitializing.current = true;
    setError(null);
    
    try {      console.log('CompactVideo: Starting initialization...');
      console.log('CompactVideo: Current user:', user);
      console.log('CompactVideo: User ID:', user?.id);
      console.log('CompactVideo: User metadata:', user?.user_metadata);
      
      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Your browser does not support video calls. Please use a modern browser like Chrome, Firefox, or Safari.');
      }      // Get user media with permission handling
      const constraints = {
        video: isVideoEnabled ? {
          width: { ideal: 320, max: 640 },
          height: { ideal: 240, max: 480 },
          frameRate: { ideal: 30 }
        } : false,
        audio: isAudioEnabled ? {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } : false,
      };

      console.log('🎥 MEDIA STEP 1: Requesting user media permissions');
      console.log('CompactVideo: Requesting user media with constraints:', constraints);
      console.log('🎥 PERMISSIONS REQUIRED:', {
        video: isVideoEnabled ? 'YES - Camera needed' : 'NO - Camera disabled',
        audio: isAudioEnabled ? 'YES - Microphone needed' : 'NO - Microphone disabled'
      });

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('✅ MEDIA STEP 2: User granted media permissions successfully!');
      console.log('CompactVideo: Got user media stream:', {
        videoTracks: stream.getVideoTracks().length,
        audioTracks: stream.getAudioTracks().length,
        streamId: stream.id
      });

      setVideoState(prev => ({ ...prev, localStream: stream, isActive: true }));
      console.log('✅ MEDIA STEP 3: Local video state updated with stream');

      // Display local video
      if (localVideoRef.current) {
        console.log('🎥 MEDIA STEP 4: Setting up local video element');
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.play().catch(err => {
          console.warn('❌ CompactVideo: Error playing local video:', err);
        });
        console.log('✅ LOCAL VIDEO SHOULD NOW BE VISIBLE IN YOUR AVATAR');
      } else {
        console.warn('❌ Local video ref not available');
      }

      // Set up Supabase channel
      const channelName = `video-${sessionId}`;
      const videoChannel = supabase.channel(channelName, {
        config: { presence: { key: user?.id } },
      });

      videoChannel
        .on('broadcast', { event: 'video-signal' }, ({ payload }: { payload: VideoCallSignal }) => {
          handleVideoSignal(payload);
        })
        .on('presence', { event: 'sync' }, () => {
          const presenceState = videoChannel.presenceState();
          updateVideoParticipants(presenceState);
        })
        .on('presence', { event: 'join' }, ({ key }) => {
          if (key !== user?.id && !peerConnections.current.has(key)) {
            createPeerConnection(key);
          }
        })
        .on('presence', { event: 'leave' }, ({ key }) => {
          cleanupPeerConnection(key);
        });      await videoChannel.subscribe(async (status) => {        if (status === 'SUBSCRIBED') {
          console.log('CompactVideo: Successfully subscribed to video channel');
          // User tracking will be handled by the join/leave useEffect
        }
      });

      channel.current = videoChannel;      console.log('CompactVideo: Initialization completed');
      
    } catch (error: any) {
      console.error('CompactVideo: Error initializing:', error);
      
      // Provide user-friendly error messages based on error type
      let errorMessage = 'Failed to start video call';      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorMessage = 'Camera/microphone access denied. Please allow permissions and try again.';
        setShowFallbackOptions(true);
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        errorMessage = 'No camera or microphone found. Please connect a device and try again.';
      } else if (error.name === 'NotSupportedError') {
        errorMessage = 'Your browser does not support video calls. Please use Chrome, Firefox, or Safari.';
      } else if (error.name === 'NotReadableError') {
        errorMessage = 'Camera/microphone is in use by another application. Please close other apps and try again.';
      } else if (error.name === 'OverconstrainedError') {
        errorMessage = 'Camera settings not supported. Try again with different settings.';
      } else if (error.message) {
        errorMessage = `Failed to start video: ${error.message}`;
      }
      
      setError(errorMessage);
    } finally {
      isInitializing.current = false;
    }
  }, [sessionId, user?.id, isVideoEnabled, isAudioEnabled]);
  // Try to join with fallback options when permissions are denied
  const tryFallbackOptions = async () => {
    setError(null);
    setShowFallbackOptions(false);
    isInitializing.current = true;

    try {
      // Try audio only first
      console.log('CompactVideo: Trying audio-only fallback...');
      let stream = null;
      
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: false, 
          audio: isAudioEnabled 
        });
        console.log('CompactVideo: Got audio-only stream');
        setIsVideoEnabled(false); // Disable video since we don't have permission
      } catch (audioError) {
        console.log('CompactVideo: Audio also denied, joining without media...');
        // Join without any media stream - user can still see others and use text chat
        stream = null;
        setIsVideoEnabled(false);
        setIsAudioEnabled(false);
      }

      // Set up the video conference even without local stream
      setVideoState(prev => ({ ...prev, localStream: stream || undefined, isActive: true }));

      // Set up Supabase channel for signaling even without media
      const channelName = `video-${sessionId}`;
      const videoChannel = supabase.channel(channelName, {
        config: { presence: { key: user?.id } },
      });

      videoChannel
        .on('broadcast', { event: 'video-signal' }, ({ payload }: { payload: VideoCallSignal }) => {
          handleVideoSignal(payload);
        })
        .on('presence', { event: 'sync' }, () => {
          const presenceState = videoChannel.presenceState();
          updateVideoParticipants(presenceState);
        })
        .on('presence', { event: 'join' }, ({ key }) => {
          if (key !== user?.id && !peerConnections.current.has(key)) {
            createPeerConnection(key);
          }
        })
        .on('presence', { event: 'leave' }, ({ key }) => {
          cleanupPeerConnection(key);
        });

      await videoChannel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          const displayName = getUserDisplayName(user);          await videoChannel.track({
            user_id: user?.id,
            user_name: displayName,
            user_role: currentUser?.role || 'Team Member',
            video_enabled: false, // No video in fallback mode
            audio_enabled: !!stream && stream.getAudioTracks().length > 0,
          });
        }
      });

      channel.current = videoChannel;
      console.log('CompactVideo: Fallback initialization completed');

    } catch (error: any) {
      console.error('CompactVideo: Fallback failed:', error);
      setError('Unable to join video call. Please check your browser settings and try again.');
    } finally {
      isInitializing.current = false;
    }
  };
  // Handle video signals with full WebRTC implementation
  const handleVideoSignal = async (signal: VideoCallSignal) => {
    if (signal.from === user?.id) {
      console.log('CompactVideo: Ignoring own signal');
      return; // Ignore own signals
    }

    console.log('CompactVideo: Processing signal:', signal.type, 'from:', signal.from);
    
    let peerConnection = peerConnections.current.get(signal.from);
    
    // Create peer connection if it doesn't exist
    if (!peerConnection && signal.type === 'offer') {
      console.log('CompactVideo: Creating new peer connection for offer from:', signal.from);
      peerConnection = createPeerConnection(signal.from);
    }
    
    if (!peerConnection) {
      console.warn('CompactVideo: No peer connection found for:', signal.from);
      return;
    }

    try {
      const currentState = peerConnection.signalingState;
      console.log('CompactVideo: Peer connection state:', currentState, 'for signal type:', signal.type);
      
      switch (signal.type) {
        case 'offer':
          if (currentState === 'stable' || currentState === 'have-local-offer') {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(signal.data));
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            
            // Send answer back
            console.log('CompactVideo: Sending answer to:', signal.from);
            channel.current?.send({
              type: 'broadcast',
              event: 'video-signal',
              payload: {
                type: 'answer',
                from: user?.id,
                to: signal.from,
                data: answer,
                sessionId,
              },
            });
          } else {
            console.warn('CompactVideo: Received offer in wrong state:', currentState);
          }
          break;

        case 'answer':
          if (currentState === 'have-local-offer') {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(signal.data));
            console.log('CompactVideo: Answer processed successfully');
          } else {
            console.warn('CompactVideo: Received answer in wrong state:', currentState);
          }
          break;

        case 'ice-candidate':
          if (peerConnection.remoteDescription) {
            await peerConnection.addIceCandidate(new RTCIceCandidate(signal.data));
            console.log('CompactVideo: ICE candidate added');
          } else {
            console.warn('CompactVideo: Received ICE candidate before remote description');
          }
          break;
      }
    } catch (error) {
      console.error('CompactVideo: Error handling video signal:', error);
    }  };

  // Update participants based on presence state
  const updateVideoParticipants = (presenceState: any) => {
    console.log('🎥 PARTICIPANTS UPDATE: Processing presence state:', presenceState);
    
    const allPresences = Object.values(presenceState).flat();
    console.log('🎥 All presences:', allPresences.map((p: any) => ({
      id: p.user_id,
      name: p.user_name,
      role: p.user_role,
      videoEnabled: p.video_enabled,
      audioEnabled: p.audio_enabled,
      inVideoCall: p.in_video_call
    })));
    
    // Filter to only include participants who are actually in the video call
    const videoParticipants = allPresences
      .filter((presence: any) => presence.in_video_call === true)
      .map((presence: any) => ({
        id: presence.user_id,
        name: presence.user_name,
        role: presence.user_role || 'Team Member',
        isVideoEnabled: presence.video_enabled !== false, // Default to true if not specified
        isAudioEnabled: presence.audio_enabled !== false, // Default to true if not specified
        stream: undefined,
        peerConnection: undefined,
      }));
    
    console.log('🎥 PARTICIPANTS UPDATE: Video call participants:', videoParticipants.map(p => ({
      id: p.id,
      name: p.name,
      role: p.role,
      videoEnabled: p.isVideoEnabled,
      audioEnabled: p.isAudioEnabled
    })));
    
    setParticipants(videoParticipants);
    
    // Auto-terminate video call if no participants remain
    if (videoParticipants.length === 0 && isActive) {
      console.log('CompactVideo: No video participants remaining, auto-terminating video call');
      setTimeout(() => {
        onToggle(); // This will terminate the video call
      }, 1000); // Small delay to ensure cleanup completes
    }
  };
    
    console.log('🎥 PARTICIPANTS UPDATE: Video call participants:', videoParticipants.map(p => ({
      id: p.id,
      name: p.name,
      role: p.role,
      videoEnabled: p.isVideoEnabled,
      audioEnabled: p.isAudioEnabled
    })));
    
    setParticipants(videoParticipants);
    
    // Auto-terminate video call if no participants remain
    if (videoParticipants.length === 0 && isActive) {
      console.log('CompactVideo: No video participants remaining, auto-terminating video call');
      setTimeout(() => {
        onToggle(); // This will terminate the video call
      }, 1000); // Small delay to ensure cleanup completes
    }
  };
  // Create peer connection with full WebRTC implementation
  const createPeerConnection = (participantId: string) => {
    console.log('CompactVideo: Creating peer connection for:', participantId);
    
    // Check if peer connection already exists
    if (peerConnections.current.has(participantId)) {
      console.log('CompactVideo: Peer connection already exists for:', participantId);
      return peerConnections.current.get(participantId)!;
    }
    
    const peerConnection = new RTCPeerConnection(rtcConfig);
    
    // Add local stream to peer connection
    if (videoState.localStream) {
      console.log('CompactVideo: Adding local tracks to peer connection');
      videoState.localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, videoState.localStream!);
      });
    }

    // Monitor connection state
    peerConnection.onconnectionstatechange = () => {
      console.log(`CompactVideo: Connection state for ${participantId}:`, peerConnection.connectionState);
    };

    // Monitor ICE connection state
    peerConnection.oniceconnectionstatechange = () => {
      console.log(`CompactVideo: ICE connection state for ${participantId}:`, peerConnection.iceConnectionState);
    };

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate && channel.current) {
        console.log('CompactVideo: Sending ICE candidate to:', participantId);
        channel.current.send({
          type: 'broadcast',
          event: 'video-signal',
          payload: {
            type: 'ice-candidate',
            from: user?.id,
            to: participantId,
            data: event.candidate,
            sessionId,
          },
        });
      }
    };    // Handle remote stream
    peerConnection.ontrack = (event) => {
      console.log('🎥 REMOTE STEP 1: Received remote track from participant:', participantId);
      const [remoteStream] = event.streams;
      console.log('🎥 REMOTE STEP 2: Remote stream details:', {
        participantId,
        streamId: remoteStream.id,
        videoTracks: remoteStream.getVideoTracks().length,
        audioTracks: remoteStream.getAudioTracks().length
      });
      
      // Update participants with the remote stream
      setParticipants(prev => {
        console.log('🎥 REMOTE STEP 3: Updating participant with remote stream');
        const updatedParticipants = prev.map(p =>
          p.id === participantId
            ? { ...p, stream: remoteStream, peerConnection }
            : p
        );
        console.log('✅ REMOTE STEP 4: REMOTE PARTICIPANT SHOULD NOW APPEAR IN VIDEO AVATARS');
        console.log('Updated participants:', updatedParticipants.map(p => ({
          id: p.id,
          name: p.name,
          hasStream: !!p.stream
        })));
        return updatedParticipants;
      });
    };

    peerConnections.current.set(participantId, peerConnection);

    // Create offer if we have local stream
    if (videoState.localStream) {
      console.log('CompactVideo: Creating offer for:', participantId);
      peerConnection.createOffer().then(async (offer) => {
        if (peerConnection.signalingState === 'stable') {
          await peerConnection.setLocalDescription(offer);
          console.log('CompactVideo: Sending offer to:', participantId);
          channel.current?.send({
            type: 'broadcast',
            event: 'video-signal',
            payload: {
              type: 'offer',
              from: user?.id,
              to: participantId,
              data: offer,
              sessionId,
            },
          });
        }
      }).catch(error => {
        console.error('CompactVideo: Error creating offer:', error);
      });
    }

    return peerConnection;
  };
  // Cleanup peer connection
  const cleanupPeerConnection = (participantId: string) => {
    console.log('CompactVideo: Cleaning up peer connection for:', participantId);
    const pc = peerConnections.current.get(participantId);
    if (pc) {
      pc.close();
      peerConnections.current.delete(participantId);
    }
    
    // Remove participant from list
    setParticipants(prev => prev.filter(p => p.id !== participantId));
  };

  // Toggle video
  const toggleVideo = () => {
    if (videoState.localStream) {
      const videoTrack = videoState.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !isVideoEnabled;
        setIsVideoEnabled(!isVideoEnabled);
      }
    }
  };

  // Toggle audio
  const toggleAudio = () => {
    if (videoState.localStream) {
      const audioTrack = videoState.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !isAudioEnabled;
        setIsAudioEnabled(!isAudioEnabled);
      }
    }
  };

  // End call
  const endCall = () => {
    if (cleanupInProgress.current) return;
    cleanupInProgress.current = true;

    console.log('CompactVideo: Ending call...');

    // Stop local stream
    if (videoState.localStream) {
      videoState.localStream.getTracks().forEach(track => track.stop());
    }

    // Close peer connections
    peerConnections.current.forEach(pc => pc.close());
    peerConnections.current.clear();

    // Leave channel
    if (channel.current) {
      channel.current.unsubscribe();
      channel.current = null;
    }

    setVideoState({
      isActive: false,
      participants: [],
      isVideoEnabled: true,
      isAudioEnabled: true,
      isScreenSharing: false,
    });

    setParticipants([]);
    setError(null);
    onToggle(); // Close video call
    
    setTimeout(() => {
      cleanupInProgress.current = false;
    }, 100);
  };  // Handle user leaving video call
  const handleUserLeaveVideoCall = async () => {
    if (channel.current) {
      try {
        // Untrack from video presence
        await channel.current.untrack();
        console.log('CompactVideo: User untracked from video presence');
      } catch (error) {
        console.error('CompactVideo: Error untracking user:', error);
      }
    }
  };
  // Track user in video presence
  const trackUserInVideoPresence = async () => {
    if (channel.current) {
      try {
        console.log('🎥 PRESENCE STEP 1: Tracking user in video presence');
        const displayName = getUserDisplayName(user);
        console.log('🎥 PRESENCE STEP 2: User details for tracking:', {
          userId: user?.id,
          displayName,
          role: currentUser?.role,
          videoEnabled: isVideoEnabled,
          audioEnabled: isAudioEnabled,
          sessionId
        });
        
        await channel.current.track({
          user_id: user?.id,
          user_name: displayName,
          user_role: currentUser?.role || 'Team Member',
          video_enabled: isVideoEnabled,
          audio_enabled: isAudioEnabled,
          in_video_call: true, // Flag to indicate user is in video call
          video_call_session: sessionId, // Track which session they're in
          joined_video_at: new Date().toISOString()
        });
        console.log('✅ PRESENCE STEP 3: User tracked in video presence with video call flags');
        console.log('🎥 USER SHOULD NOW APPEAR IN PARTICIPANT LIST WITH VIDEO CALL INDICATORS');
      } catch (error) {
        console.error('❌ CompactVideo: Error tracking user:', error);
      }
    } else {
      console.error('❌ No channel available for presence tracking');
    }
  };// Helper function to get initiator info from presence or other sources
  const getInitiatorInfo = useCallback(() => {
    if (!initiatorId) return null;
    
    // Try to get from current presence state first
    if (channel.current) {
      try {
        const presenceState = channel.current.presenceState();
        const allPresences = Object.values(presenceState).flat();
        const initiator = allPresences.find((p: any) => p.user_id === initiatorId) as any;
        
        if (initiator) {
          return {
            id: initiatorId,
            name: initiator.user_name || 'Unknown User',
            role: initiator.user_role || 'Team Member',
            isInCall: true,
          };
        }
      } catch (e) {
        console.warn('CompactVideo: Error getting presence state:', e);
      }
    }
    
    // Try to get from WebRTC participants list
    const participant = participants.find(p => p.id === initiatorId);
    if (participant) {
      return {
        id: initiatorId,
        name: participant.name || 'Unknown User',
        role: participant.role || 'Team Member',
        isInCall: true,
      };
    }
    
    // Final fallback: return basic info
    return {
      id: initiatorId,
      name: 'Call Initiator',
      role: 'Team Member',
      isInCall: true,
    };
  }, [initiatorId, participants]);
  // Helper function to check if initiator should be shown as a placeholder
  const shouldShowInitiatorPlaceholder = useCallback(() => {
    // Must have an active call with a known initiator
    if (!isActive || !initiatorId) return false;
    
    // Don't show if the current user has joined the call (they'll see real participants)
    if (hasUserJoined) return false;
    
    // Don't show if the initiator is the current user
    if (initiatorId === user?.id) return false;
    
    // Show the placeholder! When a user hasn't joined the call yet,
    // they should see who started it, regardless of WebRTC connection status
    return true;
  }, [isActive, initiatorId, hasUserJoined, user?.id]);
  // Debug effect to track initiator visibility
  useEffect(() => {
    console.log('CompactVideo: Props and state check:', {
      isActive,
      initiatorId,
      hasUserJoined,
      currentUserId: user?.id,
      remoteParticipantsCount: getRemoteParticipants().length,
      shouldShowPlaceholder: shouldShowInitiatorPlaceholder(),
      allParticipants: participants.map(p => ({ id: p.id, name: p.name }))
    });
    
    if (isActive && initiatorId) {
      console.log('CompactVideo: Call active with initiator:', {
        initiatorId,
        hasUserJoined,
        shouldShowPlaceholder: shouldShowInitiatorPlaceholder(),
        remoteParticipants: getRemoteParticipants().length,
        initiatorInfo: getInitiatorInfo()
      });
    }  }, [isActive, initiatorId, hasUserJoined, participants.length, shouldShowInitiatorPlaceholder, getInitiatorInfo]);

  // Initialize when activated and user has joined
  useEffect(() => {
    if (isActive && hasUserJoined && !videoState.isActive) {
      initializeVideoConference();
    }
  }, [isActive, hasUserJoined, initializeVideoConference]);

  // Handle local video stream connection
  useEffect(() => {
    if (videoState.localStream && localVideoRef.current) {
      console.log('CompactVideo: Connecting local stream to video element');
      const videoElement = localVideoRef.current;
      videoElement.srcObject = videoState.localStream;
      
      videoElement.play().catch(err => {
        console.warn('CompactVideo: Error playing local video:', err);
      });
    }
  }, [videoState.localStream]);
  // Handle user join/leave status changes
  useEffect(() => {
    if (isActive && hasUserJoined && channel.current) {
      // User has joined the video call
      trackUserInVideoPresence();
    } else if (isActive && !hasUserJoined && channel.current) {
      // User has left the video call while it's still active
      handleUserLeaveVideoCall();
    }
  }, [hasUserJoined, isActive]);

  // Don't render anything if not active
  if (!isActive) {
    return null;
  }
  return (
    <div className="mb-4">
      {/* Video Controls Navigation Bar */}
      <div className="bg-gray-800 text-white px-4 py-2 rounded-t-lg flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium">
            Video Call Active
            {initiatorId && initiatorId !== user?.id && (() => {
              const initiator = getInitiatorInfo();
              const initiatorName = initiator?.name || 
                                  getRemoteParticipants().find(p => p.id === initiatorId)?.name || 
                                  'someone';
              return (
                <span className="ml-2 text-xs text-gray-300">(started by {initiatorName})</span>
              );
            })()}          </span>
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${videoState.isActive ? 'bg-green-400' : 'bg-yellow-400'}`}></div>
            <span className="text-xs text-gray-300">
              {(() => {
                let count = participants.length;
                // Add initiator to count if they're not already in participants and we're showing the placeholder
                if (shouldShowInitiatorPlaceholder()) {
                  // Check if initiator is not already counted in participants
                  const initiatorInParticipants = participants.some(p => p.id === initiatorId);
                  if (!initiatorInParticipants) {
                    count += 1;
                  }
                }
                return count;
              })()} in call
              {!hasUserJoined && ' - Click "Join Video Call" to participate'}
            </span>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {/* Video Toggle */}
          <button
            onClick={toggleVideo}
            disabled={!hasUserJoined}
            className={`p-2 rounded-lg transition-colors ${
              !hasUserJoined 
                ? 'bg-gray-600 opacity-50 cursor-not-allowed'
                : isVideoEnabled 
                ? 'bg-gray-700 hover:bg-gray-600' 
                : 'bg-red-600 hover:bg-red-700'
            }`}
            title={!hasUserJoined ? 'Join the call to control video' : isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
          >
            {isVideoEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
          </button>
          
          {/* Audio Toggle */}
          <button
            onClick={toggleAudio}
            disabled={!hasUserJoined}
            className={`p-2 rounded-lg transition-colors ${
              !hasUserJoined 
                ? 'bg-gray-600 opacity-50 cursor-not-allowed'
                : isAudioEnabled 
                ? 'bg-gray-700 hover:bg-gray-600' 
                : 'bg-red-600 hover:bg-red-700'
            }`}
            title={!hasUserJoined ? 'Join the call to control audio' : isAudioEnabled ? 'Mute microphone' : 'Unmute microphone'}
          >
            {isAudioEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
          </button>
          
          {/* Settings */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            disabled={!hasUserJoined}
            className={`p-2 rounded-lg transition-colors ${
              !hasUserJoined 
                ? 'bg-gray-600 opacity-50 cursor-not-allowed'
                : 'bg-gray-700 hover:bg-gray-600'
            }`}
            title={!hasUserJoined ? 'Join the call to access settings' : 'Video settings'}
          >
            <Settings className="h-4 w-4" />
          </button>
          
          {/* End Call */}
          <button
            onClick={endCall}
            className="p-2 rounded-lg bg-red-600 hover:bg-red-700 transition-colors"
            title="End video call"
          >
            <PhoneOff className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Video Participants Row */}
      <div className="bg-gray-100 p-4 rounded-b-lg border-x border-b border-gray-200">        {error && (
          <div className="mb-3 p-3 bg-red-100 border border-red-300 rounded text-red-700 text-sm">
            <div className="font-medium mb-1">Video Call Error</div>
            <div className="mb-2">{error}</div>
            {showFallbackOptions && (
              <div className="flex gap-2 mt-2">
                <button
                  onClick={tryFallbackOptions}
                  className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                >
                  Try Audio Only
                </button>
                <button
                  onClick={() => {
                    setError(null);
                    setShowFallbackOptions(false);
                  }}
                  className="px-3 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}
          <div className="flex items-center space-x-4 overflow-x-auto pb-2">
          {/* Local Video Circle - Only show if user has joined */}
          {hasUserJoined && (
            <div className="flex-shrink-0 relative">
              <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-800 border-2 border-blue-500">
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                  style={{ transform: 'scaleX(-1)' }}
                />
                {!isVideoEnabled && (
                  <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                    <VideoOff className="h-6 w-6 text-gray-400" />
                  </div>
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1">
                <div className={`w-3 h-3 rounded-full ${isAudioEnabled ? 'bg-green-400' : 'bg-red-400'}`}></div>
              </div>            <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-center">
                <div className="text-xs text-gray-600 whitespace-nowrap font-medium">
                  You
                  <span className="ml-1 text-blue-500">🎥</span>
                </div>
                <div className="text-xs text-blue-600 whitespace-nowrap font-bold">
                  In Video Call
                </div>
              </div>
            </div>
          )}

          {/* Show message when call is active but user hasn't joined */}
          {!hasUserJoined && (
            <div className="flex-shrink-0 relative">
              <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-100 border-2 border-dashed border-gray-400 flex items-center justify-center">
                <Video className="h-6 w-6 text-gray-400" />
              </div>
              <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-center">
                <div className="text-xs text-gray-500 whitespace-nowrap">
                  Click "Join Video Call" to participate
                </div>
              </div>
            </div>
          )}          {/* Remote Video Circles */}
          {getRemoteParticipants().map((participant) => {
            console.log('🎥 RENDER: Rendering participant:', participant.id, participant.name, 'hasStream:', !!participant.stream);
            return (
            <div key={participant.id} className="flex-shrink-0 relative">
              <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-800 border-2 border-green-400">                {participant.stream ? (
                  <video
                    ref={(video) => {
                      if (video && participant.stream) {
                        video.srcObject = participant.stream;
                        video.play().catch(err => {
                          console.warn('CompactVideo: Error playing remote video:', err);
                        });
                      }
                    }}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />                ) : (
                  <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                    <span className="text-white font-medium text-lg">
                      {getUserInitials(participant.name || 'Anonymous')}
                    </span>
                  </div>
                )}{!participant.isVideoEnabled && (
                  <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                    <VideoOff className="h-6 w-6 text-gray-400" />
                  </div>
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1">
                <div className={`w-3 h-3 rounded-full ${participant.isAudioEnabled ? 'bg-green-400' : 'bg-red-400'}`}></div>
              </div>              <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-center">
                <div className="text-xs text-gray-600 whitespace-nowrap font-medium">
                  {participant.name || 'Anonymous'}
                  <span className="ml-1 text-green-500">🎥</span>
                </div>
                <div className="text-xs text-green-600 whitespace-nowrap font-bold">                  In Video Call
                </div>
              </div>
            </div>
            );
          })}

          {/* Show initiator placeholder when call is active but user hasn't joined */}
          {shouldShowInitiatorPlaceholder() && (() => {
            const initiator = getInitiatorInfo();
            if (!initiator) return null;
            
            return (
              <div key={`initiator-${initiator.id}`} className="flex-shrink-0 relative">
                <div className="w-16 h-16 rounded-full overflow-hidden bg-blue-600 border-2 border-blue-400">
                  <div className="w-full h-full bg-blue-600 flex items-center justify-center">
                    <span className="text-white font-medium text-lg">
                      {getUserInitials(initiator.name)}
                    </span>
                  </div>
                  {/* Video call active indicator */}
                  <div className="absolute inset-0 bg-blue-800 bg-opacity-30 flex items-center justify-center">
                    <Video className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1">
                  <div className="w-3 h-3 rounded-full bg-green-400"></div>
                </div>
                <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-center">
                  <div className="text-xs text-gray-600 whitespace-nowrap font-medium">
                    {initiator.name}
                    <span className="ml-1 text-blue-500">🎥</span>
                  </div>
                  <div className="text-xs text-gray-500 whitespace-nowrap">
                    {initiator.role} • In Call
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Placeholder for joining participants */}
          {getRemoteParticipants().length === 0 && hasUserJoined && (
            <div className="flex-shrink-0 text-center">
              <div className="w-16 h-16 rounded-full bg-gray-200 border-2 border-dashed border-gray-400 flex items-center justify-center">
                <span className="text-gray-500 text-xs">Waiting</span>
              </div>
              <div className="text-xs text-gray-500 mt-1">for others</div>
            </div>
          )}
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="mt-4 p-3 bg-white rounded-lg border border-gray-300">
            <h4 className="font-medium text-gray-900 mb-2">Video Settings</h4>
            <div className="space-y-2 text-sm">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={isVideoEnabled}
                  onChange={toggleVideo}
                  className="rounded border-gray-300"
                />
                <span className="ml-2">Enable Camera</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={isAudioEnabled}
                  onChange={toggleAudio}
                  className="rounded border-gray-300"
                />
                <span className="ml-2">Enable Microphone</span>
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
