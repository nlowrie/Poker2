import { useState, useEffect, useRef, useCallback } from 'react';
import { Video, VideoOff, Mic, MicOff, Monitor, PhoneOff, Users } from 'lucide-react';
import { VideoParticipant, VideoConferenceState, VideoCallSignal } from '../types';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';

interface VideoConferenceProps {
  sessionId: string;
  onClose?: () => void;
}

export default function VideoConference({ sessionId, onClose }: VideoConferenceProps) {
  const { user } = useAuth();
  const [videoState, setVideoState] = useState<VideoConferenceState>({
    isActive: false,
    participants: [],
    isVideoEnabled: true,
    isAudioEnabled: true,
    isScreenSharing: false,
  });
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const channel = useRef<any>(null);
  
  // WebRTC configuration with STUN servers
  const rtcConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
  };

  // Initialize video conference
  const initializeVideoConference = useCallback(async () => {
    try {
      // Get user media (camera and microphone)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: videoState.isVideoEnabled,
        audio: videoState.isAudioEnabled,
      });

      setVideoState(prev => ({ ...prev, localStream: stream, isActive: true }));

      // Display local video
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Set up Supabase real-time channel for video signaling
      const videoChannel = supabase.channel(`video-${sessionId}`, {
        config: { presence: { key: user?.id } },
      });

      // Handle video call signals
      videoChannel
        .on('broadcast', { event: 'video-signal' }, ({ payload }: { payload: VideoCallSignal }) => {
          handleVideoSignal(payload);
        })
        .on('presence', { event: 'sync' }, () => {
          const presenceState = videoChannel.presenceState();
          updateVideoParticipants(presenceState);
        })
        .on('presence', { event: 'join' }, ({ key, newPresences }) => {
          console.log('User joined video call:', key, newPresences);
          // Create peer connection for new user
          if (key !== user?.id) {
            createPeerConnection(key);
          }
        })
        .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
          console.log('User left video call:', key, leftPresences);
          // Clean up peer connection
          cleanupPeerConnection(key);
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            // Join video call presence
            await videoChannel.track({
              user_id: user?.id,
              user_name: user?.user_metadata?.full_name || 'Anonymous',
              video_enabled: videoState.isVideoEnabled,
              audio_enabled: videoState.isAudioEnabled,
            });
          }
        });

      channel.current = videoChannel;
    } catch (error) {
      console.error('Error initializing video conference:', error);
      alert('Failed to access camera/microphone. Please check permissions.');
    }
  }, [sessionId, user?.id, videoState.isVideoEnabled, videoState.isAudioEnabled]);

  // Handle video call signaling
  const handleVideoSignal = async (signal: VideoCallSignal) => {
    if (signal.from === user?.id) return; // Ignore own signals

    const peerConnection = peerConnections.current.get(signal.from);
    if (!peerConnection) return;

    try {
      switch (signal.type) {
        case 'offer':
          await peerConnection.setRemoteDescription(new RTCSessionDescription(signal.data));
          const answer = await peerConnection.createAnswer();
          await peerConnection.setLocalDescription(answer);
          
          // Send answer back
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
          break;

        case 'answer':
          await peerConnection.setRemoteDescription(new RTCSessionDescription(signal.data));
          break;

        case 'ice-candidate':
          await peerConnection.addIceCandidate(new RTCIceCandidate(signal.data));
          break;
      }
    } catch (error) {
      console.error('Error handling video signal:', error);
    }
  };

  // Create peer connection for a participant
  const createPeerConnection = (participantId: string) => {
    const peerConnection = new RTCPeerConnection(rtcConfig);
    
    // Add local stream to peer connection
    if (videoState.localStream) {
      videoState.localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, videoState.localStream!);
      });
    }

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        channel.current?.send({
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
    };

    // Handle remote stream
    peerConnection.ontrack = (event) => {
      const [remoteStream] = event.streams;
      setVideoState(prev => ({
        ...prev,
        participants: prev.participants.map(p =>
          p.id === participantId
            ? { ...p, stream: remoteStream }
            : p
        ),
      }));
    };

    peerConnections.current.set(participantId, peerConnection);

    // Create and send offer
    peerConnection.createOffer().then(async (offer) => {
      await peerConnection.setLocalDescription(offer);
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
    });

    return peerConnection;
  };

  // Clean up peer connection
  const cleanupPeerConnection = (participantId: string) => {
    const peerConnection = peerConnections.current.get(participantId);
    if (peerConnection) {
      peerConnection.close();
      peerConnections.current.delete(participantId);
    }
    
    setVideoState(prev => ({
      ...prev,
      participants: prev.participants.filter(p => p.id !== participantId),
    }));
  };

  // Update video participants from presence
  const updateVideoParticipants = (presenceState: any) => {
    const videoParticipants: VideoParticipant[] = [];
    
    Object.entries(presenceState).forEach(([userId, presences]: [string, any]) => {
      if (userId !== user?.id && presences.length > 0) {
        const presence = presences[0];
        videoParticipants.push({
          id: userId,
          name: presence.user_name,
          role: 'Team Member', // Could be enhanced to get actual role
          isVideoEnabled: presence.video_enabled,
          isAudioEnabled: presence.audio_enabled,
        });
      }
    });

    setVideoState(prev => ({
      ...prev,
      participants: videoParticipants,
    }));
  };

  // Toggle video
  const toggleVideo = () => {
    if (videoState.localStream) {
      const videoTrack = videoState.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoState.isVideoEnabled;
        setVideoState(prev => ({ ...prev, isVideoEnabled: !prev.isVideoEnabled }));
        
        // Broadcast video state change
        channel.current?.send({
          type: 'broadcast',
          event: 'video-signal',
          payload: {
            type: 'toggle-video',
            from: user?.id,
            data: { videoEnabled: !videoState.isVideoEnabled },
            sessionId,
          },
        });
      }
    }
  };

  // Toggle audio
  const toggleAudio = () => {
    if (videoState.localStream) {
      const audioTrack = videoState.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !videoState.isAudioEnabled;
        setVideoState(prev => ({ ...prev, isAudioEnabled: !prev.isAudioEnabled }));
        
        // Broadcast audio state change
        channel.current?.send({
          type: 'broadcast',
          event: 'video-signal',
          payload: {
            type: 'toggle-audio',
            from: user?.id,
            data: { audioEnabled: !videoState.isAudioEnabled },
            sessionId,
          },
        });
      }
    }
  };

  // Start screen sharing
  const toggleScreenShare = async () => {
    try {
      if (!videoState.isScreenSharing) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });
        
        // Replace video track in all peer connections
        const videoTrack = screenStream.getVideoTracks()[0];
        peerConnections.current.forEach(async (pc) => {
          const sender = pc.getSenders().find(s => s.track?.kind === 'video');
          if (sender) {
            await sender.replaceTrack(videoTrack);
          }
        });

        // Update local video
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }

        setVideoState(prev => ({ ...prev, isScreenSharing: true }));

        // Stop screen sharing when user stops it
        videoTrack.onended = () => {
          toggleScreenShare();
        };
      } else {
        // Switch back to camera
        const videoTrack = videoState.localStream?.getVideoTracks()[0];
        if (videoTrack) {
          peerConnections.current.forEach(async (pc) => {
            const sender = pc.getSenders().find(s => s.track?.kind === 'video');
            if (sender) {
              await sender.replaceTrack(videoTrack);
            }
          });
        }

        if (localVideoRef.current && videoState.localStream) {
          localVideoRef.current.srcObject = videoState.localStream;
        }

        setVideoState(prev => ({ ...prev, isScreenSharing: false }));
      }
    } catch (error) {
      console.error('Error toggling screen share:', error);
    }
  };

  // End video call
  const endCall = () => {
    // Stop local stream
    if (videoState.localStream) {
      videoState.localStream.getTracks().forEach(track => track.stop());
    }

    // Close all peer connections
    peerConnections.current.forEach(pc => pc.close());
    peerConnections.current.clear();

    // Leave channel
    if (channel.current) {
      channel.current.unsubscribe();
    }

    setVideoState({
      isActive: false,
      participants: [],
      isVideoEnabled: true,
      isAudioEnabled: true,
      isScreenSharing: false,
    });

    onClose?.();
  };

  // Initialize video on component mount
  useEffect(() => {
    if (!videoState.isActive) {
      initializeVideoConference();
    }

    // Cleanup on unmount
    return () => {
      endCall();
    };
  }, []);

  if (!videoState.isActive) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Video className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Starting video conference...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 text-white min-h-screen">
      {/* Header */}
      <div className="bg-gray-800 p-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Users className="h-5 w-5" />
          <span className="font-medium">Planning Poker Video Call</span>
          <span className="text-gray-400">
            ({videoState.participants.length + 1} participants)
          </span>
        </div>
        <button
          onClick={endCall}
          className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
        >
          <PhoneOff className="h-4 w-4" />
          <span>End Call</span>
        </button>
      </div>

      {/* Video Grid */}
      <div className="flex-1 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-4">
          {/* Local Video */}
          <div className="relative bg-gray-800 rounded-lg overflow-hidden aspect-video">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 px-2 py-1 rounded text-sm">
              You {videoState.isScreenSharing && '(Screen)'}
            </div>
            <div className="absolute top-2 right-2 flex space-x-1">
              {!videoState.isVideoEnabled && (
                <div className="bg-red-600 p-1 rounded-full">
                  <VideoOff className="h-3 w-3" />
                </div>
              )}
              {!videoState.isAudioEnabled && (
                <div className="bg-red-600 p-1 rounded-full">
                  <MicOff className="h-3 w-3" />
                </div>
              )}
            </div>
          </div>

          {/* Remote Videos */}
          {videoState.participants.map((participant) => (
            <RemoteVideo key={participant.id} participant={participant} />
          ))}
        </div>

        {/* Controls */}
        <div className="flex justify-center space-x-4">
          <button
            onClick={toggleAudio}
            className={`p-3 rounded-full transition-colors ${
              videoState.isAudioEnabled
                ? 'bg-gray-700 hover:bg-gray-600'
                : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {videoState.isAudioEnabled ? (
              <Mic className="h-5 w-5" />
            ) : (
              <MicOff className="h-5 w-5" />
            )}
          </button>

          <button
            onClick={toggleVideo}
            className={`p-3 rounded-full transition-colors ${
              videoState.isVideoEnabled
                ? 'bg-gray-700 hover:bg-gray-600'
                : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {videoState.isVideoEnabled ? (
              <Video className="h-5 w-5" />
            ) : (
              <VideoOff className="h-5 w-5" />
            )}
          </button>

          <button
            onClick={toggleScreenShare}
            className={`p-3 rounded-full transition-colors ${
              videoState.isScreenSharing
                ? 'bg-blue-600 hover:bg-blue-700'
                : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            <Monitor className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// Remote Video Component
function RemoteVideo({ participant }: { participant: VideoParticipant }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && participant.stream) {
      videoRef.current.srcObject = participant.stream;
    }
  }, [participant.stream]);

  return (
    <div className="relative bg-gray-800 rounded-lg overflow-hidden aspect-video">
      {participant.stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />
      ) : (        <div className="w-full h-full flex items-center justify-center">
          <div className="text-center">
            <div className="w-20 h-20 bg-gray-600 rounded-full flex items-center justify-center mx-auto mb-2">
              <span className="text-2xl font-bold text-white">
                {participant.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <p className="text-sm text-gray-300">{participant.name}</p>
          </div>
        </div>
      )}
      
      <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 px-2 py-1 rounded text-sm">
        {participant.name}
      </div>
      
      <div className="absolute top-2 right-2 flex space-x-1">
        {!participant.isVideoEnabled && (
          <div className="bg-red-600 p-1 rounded-full">
            <VideoOff className="h-3 w-3" />
          </div>
        )}
        {!participant.isAudioEnabled && (
          <div className="bg-red-600 p-1 rounded-full">
            <MicOff className="h-3 w-3" />
          </div>
        )}
      </div>
    </div>
  );
}
