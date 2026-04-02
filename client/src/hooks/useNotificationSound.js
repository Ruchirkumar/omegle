import { useCallback, useRef } from "react";

export const useNotificationSound = () => {
  const audioContextRef = useRef(null);

  const ensureContext = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }

    return audioContextRef.current;
  };

  const play = useCallback((tone = "message") => {
    const context = ensureContext();
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();

    oscillator.type = "sine";

    if (tone === "match") {
      oscillator.frequency.value = 920;
    } else if (tone === "warning") {
      oscillator.frequency.value = 320;
    } else {
      oscillator.frequency.value = 680;
    }

    gainNode.gain.setValueAtTime(0.0001, context.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.12, context.currentTime + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.18);

    oscillator.connect(gainNode);
    gainNode.connect(context.destination);

    oscillator.start();
    oscillator.stop(context.currentTime + 0.2);
  }, []);

  return {
    play
  };
};
