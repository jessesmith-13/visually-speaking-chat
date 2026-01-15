import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Video, VideoOff, Mic, MicOff, PhoneOff } from 'lucide-react';
import { Button } from '@/ui/button';
import { supabase } from '@/lib/supabase/client';

interface WebRTCVideoChatProps {
  roomId: string;
  userId: string;
  userName: string;
  onLeave: () => void;
}

interface SignalingMessage {
  type: 'offer' | 'answer' | 'ice-candidate';
  data: RTCSessionDescriptionInit | RTCIceCandidateInit;
  from: string;
}

export function WebRTCVideoChat({ roomId, userId, userName, onLeave }: WebRTCVideoChatProps) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(false); // Start muted for deaf users
  const [connectionState, setConnectionState] = useState<string>('connecting');
  const [error, setError] = useState<string>('');

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const signalingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // WebRTC configuration with STUN servers - memoize to prevent re-creating on every render
  const rtcConfig: RTCConfiguration = useMemo(() => ({
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
    ],
  }), []);

  // Send signaling message via Supabase Realtime
  const sendSignalingMessage = useCallback((message: SignalingMessage) => {
    if (signalingChannelRef.current) {
      signalingChannelRef.current.send({
        type: 'broadcast',
        event: 'signaling',
        payload: message,
      });
    }
  }, []);

  // Set up Supabase Realtime for signaling
  const setupSignalingChannel = useCallback(async (peerConnection: RTCPeerConnection) => {
    const channel = supabase.channel(`webrtc-room-${roomId}`);

    channel
      .on('broadcast', { event: 'signaling' }, async (payload) => {
        const message: SignalingMessage = payload.payload;

        // Ignore our own messages
        if (message.from === userId) return;

        console.log('📨 Received signaling message:', message.type);

        try {
          if (message.type === 'offer') {
            // Received an offer, create answer
            await peerConnection.setRemoteDescription(new RTCSessionDescription(message.data as RTCSessionDescriptionInit));
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            
            sendSignalingMessage({
              type: 'answer',
              data: answer,
              from: userId,
            });
          } else if (message.type === 'answer') {
            // Received an answer
            await peerConnection.setRemoteDescription(new RTCSessionDescription(message.data as RTCSessionDescriptionInit));
          } else if (message.type === 'ice-candidate') {
            // Received ICE candidate
            await peerConnection.addIceCandidate(new RTCIceCandidate(message.data as RTCIceCandidateInit));
          }
        } catch (err) {
          console.error('❌ Error handling signaling message:', err);
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Signaling channel subscribed');
          signalingChannelRef.current = channel;

          // Create and send offer
          const offer = await peerConnection.createOffer();
          await peerConnection.setLocalDescription(offer);
          
          sendSignalingMessage({
            type: 'offer',
            data: offer,
            from: userId,
          });
        }
      });
  }, [roomId, userId, sendSignalingMessage]);

  // Initialize WebRTC peer connection
  const initializePeerConnection = useCallback(async (stream: MediaStream) => {
    try {
      console.log('🔗 Initializing peer connection...');
      
      // Create peer connection
      const peerConnection = new RTCPeerConnection(rtcConfig);
      peerConnectionRef.current = peerConnection;

      // Add local stream tracks to peer connection
      stream.getTracks().forEach(track => {
        peerConnection.addTrack(track, stream);
      });

      // Handle remote stream
      peerConnection.ontrack = (event) => {
        console.log('📹 Received remote track:', event.track.kind);
        const [remoteStream] = event.streams;
        setRemoteStream(remoteStream);
        
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
        }
      };

      // Handle ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('🧊 Sending ICE candidate');
          sendSignalingMessage({
            type: 'ice-candidate',
            data: event.candidate,
            from: userId,
          });
        }
      };

      // Handle connection state changes
      peerConnection.onconnectionstatechange = () => {
        console.log('🔌 Connection state:', peerConnection.connectionState);
        setConnectionState(peerConnection.connectionState);
      };

      // Set up signaling channel via Supabase Realtime
      await setupSignalingChannel(peerConnection);

    } catch (err) {
      const error = err as Error;
      console.error('❌ Error initializing peer connection:', error);
      setError(`Connection failed: ${error.message}`);
    }
  }, [rtcConfig, userId, sendSignalingMessage, setupSignalingChannel]);

  // Initialize media stream
  useEffect(() => {
    let stream: MediaStream;

    const initializeMedia = async () => {
      try {
        console.log('🎥 Requesting camera access...');
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: true, // Request audio but start muted
        });

        console.log('✅ Camera access granted');
        setLocalStream(stream);

        // Mute audio by default
        stream.getAudioTracks().forEach(track => {
          track.enabled = false;
        });

        // Display local video
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // Initialize WebRTC connection
        await initializePeerConnection(stream);
      } catch (err) {
        const error = err as Error;
        console.error('❌ Error accessing media devices:', error);
        setError(`Camera access denied: ${error.message}`);
      }
    };

    initializeMedia();

    return () => {
      // Cleanup
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
      if (signalingChannelRef.current) {
        supabase.removeChannel(signalingChannelRef.current);
      }
    };
  }, [initializePeerConnection]);

  // Toggle video
  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  };

  // Toggle audio
  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
  };

  // Handle leave
  const handleLeave = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }
    onLeave();
  };

  if (error) {
    return (
      <div className="aspect-video bg-gray-900 rounded-lg flex items-center justify-center">
        <div className="text-center px-4">
          <p className="text-red-400 mb-4">{error}</p>
          <Button onClick={handleLeave} variant="destructive">
            Leave Room
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Video Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Remote Video (Partner) */}
        <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
          {!remoteStream && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="size-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Video className="size-8 text-gray-400" />
                </div>
                <p className="text-gray-400 text-sm">
                  {connectionState === 'connected' ? 'Waiting for partner...' : 'Connecting...'}
                </p>
              </div>
            </div>
          )}
          <div className="absolute top-4 left-4 bg-black/60 px-3 py-1 rounded-full text-sm">
            Partner
          </div>
        </div>

        {/* Local Video (You) */}
        <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover mirror"
          />
          {!isVideoEnabled && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
              <div className="text-center">
                <div className="size-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-2">
                  <VideoOff className="size-8 text-gray-400" />
                </div>
                <p className="text-gray-400 text-sm">Camera Off</p>
              </div>
            </div>
          )}
          <div className="absolute top-4 left-4 bg-black/60 px-3 py-1 rounded-full text-sm">
            {userName}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4">
        <Button
          size="lg"
          variant={isVideoEnabled ? 'default' : 'destructive'}
          onClick={toggleVideo}
          className="h-14 w-14 rounded-full"
        >
          {isVideoEnabled ? <Video className="size-6" /> : <VideoOff className="size-6" />}
        </Button>

        <Button
          size="lg"
          variant={isAudioEnabled ? 'default' : 'destructive'}
          onClick={toggleAudio}
          className="h-14 w-14 rounded-full"
        >
          {isAudioEnabled ? <Mic className="size-6" /> : <MicOff className="size-6" />}
        </Button>

        <Button
          size="lg"
          variant="destructive"
          onClick={handleLeave}
          className="h-14 w-14 rounded-full"
        >
          <PhoneOff className="size-6" />
        </Button>
      </div>

      {/* Connection Status */}
      <div className="text-center text-sm text-gray-400">
        {connectionState === 'connecting' && '🔄 Connecting...'}
        {connectionState === 'connected' && '✅ Connected'}
        {connectionState === 'disconnected' && '❌ Disconnected'}
        {connectionState === 'failed' && '❌ Connection Failed'}
      </div>

      <style>{`
        .mirror {
          transform: scaleX(-1);
        }
      `}</style>
    </div>
  );
}