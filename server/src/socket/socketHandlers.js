import { v4 as uuidv4 } from "uuid";
import { env } from "../config/env.js";
import { EVENTS } from "./events.js";

const ALLOWED_REACTIONS = new Set(["??", "??", "??", "??"]);

export const registerSocketHandlers = ({
  io,
  matchmakingService,
  moderationService,
  translationService,
  subtitleService,
  profileService,
  icebreakerService,
  summaryService,
  sessionLinkService
}) => {
  const socketMessageBuckets = new Map();
  const roomLastMessageAt = new Map();
  const roomLastIcebreakerAt = new Map();

  const emitQueueWaiting = (socketId) => {
    io.to(socketId).emit(EVENTS.QUEUE_WAITING, {
      message: "Searching for the best match...",
      queuedAt: Date.now()
    });
  };

  const sendMatchPayload = (match, metadata = {}) => {
    const [socketA, socketB] = match.participants;
    const history = matchmakingService.getRoomHistory(match.roomId);

    roomLastMessageAt.set(match.roomId, Date.now());
    roomLastIcebreakerAt.delete(match.roomId);

    io.to(socketA).emit(EVENTS.MATCH_FOUND, {
      roomId: match.roomId,
      partner: matchmakingService.getPartnerSummary(socketA, socketB),
      history,
      startedAt: match.createdAt || Date.now(),
      joinedViaLink: Boolean(metadata.joinedViaLink)
    });

    io.to(socketB).emit(EVENTS.MATCH_FOUND, {
      roomId: match.roomId,
      partner: matchmakingService.getPartnerSummary(socketB, socketA),
      history,
      startedAt: match.createdAt || Date.now(),
      joinedViaLink: Boolean(metadata.joinedViaLink)
    });

    io.to(socketA).emit(EVENTS.PARTNER_STATUS, { connected: true });
    io.to(socketB).emit(EVENTS.PARTNER_STATUS, { connected: true });
  };

  const runMatchmaking = () => {
    const matches = matchmakingService.tryMatchmake();
    matches.forEach((match) => sendMatchPayload(match));
  };

  const canSendMessage = (socketId) => {
    const now = Date.now();
    const bucket = socketMessageBuckets.get(socketId) || [];
    const recent = bucket.filter((timestamp) => now - timestamp <= env.socketMessageWindowMs);

    if (recent.length >= env.socketMessageLimit) {
      socketMessageBuckets.set(socketId, recent);
      return false;
    }

    recent.push(now);
    socketMessageBuckets.set(socketId, recent);
    return true;
  };

  const forwardWebRtcSignal = (socket, eventName, payload = {}) => {
    const partnerId = matchmakingService.getPartner(socket.id);

    if (!partnerId || payload.targetSocketId !== partnerId) {
      return;
    }

    io.to(partnerId).emit(eventName, {
      fromSocketId: socket.id,
      ...payload
    });
  };

  const requeueSocket = (socketId) => {
    if (!io.sockets.sockets.get(socketId)) {
      return;
    }

    matchmakingService.enqueue(socketId);
    emitQueueWaiting(socketId);
  };

  const emitSessionSummary = (roomId, recipients = []) => {
    if (!roomId || recipients.length === 0) {
      return;
    }

    const history = matchmakingService.getRoomHistory(roomId);

    if (history.length === 0) {
      return;
    }

    const summary = summaryService.summarize(history);

    for (const recipient of recipients) {
      io.to(recipient).emit(EVENTS.SESSION_SUMMARY, {
        roomId,
        summary,
        createdAt: Date.now()
      });
    }
  };

  const cleanupRoomState = (roomId) => {
    roomLastMessageAt.delete(roomId);
    roomLastIcebreakerAt.delete(roomId);
  };

  const breakCurrentMatch = ({ socketId, reason = "next" }) => {
    const endedMatch = matchmakingService.endMatch(socketId, reason);

    if (!endedMatch) {
      requeueSocket(socketId);
      runMatchmaking();
      return;
    }

    emitSessionSummary(endedMatch.roomId, [socketId, endedMatch.partnerId]);

    io.to(socketId).emit(EVENTS.MATCH_ENDED, { reason });

    io.to(endedMatch.partnerId).emit(EVENTS.MATCH_ENDED, {
      reason: reason === "reported" ? "partner-reported" : "partner-next"
    });

    io.to(endedMatch.partnerId).emit(EVENTS.PARTNER_STATUS, { connected: false });

    cleanupRoomState(endedMatch.roomId);

    requeueSocket(socketId);
    requeueSocket(endedMatch.partnerId);
    runMatchmaking();
  };

  const maybeEmitIcebreaker = (pair) => {
    const now = Date.now();
    const lastMessageAt = roomLastMessageAt.get(pair.roomId) || matchmakingService.getRoomStartedAt(pair.roomId);
    const lastIcebreakerAt = roomLastIcebreakerAt.get(pair.roomId) || 0;

    if (!lastMessageAt || now - lastMessageAt < env.icebreakerIdleMs) {
      return;
    }

    if (now - lastIcebreakerAt < env.icebreakerCooldownMs) {
      return;
    }

    const prefsA = matchmakingService.getPreferences(pair.socketA);
    const prefsB = matchmakingService.getPreferences(pair.socketB);

    const suggestions = icebreakerService.getSuggestions({
      moodA: prefsA.mood,
      moodB: prefsB.mood,
      regionA: prefsA.region,
      regionB: prefsB.region
    });

    if (!suggestions.length) {
      return;
    }

    io.to(pair.socketA).emit(EVENTS.ICEBREAKER_SUGGESTION, {
      roomId: pair.roomId,
      suggestions,
      createdAt: now
    });

    io.to(pair.socketB).emit(EVENTS.ICEBREAKER_SUGGESTION, {
      roomId: pair.roomId,
      suggestions,
      createdAt: now
    });

    roomLastIcebreakerAt.set(pair.roomId, now);
  };

  setInterval(() => {
    sessionLinkService.cleanup();
    const pairs = matchmakingService.getUniqueActivePairs();

    for (const pair of pairs) {
      maybeEmitIcebreaker(pair);

      const socketAInactive = matchmakingService.hasBeenInactive(pair.socketA);
      const socketBInactive = matchmakingService.hasBeenInactive(pair.socketB);

      if (!socketAInactive && !socketBInactive) {
        continue;
      }

      const inactiveSocketId = socketAInactive ? pair.socketA : pair.socketB;
      const activeSocketId = socketAInactive ? pair.socketB : pair.socketA;

      const ended = matchmakingService.endMatch(inactiveSocketId, "inactive");

      if (!ended) {
        continue;
      }

      emitSessionSummary(ended.roomId, [inactiveSocketId, activeSocketId]);

      io.to(inactiveSocketId).emit(EVENTS.MATCH_ENDED, {
        reason: "inactive-timeout"
      });

      io.to(activeSocketId).emit(EVENTS.MATCH_ENDED, {
        reason: "partner-inactive"
      });

      cleanupRoomState(ended.roomId);
      requeueSocket(activeSocketId);
    }

    runMatchmaking();
  }, env.queueSweepMs).unref();

  io.on("connection", (socket) => {
    const sessionFromAuth = socket.handshake.auth?.sessionId;
    const sessionId = sessionFromAuth?.trim() || uuidv4();

    matchmakingService.registerSocket(socket.id, sessionId);

    const profile = profileService.getOrCreate(sessionId);

    socket.emit(EVENTS.CONNECTION_READY, {
      socketId: socket.id,
      sessionId,
      reputation: profile.reputation
    });

    socket.on(EVENTS.USER_UPDATE_PREFERENCES, (payload = {}) => {
      matchmakingService.updatePreferences(socket.id, payload);
      matchmakingService.touch(socket.id);
    });

    socket.on(EVENTS.USER_JOIN_QUEUE, (payload = {}) => {
      matchmakingService.updatePreferences(socket.id, payload);
      matchmakingService.enqueue(socket.id);
      emitQueueWaiting(socket.id);
      runMatchmaking();
    });

    socket.on(EVENTS.USER_RECONNECT, () => {
      matchmakingService.touch(socket.id);
      if (!matchmakingService.isMatched(socket.id)) {
        matchmakingService.enqueue(socket.id);
        emitQueueWaiting(socket.id);
        runMatchmaking();
      }
    });

    socket.on(EVENTS.USER_HEARTBEAT, () => {
      matchmakingService.touch(socket.id);
    });

    socket.on(EVENTS.USER_CREATE_SESSION_LINK, () => {
      if (matchmakingService.isMatched(socket.id)) {
        socket.emit(EVENTS.SESSION_LINK_ERROR, {
          message: "Cannot create link while already in an active chat."
        });
        return;
      }

      const created = sessionLinkService.create(socket.id);
      socket.emit(EVENTS.SESSION_LINK_CREATED, {
        token: created.token,
        expiresAt: created.expiresAt,
        link: `${env.clientOrigin}?join=${created.token}`
      });
    });

    socket.on(EVENTS.USER_JOIN_SESSION_LINK, (payload = {}) => {
      const token = `${payload.token || ""}`.trim();

      if (!token) {
        socket.emit(EVENTS.SESSION_LINK_ERROR, {
          message: "Missing or invalid session link token."
        });
        return;
      }

      const invite = sessionLinkService.consume(token);

      if (!invite) {
        socket.emit(EVENTS.SESSION_LINK_ERROR, {
          message: "Session link expired or not found."
        });
        return;
      }

      if (invite.hostSocketId === socket.id) {
        socket.emit(EVENTS.SESSION_LINK_ERROR, {
          message: "You cannot join your own session link."
        });
        return;
      }

      if (!io.sockets.sockets.get(invite.hostSocketId)) {
        socket.emit(EVENTS.SESSION_LINK_ERROR, {
          message: "Host is offline. Please request a new link."
        });
        return;
      }

      const directMatch = matchmakingService.createDirectMatch(invite.hostSocketId, socket.id);

      if (!directMatch) {
        socket.emit(EVENTS.SESSION_LINK_ERROR, {
          message: "Host is currently unavailable. Try another link."
        });
        return;
      }

      sendMatchPayload(directMatch, { joinedViaLink: true });
    });

    socket.on(EVENTS.USER_NEXT, () => {
      breakCurrentMatch({ socketId: socket.id, reason: "next" });
    });

    socket.on(EVENTS.USER_REPORT, (payload = {}) => {
      const partnerId = matchmakingService.getPartner(socket.id);

      if (!partnerId) {
        return;
      }

      const reporterSessionId = matchmakingService.getSessionId(socket.id);
      const reportedSessionId = matchmakingService.getSessionId(partnerId);

      profileService.recordReport({
        reporterSessionId,
        reportedSessionId,
        reason: payload.reason || "manual-report"
      });
      matchmakingService.markBlocked(reporterSessionId, reportedSessionId, env.temporaryBlockMs);

      socket.emit(EVENTS.REPORT_RECEIVED, {
        success: true,
        reason: payload.reason || "suspicious-behavior",
        blockDurationMs: env.temporaryBlockMs
      });

      breakCurrentMatch({ socketId: socket.id, reason: "reported" });
    });

    socket.on(EVENTS.USER_RATE, (payload = {}) => {
      const partnerId = matchmakingService.getPartner(socket.id);

      if (!partnerId) {
        return;
      }

      const value = Number(payload.value) >= 1 ? 1 : -1;
      const targetSessionId = matchmakingService.getSessionId(partnerId);
      profileService.recordRating({ targetSessionId, value });
    });

    socket.on(EVENTS.USER_SEND_REACTION, (payload = {}) => {
      const partnerId = matchmakingService.getPartner(socket.id);

      if (!partnerId) {
        return;
      }

      const emoji = `${payload.emoji || ""}`;

      if (!ALLOWED_REACTIONS.has(emoji)) {
        return;
      }

      const reactionPayload = {
        id: uuidv4(),
        emoji,
        fromSocketId: socket.id,
        createdAt: Date.now()
      };

      io.to(socket.id).emit(EVENTS.CHAT_REACTION, {
        ...reactionPayload,
        isSelf: true
      });

      io.to(partnerId).emit(EVENTS.CHAT_REACTION, {
        ...reactionPayload,
        isSelf: false
      });
    });

    socket.on(EVENTS.CHAT_TYPING, (payload = {}) => {
      const partnerId = matchmakingService.getPartner(socket.id);

      if (!partnerId) {
        return;
      }

      io.to(partnerId).emit(EVENTS.CHAT_TYPING, {
        fromSocketId: socket.id,
        isTyping: Boolean(payload.isTyping)
      });
    });

    socket.on(EVENTS.CHAT_MESSAGE, async (payload = {}) => {
      matchmakingService.touch(socket.id);

      if (!canSendMessage(socket.id)) {
        socket.emit(EVENTS.CHAT_RATE_LIMIT, {
          message: "Rate limit reached. Please slow down for a moment."
        });
        return;
      }

      const partnerId = matchmakingService.getPartner(socket.id);
      const roomId = matchmakingService.getRoomId(socket.id);

      if (!partnerId || !roomId) {
        socket.emit(EVENTS.CHAT_WARNING, {
          message: "You are not currently in an active match."
        });
        return;
      }

      const rawText = `${payload.text || ""}`.slice(0, 500);
      const moderation = moderationService.sanitizeMessage(rawText);
      const aiModeration = await moderationService.evaluateWithAiModeration(rawText);

      if (aiModeration.flagged) {
        socket.emit(EVENTS.CHAT_WARNING, {
          message: "Your message was blocked by AI moderation safeguards."
        });
        return;
      }

      if (!moderation.cleanedText) {
        return;
      }

      const senderLanguage = matchmakingService.getPreferences(socket.id).language;
      const receiverLanguage = matchmakingService.getPreferences(partnerId).language;
      const sourceLanguage = await translationService.detectLanguage(moderation.cleanedText);

      const [translatedForSender, translatedForReceiver] = await Promise.all([
        translationService.translateText({
          text: moderation.cleanedText,
          sourceLanguage,
          targetLanguage: senderLanguage
        }),
        translationService.translateText({
          text: moderation.cleanedText,
          sourceLanguage,
          targetLanguage: receiverLanguage
        })
      ]);

      const baseMessage = {
        id: uuidv4(),
        roomId,
        senderSocketId: socket.id,
        originalText: moderation.cleanedText,
        sourceLanguage,
        sentAt: Date.now(),
        containsProfanity: moderation.containsProfanity
      };

      roomLastMessageAt.set(roomId, Date.now());
      matchmakingService.appendRoomMessage(roomId, baseMessage);

      io.to(socket.id).emit(EVENTS.CHAT_MESSAGE, {
        ...baseMessage,
        translatedText: translatedForSender,
        targetLanguage: senderLanguage,
        isSelf: true
      });

      io.to(partnerId).emit(EVENTS.CHAT_MESSAGE, {
        ...baseMessage,
        translatedText: translatedForReceiver,
        targetLanguage: receiverLanguage,
        isSelf: false
      });

      if (moderation.containsProfanity) {
        socket.emit(EVENTS.CHAT_WARNING, {
          message: "Profanity was masked before delivery."
        });
      }
    });

    socket.on(EVENTS.SUBTITLE_CHUNK, async (payload = {}) => {
      const partnerId = matchmakingService.getPartner(socket.id);

      if (!partnerId) {
        return;
      }

      const senderLanguage = matchmakingService.getPreferences(socket.id).language;
      const receiverLanguage = matchmakingService.getPreferences(partnerId).language;

      const subtitleForReceiver = await subtitleService.processChunk({
        transcript: payload.transcript,
        audioBase64: payload.audioBase64,
        mimeType: payload.mimeType,
        sourceLanguage: payload.sourceLanguage || senderLanguage,
        targetLanguage: receiverLanguage
      });

      if (!subtitleForReceiver) {
        return;
      }

      const subtitleForSender = await subtitleService.processChunk({
        transcript: payload.transcript,
        audioBase64: payload.audioBase64,
        mimeType: payload.mimeType,
        sourceLanguage: payload.sourceLanguage || senderLanguage,
        targetLanguage: senderLanguage
      });

      io.to(partnerId).emit(EVENTS.SUBTITLE_UPDATE, {
        ...subtitleForReceiver,
        fromSocketId: socket.id,
        isSelf: false,
        createdAt: Date.now()
      });

      io.to(socket.id).emit(EVENTS.SUBTITLE_UPDATE, {
        ...subtitleForSender,
        fromSocketId: socket.id,
        isSelf: true,
        createdAt: Date.now()
      });
    });

    socket.on(EVENTS.WEBRTC_OFFER, (payload = {}) => {
      forwardWebRtcSignal(socket, EVENTS.WEBRTC_OFFER, payload);
    });

    socket.on(EVENTS.WEBRTC_ANSWER, (payload = {}) => {
      forwardWebRtcSignal(socket, EVENTS.WEBRTC_ANSWER, payload);
    });

    socket.on(EVENTS.WEBRTC_ICE, (payload = {}) => {
      forwardWebRtcSignal(socket, EVENTS.WEBRTC_ICE, payload);
    });

    socket.on("disconnect", () => {
      sessionLinkService.invalidateHost(socket.id);
      const ended = matchmakingService.removeSocket(socket.id);
      socketMessageBuckets.delete(socket.id);

      if (ended?.partnerId) {
        emitSessionSummary(ended.roomId, [ended.partnerId]);

        io.to(ended.partnerId).emit(EVENTS.MATCH_ENDED, {
          reason: "partner-disconnected"
        });

        io.to(ended.partnerId).emit(EVENTS.PARTNER_STATUS, {
          connected: false
        });

        cleanupRoomState(ended.roomId);
        requeueSocket(ended.partnerId);
        runMatchmaking();
      }
    });
  });
};
