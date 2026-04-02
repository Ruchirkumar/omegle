import { useEffect, useRef, useState } from "react";
import { EVENTS } from "../constants/events";

const getIceConfig = () => {
  const servers = [{ urls: "stun:stun.l.google.com:19302" }];

  const turnUrl = import.meta.env.VITE_TURN_URL;
  const turnUsername = import.meta.env.VITE_TURN_USERNAME;
  const turnCredential = import.meta.env.VITE_TURN_CREDENTIAL;

  if (turnUrl && turnUsername && turnCredential) {
    servers.push({
      urls: turnUrl,
      username: turnUsername,
      credential: turnCredential
    });
  }

  return {
    iceServers: servers
  };
};

export const useWebRTC = ({ socket, selfSocketId, partnerSocketId, localStream, activeMatch }) => {
  const peerRef = useRef(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [connectionState, setConnectionState] = useState("new");

  useEffect(() => {
    if (!socket || !selfSocketId || !partnerSocketId || !localStream || !activeMatch) {
      if (peerRef.current) {
        peerRef.current.close();
        peerRef.current = null;
      }

      setRemoteStream(null);
      setConnectionState("new");
      return;
    }

    const peer = new RTCPeerConnection(getIceConfig());
    peerRef.current = peer;

    localStream.getTracks().forEach((track) => {
      peer.addTrack(track, localStream);
    });

    peer.ontrack = (event) => {
      const [stream] = event.streams;
      if (stream) {
        setRemoteStream(stream);
      }
    };

    peer.onicecandidate = (event) => {
      if (!event.candidate) {
        return;
      }

      socket.emit(EVENTS.WEBRTC_ICE, {
        targetSocketId: partnerSocketId,
        candidate: event.candidate
      });
    };

    peer.onconnectionstatechange = () => {
      setConnectionState(peer.connectionState);
    };

    const onOffer = async ({ fromSocketId, offer }) => {
      if (fromSocketId !== partnerSocketId) {
        return;
      }

      try {
        await peer.setRemoteDescription(offer);
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);

        socket.emit(EVENTS.WEBRTC_ANSWER, {
          targetSocketId: partnerSocketId,
          answer
        });
      } catch (_error) {
        setConnectionState("failed");
      }
    };

    const onAnswer = async ({ fromSocketId, answer }) => {
      if (fromSocketId !== partnerSocketId) {
        return;
      }

      try {
        await peer.setRemoteDescription(answer);
      } catch (_error) {
        setConnectionState("failed");
      }
    };

    const onIceCandidate = async ({ fromSocketId, candidate }) => {
      if (fromSocketId !== partnerSocketId || !candidate) {
        return;
      }

      try {
        await peer.addIceCandidate(candidate);
      } catch (_error) {
        setConnectionState("failed");
      }
    };

    socket.on(EVENTS.WEBRTC_OFFER, onOffer);
    socket.on(EVENTS.WEBRTC_ANSWER, onAnswer);
    socket.on(EVENTS.WEBRTC_ICE, onIceCandidate);

    const shouldInitiate = selfSocketId.localeCompare(partnerSocketId) < 0;

    if (shouldInitiate) {
      setTimeout(async () => {
        if (!peerRef.current) {
          return;
        }

        try {
          const offer = await peer.createOffer();
          await peer.setLocalDescription(offer);
          socket.emit(EVENTS.WEBRTC_OFFER, {
            targetSocketId: partnerSocketId,
            offer
          });
        } catch (_error) {
          setConnectionState("failed");
        }
      }, 150);
    }

    return () => {
      socket.off(EVENTS.WEBRTC_OFFER, onOffer);
      socket.off(EVENTS.WEBRTC_ANSWER, onAnswer);
      socket.off(EVENTS.WEBRTC_ICE, onIceCandidate);

      if (peerRef.current) {
        peerRef.current.close();
        peerRef.current = null;
      }

      setRemoteStream(null);
      setConnectionState("new");
    };
  }, [socket, selfSocketId, partnerSocketId, localStream, activeMatch]);

  return {
    remoteStream,
    connectionState
  };
};
