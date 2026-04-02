import { useCallback, useMemo, useRef, useState } from "react";

export const useSpeechSubtitles = ({ language = "en-US", onTranscript }) => {
  const recognitionRef = useRef(null);
  const [listening, setListening] = useState(false);

  const supported = useMemo(
    () => Boolean(window.SpeechRecognition || window.webkitSpeechRecognition),
    []
  );

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }

    setListening(false);
  }, []);

  const startListening = useCallback(() => {
    if (!supported || listening) {
      return;
    }

    const RecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!RecognitionClass) {
      return;
    }

    const recognition = new RecognitionClass();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = language;

    recognition.onresult = (event) => {
      const latest = event.results[event.results.length - 1];
      const transcript = latest[0]?.transcript?.trim();

      if (transcript) {
        onTranscript?.(transcript);
      }
    };

    recognition.onerror = () => {
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }, [language, listening, onTranscript, supported]);

  return {
    supported,
    listening,
    startListening,
    stopListening
  };
};
