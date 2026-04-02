import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BadgeCheck, Clock3, Globe2, Languages, Link2, Mic, Wifi, WifiOff } from "lucide-react";
import { ChatPanel } from "./components/ChatPanel";
import { ControlBar } from "./components/ControlBar";
import { PreferencePanel } from "./components/PreferencePanel";
import { SessionHistory } from "./components/SessionHistory";
import { VideoPanel } from "./components/VideoPanel";
import { EVENTS } from "./constants/events";
import { LANGUAGE_OPTIONS, LANGUAGE_TO_BCP47 } from "./constants/options";
import { useNotificationSound } from "./hooks/useNotificationSound";
import { useSpeechSubtitles } from "./hooks/useSpeechSubtitles";
import { useWebRTC } from "./hooks/useWebRTC";
import { createSocketClient } from "./services/socketClient";
import { useChatStore } from "./store/useChatStore";
import { getOrCreateSessionId } from "./utils/session";

const formatDuration = (seconds = 0) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${`${secs}`.padStart(2, "0")}`;
};

const extractTokenFromInput = (value = "") => {
  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  if (trimmed.includes("join=")) {
    try {
      const parsed = new URL(trimmed);
      return parsed.searchParams.get("join") || "";
    } catch (_error) {
      return trimmed;
    }
  }

  return trimmed;
};

const App = () => {
  const {
    sessionId,
    socketId,
    connectionStatus,
    statusText,
    inQueue,
    roomId,
    chatStartedAt,
    partner,
    partnerConnected,
    messages,
    reactions,
    partnerTyping,
    latestSubtitle,
    icebreakerSuggestions,
    activeSessionSummary,
    sessionLink,
    preferences,
    sessionHistory,
    darkMode,
    setSessionId,
    setSocketId,
    setConnectionStatus,
    setStatusText,
    setQueueState,
    setPartnerConnected,
    setPartnerMatch,
    addMessage,
    addReaction,
    pruneReactions,
    setPartnerTyping,
    setLatestSubtitle,
    setIcebreakerSuggestions,
    setActiveSessionSummary,
    setSessionLink,
    updatePreferences,
    archiveCurrentSession,
    resetCurrentMatch,
    toggleDarkMode
  } = useChatStore();

  const [socket, setSocket] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [messageInput, setMessageInput] = useState("");
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(false);
  const [joinToken, setJoinToken] = useState("");
  const [conversationSeconds, setConversationSeconds] = useState(0);
  const typingTimeoutRef = useRef(null);
  const joinTokenHandledRef = useRef(false);

  const timezone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || "Unknown",
    []
  );

  const { play } = useNotificationSound();

  useEffect(() => {
    if (!sessionId) {
      setSessionId(getOrCreateSessionId());
    }
  }, [sessionId, setSessionId]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  useEffect(() => {
    if (!sessionId) {
      return;
    }

    const socketInstance = createSocketClient(sessionId);
    setSocket(socketInstance);

    const onConnect = () => {
      setConnectionStatus("connected");
      setStatusText("Connected. Press Start Chat to join the queue.");
    };

    const onDisconnect = () => {
      setConnectionStatus("disconnected");
      setPartnerConnected(false);
      setQueueState(false);
      setStatusText("Disconnected from server. Try reconnect.");
    };

    const onConnectionReady = ({ socketId: incomingSocketId }) => {
      setSocketId(incomingSocketId);

      if (joinTokenHandledRef.current) {
        return;
      }

      const fromQuery = new URLSearchParams(window.location.search).get("join");

      if (fromQuery) {
        joinTokenHandledRef.current = true;
        socketInstance.emit(EVENTS.USER_JOIN_SESSION_LINK, {
          token: fromQuery
        });
      }
    };

    const onQueueWaiting = ({ message }) => {
      setQueueState(true);
      setStatusText(message || "Searching for a match...");
    };

    const onMatchFound = ({ roomId: matchedRoomId, partner: matchedPartner, history, startedAt, joinedViaLink }) => {
      setPartnerMatch({
        roomId: matchedRoomId,
        partner: matchedPartner,
        history,
        startedAt
      });

      setStatusText(
        joinedViaLink
          ? `Connected via invite link with ${matchedPartner.alias}`
          : `Matched with ${matchedPartner.alias}`
      );
      play("match");
    };

    const onMatchEnded = ({ reason }) => {
      archiveCurrentSession(reason || "ended");
      resetCurrentMatch();
      setStatusText(`Chat ended (${reason || "unknown"}). Looking for another match...`);
    };

    const onPartnerStatus = ({ connected }) => {
      setPartnerConnected(Boolean(connected));
    };

    const onChatMessage = (message) => {
      addMessage(message);
      setPartnerTyping(false);
      setIcebreakerSuggestions([]);

      if (!message.isSelf) {
        play("message");
      }
    };

    const onTyping = ({ isTyping }) => {
      setPartnerTyping(Boolean(isTyping));
    };

    const onSubtitle = (subtitle) => {
      setLatestSubtitle(subtitle);
    };

    const onIcebreaker = ({ suggestions }) => {
      setIcebreakerSuggestions(suggestions || []);
      setStatusText("AI icebreakers are ready to kickstart the conversation.");
    };

    const onReaction = (reaction) => {
      addReaction(reaction);
      if (!reaction.isSelf) {
        play("message");
      }
    };

    const onSummary = ({ summary }) => {
      setActiveSessionSummary(summary);
      setStatusText(summary);
    };

    const onSessionLinkCreated = ({ link }) => {
      setSessionLink(link);
      setStatusText("Session link created. Share it with a friend before it expires.");
    };

    const onSessionLinkError = ({ message }) => {
      setStatusText(message || "Session link action failed.");
    };

    const onWarning = ({ message }) => {
      setStatusText(message || "Moderation warning.");
      play("warning");
    };

    const onRateLimit = ({ message }) => {
      setStatusText(message || "Rate limited.");
      play("warning");
    };

    const onReportReceived = () => {
      setStatusText("Report submitted. You have been moved to a new match queue.");
    };

    socketInstance.on("connect", onConnect);
    socketInstance.on("disconnect", onDisconnect);
    socketInstance.on(EVENTS.CONNECTION_READY, onConnectionReady);
    socketInstance.on(EVENTS.QUEUE_WAITING, onQueueWaiting);
    socketInstance.on(EVENTS.MATCH_FOUND, onMatchFound);
    socketInstance.on(EVENTS.MATCH_ENDED, onMatchEnded);
    socketInstance.on(EVENTS.PARTNER_STATUS, onPartnerStatus);
    socketInstance.on(EVENTS.CHAT_MESSAGE, onChatMessage);
    socketInstance.on(EVENTS.CHAT_TYPING, onTyping);
    socketInstance.on(EVENTS.SUBTITLE_UPDATE, onSubtitle);
    socketInstance.on(EVENTS.ICEBREAKER_SUGGESTION, onIcebreaker);
    socketInstance.on(EVENTS.CHAT_REACTION, onReaction);
    socketInstance.on(EVENTS.SESSION_SUMMARY, onSummary);
    socketInstance.on(EVENTS.SESSION_LINK_CREATED, onSessionLinkCreated);
    socketInstance.on(EVENTS.SESSION_LINK_ERROR, onSessionLinkError);
    socketInstance.on(EVENTS.CHAT_WARNING, onWarning);
    socketInstance.on(EVENTS.CHAT_RATE_LIMIT, onRateLimit);
    socketInstance.on(EVENTS.REPORT_RECEIVED, onReportReceived);

    socketInstance.connect();

    return () => {
      socketInstance.removeAllListeners();
      socketInstance.disconnect();
      setSocket(null);
    };
  }, [
    sessionId,
    setConnectionStatus,
    setStatusText,
    setPartnerConnected,
    setQueueState,
    setSocketId,
    setPartnerMatch,
    addMessage,
    addReaction,
    setPartnerTyping,
    setLatestSubtitle,
    setIcebreakerSuggestions,
    setActiveSessionSummary,
    setSessionLink,
    archiveCurrentSession,
    resetCurrentMatch,
    play
  ]);

  useEffect(() => {
    if (!socket?.connected) {
      return;
    }

    socket.emit(EVENTS.USER_UPDATE_PREFERENCES, preferences);
  }, [socket, preferences]);

  useEffect(() => {
    if (!socket) {
      return;
    }

    const heartbeat = setInterval(() => {
      if (socket.connected) {
        socket.emit(EVENTS.USER_HEARTBEAT);
      }
    }, 20000);

    return () => clearInterval(heartbeat);
  }, [socket]);

  useEffect(() => {
    const cleanup = setInterval(() => {
      pruneReactions();
    }, 700);

    return () => clearInterval(cleanup);
  }, [pruneReactions]);

  const activeMatch = Boolean(partner?.socketId && roomId);

  useEffect(() => {
    if (!activeMatch || !chatStartedAt) {
      setConversationSeconds(0);
      return;
    }

    const refresh = () => {
      const elapsed = Math.max(0, Math.floor((Date.now() - chatStartedAt) / 1000));
      setConversationSeconds(elapsed);
    };

    refresh();
    const timer = setInterval(refresh, 1000);
    return () => clearInterval(timer);
  }, [activeMatch, chatStartedAt]);

  const buildConstraints = useCallback(() => {
    return {
      audio: true,
      video: preferences.voiceOnly ? false : true
    };
  }, [preferences.voiceOnly]);

  const ensureLocalMedia = useCallback(async () => {
    const hasVideoTrack = Boolean(localStream?.getVideoTracks?.().length);

    if (localStream && hasVideoTrack !== !preferences.voiceOnly) {
      localStream.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
    } else if (localStream) {
      return localStream;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia(buildConstraints());
      setLocalStream(stream);
      return stream;
    } catch (_error) {
      setStatusText("Camera/microphone access denied. Text chat still works.");
      return null;
    }
  }, [localStream, preferences.voiceOnly, buildConstraints, setStatusText]);

  useEffect(() => {
    if (!activeMatch) {
      return;
    }

    ensureLocalMedia();
  }, [preferences.voiceOnly, activeMatch, ensureLocalMedia]);

  const emitJoinQueue = useCallback(() => {
    if (!socket) {
      return;
    }

    socket.emit(EVENTS.USER_UPDATE_PREFERENCES, preferences);
    socket.emit(EVENTS.USER_JOIN_QUEUE, preferences);
    setQueueState(true);
    setStatusText("Searching for your next best match...");
  }, [socket, preferences, setQueueState, setStatusText]);

  const handleStart = useCallback(async () => {
    await ensureLocalMedia();

    if (!socket) {
      return;
    }

    if (!socket.connected) {
      setConnectionStatus("connecting");

      const onConnect = () => {
        emitJoinQueue();
      };

      socket.once("connect", onConnect);
      socket.connect();
      return;
    }

    emitJoinQueue();
  }, [socket, ensureLocalMedia, setConnectionStatus, emitJoinQueue]);

  const handleNext = useCallback(() => {
    if (!socket) {
      return;
    }

    socket.emit(EVENTS.USER_NEXT);
  }, [socket]);

  const handleReport = useCallback(() => {
    if (!socket || !partner) {
      return;
    }

    socket.emit(EVENTS.USER_REPORT, {
      reason: "manual-report"
    });
  }, [socket, partner]);

  const handleRate = useCallback(
    (value) => {
      if (!socket || !activeMatch) {
        return;
      }

      socket.emit(EVENTS.USER_RATE, { value });
      setStatusText(value > 0 ? "Thanks for your positive rating." : "Rating saved.");
    },
    [socket, activeMatch, setStatusText]
  );

  const handleReconnect = useCallback(() => {
    if (!socket) {
      return;
    }

    if (socket.connected) {
      socket.disconnect();
    }

    socket.connect();
    socket.once("connect", () => {
      socket.emit(EVENTS.USER_RECONNECT);
      socket.emit(EVENTS.USER_UPDATE_PREFERENCES, preferences);
      setStatusText("Reconnected. You can continue chatting.");
    });
  }, [socket, preferences, setStatusText]);

  const handleSendMessage = useCallback(
    (overrideText) => {
      if (!socket || !roomId) {
        return;
      }

      const text = typeof overrideText === "string" ? overrideText : messageInput;
      const trimmed = text.trim();

      if (!trimmed) {
        return;
      }

      socket.emit(EVENTS.CHAT_MESSAGE, {
        text: trimmed
      });

      socket.emit(EVENTS.CHAT_TYPING, {
        isTyping: false
      });

      setMessageInput("");
      setIcebreakerSuggestions([]);
    },
    [socket, roomId, messageInput, setIcebreakerSuggestions]
  );

  const handleMessageInput = useCallback(
    (value) => {
      setMessageInput(value);

      if (!socket || !roomId) {
        return;
      }

      socket.emit(EVENTS.CHAT_TYPING, {
        isTyping: value.length > 0
      });

      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit(EVENTS.CHAT_TYPING, {
          isTyping: false
        });
      }, 900);
    },
    [socket, roomId]
  );

  const handleSendReaction = useCallback(
    (emoji) => {
      if (!socket || !activeMatch) {
        return;
      }

      socket.emit(EVENTS.USER_SEND_REACTION, { emoji });
    },
    [socket, activeMatch]
  );

  const handleCreateSessionLink = useCallback(() => {
    if (!socket) {
      return;
    }

    socket.emit(EVENTS.USER_CREATE_SESSION_LINK);
  }, [socket]);

  const handleJoinByLink = useCallback(() => {
    if (!socket) {
      return;
    }

    const token = extractTokenFromInput(joinToken);

    if (!token) {
      setStatusText("Enter a valid session token or link.");
      return;
    }

    socket.emit(EVENTS.USER_JOIN_SESSION_LINK, { token });
  }, [socket, joinToken, setStatusText]);

  const { remoteStream, connectionState } = useWebRTC({
    socket,
    selfSocketId: socketId,
    partnerSocketId: partner?.socketId,
    localStream,
    activeMatch
  });

  const subtitleLanguage = useMemo(
    () => LANGUAGE_TO_BCP47[preferences.language] || "en-US",
    [preferences.language]
  );

  const handleTranscript = useCallback(
    (transcript) => {
      if (!socket || !activeMatch) {
        return;
      }

      socket.emit(EVENTS.SUBTITLE_CHUNK, {
        transcript,
        sourceLanguage: preferences.language
      });
    },
    [socket, activeMatch, preferences.language]
  );

  const { supported: subtitlesSupported, listening, startListening, stopListening } = useSpeechSubtitles(
    {
      language: subtitleLanguage,
      onTranscript: handleTranscript
    }
  );

  useEffect(() => {
    if (subtitlesEnabled && activeMatch) {
      startListening();
      return;
    }

    stopListening();
  }, [subtitlesEnabled, activeMatch, startListening, stopListening]);

  useEffect(() => {
    return () => {
      stopListening();
      clearTimeout(typingTimeoutRef.current);
      localStream?.getTracks().forEach((track) => track.stop());
    };
  }, [stopListening, localStream]);

  const languageLabel = useMemo(() => {
    const selected = LANGUAGE_OPTIONS.find((item) => item.value === preferences.language);
    return selected?.label || preferences.language;
  }, [preferences.language]);

  const remoteSubtitle = latestSubtitle && !latestSubtitle.isSelf ? latestSubtitle : null;
  const localReactions = reactions.filter((reaction) => reaction.isSelf);
  const remoteReactions = reactions.filter((reaction) => !reaction.isSelf);

  return (
    <div className="mx-auto min-h-screen max-w-[1600px] px-4 py-6 md:px-6">
      <header className="mb-5 rounded-2xl border border-white/10 bg-white/70 p-4 shadow-glow backdrop-blur-xl dark:bg-ink-900/60">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Omegle Next Global
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300">{statusText}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/80 px-3 py-1 text-slate-700 dark:bg-ink-800/80 dark:text-slate-200">
              {connectionStatus === "connected" ? (
                <Wifi className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <WifiOff className="h-3.5 w-3.5 text-rose-400" />
              )}
              {connectionStatus}
            </span>

            <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/80 px-3 py-1 text-slate-700 dark:bg-ink-800/80 dark:text-slate-200">
              <Languages className="h-3.5 w-3.5 text-aqua-400" />
              {languageLabel}
            </span>

            <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/80 px-3 py-1 text-slate-700 dark:bg-ink-800/80 dark:text-slate-200">
              <Globe2 className="h-3.5 w-3.5 text-cyan-400" />
              {partner?.language && partner.language !== preferences.language
                ? `Language mismatch: ${partner.language}`
                : "Language aligned"}
            </span>

            <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/80 px-3 py-1 text-slate-700 dark:bg-ink-800/80 dark:text-slate-200">
              <BadgeCheck className="h-3.5 w-3.5 text-emerald-400" />
              Reputation {partner?.reputation ?? "--"}
            </span>

            <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/80 px-3 py-1 text-slate-700 dark:bg-ink-800/80 dark:text-slate-200">
              <Clock3 className="h-3.5 w-3.5 text-indigo-400" />
              {activeMatch ? `Chat ${formatDuration(conversationSeconds)}` : "No active chat"}
            </span>

            <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/80 px-3 py-1 text-slate-700 dark:bg-ink-800/80 dark:text-slate-200">
              <Globe2 className="h-3.5 w-3.5 text-teal-400" />
              {timezone}
            </span>

            <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/80 px-3 py-1 text-slate-700 dark:bg-ink-800/80 dark:text-slate-200">
              <Mic className="h-3.5 w-3.5 text-rose-400" />
              {preferences.voiceOnly ? "Voice-only" : "Video mode"}
            </span>

            {sessionLink && (
              <span className="inline-flex max-w-xs items-center gap-1 truncate rounded-full border border-white/20 bg-white/80 px-3 py-1 text-slate-700 dark:bg-ink-800/80 dark:text-slate-200">
                <Link2 className="h-3.5 w-3.5 text-violet-400" />
                {sessionLink}
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="grid gap-4 xl:grid-cols-[320px,1fr,420px]">
        <div className="space-y-4">
          <PreferencePanel
            preferences={preferences}
            onUpdatePreferences={updatePreferences}
            onStart={handleStart}
            isSearching={inQueue}
            darkMode={darkMode}
            onToggleTheme={toggleDarkMode}
            connectionStatus={connectionStatus}
            sessionLink={sessionLink}
            onCreateSessionLink={handleCreateSessionLink}
            joinToken={joinToken}
            onJoinTokenChange={setJoinToken}
            onJoinByLink={handleJoinByLink}
          />
          <SessionHistory sessionHistory={sessionHistory} />
        </div>

        <section className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <VideoPanel
              title="You"
              stream={localStream}
              muted
              subtitle={latestSubtitle?.isSelf ? latestSubtitle : null}
              status={connectionStatus === "connected" ? "connected" : "idle"}
              voiceOnly={preferences.voiceOnly}
              reactions={localReactions}
            />

            <VideoPanel
              title={partner ? partner.alias : "Stranger"}
              stream={remoteStream}
              subtitle={remoteSubtitle}
              status={partnerConnected ? connectionState : "connecting"}
              voiceOnly={Boolean(partner?.voiceOnly)}
              reactions={remoteReactions}
            />
          </div>

          <ControlBar
            onNext={handleNext}
            onReport={handleReport}
            onReconnect={handleReconnect}
            onToggleSubtitles={() => setSubtitlesEnabled((value) => !value)}
            subtitlesEnabled={subtitlesEnabled}
            subtitlesSupported={subtitlesSupported}
            listening={listening}
            disabled={!activeMatch}
            onSendReaction={handleSendReaction}
            onRate={handleRate}
            voiceOnly={preferences.voiceOnly}
          />
        </section>

        <div className="h-[560px] min-h-[420px]">
          <ChatPanel
            messages={messages}
            messageInput={messageInput}
            onMessageInput={handleMessageInput}
            onSendMessage={handleSendMessage}
            partnerTyping={partnerTyping}
            partnerLanguage={partner?.language}
            icebreakerSuggestions={icebreakerSuggestions}
            onUseIcebreaker={handleSendMessage}
            sessionSummary={activeSessionSummary}
          />
        </div>
      </main>
    </div>
  );
};

export default App;
