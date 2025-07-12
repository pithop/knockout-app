import { useState, useEffect, useRef } from 'react';
import { 
  doc, getDoc, updateDoc, collection, 
  addDoc, onSnapshot, deleteDoc
} from 'firebase/firestore';
import { db } from './App';
import { XCircle } from 'lucide-react';

const VideoCall = ({ callData, user, onClose }) => {
  const [status, setStatus] = useState('Connecting...');
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnection = useRef(null);
  const localStream = useRef(null);
  
  useEffect(() => {
    const isCaller = callData.caller === user.uid;

    const initCall = async () => {
      try {
        peerConnection.current = new RTCPeerConnection({
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });

        // Get media stream
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: callData.type === 'video'
        });
        
        localStream.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // Add tracks to connection
        stream.getTracks().forEach(track => {
          peerConnection.current.addTrack(track, stream);
        });

        // Setup event handlers
        peerConnection.current.onicecandidate = handleICECandidate;
        peerConnection.current.ontrack = handleRemoteTrack;
        peerConnection.current.onconnectionstatechange = handleConnectionStateChange;

        if (isCaller) {
          await createOffer();
        } else {
          await answerCall();
        }

        setupCandidateExchange();

      } catch (error) {
        console.error('Call setup failed:', error);
        setStatus('Call failed. Please try again.');
      }
    };

    const createOffer = async () => {
      setStatus('Creating offer...');
      const offer = await peerConnection.current.createOffer();
      await peerConnection.current.setLocalDescription(offer);
      
      await updateDoc(doc(db, 'calls', callData.callId), {
        offer: {
          type: offer.type,
          sdp: offer.sdp
        }
      });
    };

    const answerCall = async () => {
      setStatus('Answering call...');
      const callDoc = await getDoc(doc(db, 'calls', callData.callId));
      const offer = callDoc.data().offer;
      
      await peerConnection.current.setRemoteDescription(
        new RTCSessionDescription(offer)
      );
      
      const answer = await peerConnection.current.createAnswer();
      await peerConnection.current.setLocalDescription(answer);
      
      await updateDoc(doc(db, 'calls', callData.callId), {
        answer: {
          type: answer.type,
          sdp: answer.sdp
        }
      });
    };

    const handleICECandidate = async (event) => {
      if (event.candidate) {
        const candidateColl = collection(
          db, 
          'calls', 
          callData.callId, 
          isCaller ? 'callerCandidates' : 'calleeCandidates'
        );
        
        await addDoc(candidateColl, event.candidate.toJSON());
      }
    };

    const handleRemoteTrack = (event) => {
      if (remoteVideoRef.current && !remoteVideoRef.current.srcObject) {
        remoteVideoRef.current.srcObject = event.streams[0];
        setStatus('Connected');
      }
    };

    const handleConnectionStateChange = () => {
      if (peerConnection.current) {
        setStatus(peerConnection.current.connectionState.charAt(0).toUpperCase() + 
                 peerConnection.current.connectionState.slice(1));
      }
    };

    const setupCandidateExchange = () => {
      const candidateColl = collection(
        db, 
        'calls', 
        callData.callId, 
        isCaller ? 'calleeCandidates' : 'callerCandidates'
      );
      
      onSnapshot(candidateColl, snapshot => {
        snapshot.docChanges().forEach(change => {
          if (change.type === 'added') {
            const candidate = new RTCIceCandidate(change.doc.data());
            peerConnection.current.addIceCandidate(candidate);
          }
        });
      });
    };

    initCall();

    return () => {
      if (peerConnection.current) {
        peerConnection.current.close();
      }
      if (localStream.current) {
        localStream.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [callData, user.uid]); // Fixed dependencies

  const handleEndCall = async () => {
    try {
      await deleteDoc(doc(db, 'calls', callData.callId));
    } catch (e) {
      console.error("Error ending call:", e);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex flex-col z-50">
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
        <div className="bg-gray-900 rounded-xl overflow-hidden relative">
          <video 
            ref={localVideoRef} 
            autoPlay 
            playsInline 
            muted 
            className="w-full h-full object-cover"
          />
          <div className="absolute top-4 left-4 bg-black/50 text-white px-3 py-1 rounded-lg">
            You
          </div>
        </div>
        
        <div className="bg-gray-900 rounded-xl overflow-hidden relative">
          {status !== 'Connected' ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="animate-pulse">
                  <div className="bg-gray-700 w-24 h-24 rounded-full mx-auto" />
                </div>
                <p className="mt-4 text-xl text-white">{status}</p>
              </div>
            </div>
          ) : (
            <video 
              ref={remoteVideoRef} 
              autoPlay 
              playsInline 
              className="w-full h-full object-cover"
            />
          )}
          <div className="absolute top-4 left-4 bg-black/50 text-white px-3 py-1 rounded-lg">
            {callData.opponent.username}
          </div>
        </div>
      </div>
      
      <div className="p-6 flex justify-center">
        <button 
          onClick={handleEndCall}
          className="bg-red-600 hover:bg-red-700 p-4 rounded-full shadow-lg"
        >
          <XCircle size={32} />
        </button>
      </div>
    </div>
  );
};

export default VideoCall;