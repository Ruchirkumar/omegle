import { v4 as uuidv4 } from "uuid";

const ANY = "any";
const MOODS = new Set(["fun", "deep", "dating"]);

const normalizeScalar = (value, fallback = ANY) => {
  if (!value) {
    return fallback;
  }

  return `${value}`.trim().toLowerCase() || fallback;
};

const normalizeBoolean = (value, fallback = false) => {
  if (typeof value === "boolean") {
    return value;
  }

  if (value === undefined || value === null) {
    return fallback;
  }

  return ["1", "true", "yes", "on"].includes(`${value}`.toLowerCase());
};

const normalizeMood = (value) => {
  const normalized = normalizeScalar(value, "fun");
  return MOODS.has(normalized) ? normalized : "fun";
};

const normalizeInterests = (interests) => {
  if (!Array.isArray(interests)) {
    return [];
  }

  return [...new Set(interests.map((item) => normalizeScalar(item, "")).filter(Boolean))].slice(0, 10);
};

const createPairKey = (a, b) => [a, b].sort().join("::");

const matchesGenderPreference = (genderPreference, otherGender) => {
  const preference = normalizeScalar(genderPreference);
  if (preference === ANY) {
    return true;
  }

  return preference === normalizeScalar(otherGender);
};

export class MatchmakingService {
  constructor({
    profileService,
    persistenceService,
    inactivityTimeoutMs = 90000,
    temporaryBlockMs = 1800000
  } = {}) {
    this.profileService = profileService;
    this.persistenceService = persistenceService;
    this.inactivityTimeoutMs = inactivityTimeoutMs;
    this.temporaryBlockMs = temporaryBlockMs;

    this.queue = [];
    this.matches = new Map();
    this.socketSessions = new Map();
    this.socketPreferences = new Map();
    this.lastActivity = new Map();
    this.temporaryBlocks = new Map();
    this.roomMessages = new Map();
    this.roomParticipants = new Map();
  }

  defaultPreferences() {
    return {
      interests: [],
      language: "en",
      region: ANY,
      gender: ANY,
      genderPreference: ANY,
      mood: "fun",
      voiceOnly: false
    };
  }

  registerSocket(socketId, sessionId) {
    this.socketSessions.set(socketId, sessionId);
    this.profileService.registerSession(sessionId);
    this.socketPreferences.set(socketId, this.defaultPreferences());
    this.touch(socketId);
  }

  getSessionId(socketId) {
    return this.socketSessions.get(socketId);
  }

  updatePreferences(socketId, incoming = {}) {
    const existing = this.socketPreferences.get(socketId) || this.defaultPreferences();

    const nextPrefs = {
      interests: normalizeInterests(incoming.interests ?? existing.interests),
      language: normalizeScalar(incoming.language ?? existing.language, "en"),
      region: normalizeScalar(incoming.region ?? existing.region),
      gender: normalizeScalar(incoming.gender ?? existing.gender),
      genderPreference: normalizeScalar(
        incoming.genderPreference ?? existing.genderPreference
      ),
      mood: normalizeMood(incoming.mood ?? existing.mood),
      voiceOnly: normalizeBoolean(incoming.voiceOnly ?? existing.voiceOnly)
    };

    this.socketPreferences.set(socketId, nextPrefs);
    return nextPrefs;
  }

  getPreferences(socketId) {
    return this.socketPreferences.get(socketId) || this.defaultPreferences();
  }

  getPartner(socketId) {
    return this.matches.get(socketId)?.partnerId || null;
  }

  getRoomId(socketId) {
    return this.matches.get(socketId)?.roomId || null;
  }

  getRoomStartedAt(roomId) {
    return this.roomParticipants.get(roomId)?.startedAt || null;
  }

  isMatched(socketId) {
    return this.matches.has(socketId);
  }

  enqueue(socketId) {
    if (!this.socketSessions.has(socketId) || this.isMatched(socketId)) {
      return;
    }

    this.dequeue(socketId);
    this.queue.push(socketId);
    this.touch(socketId);
  }

  dequeue(socketId) {
    this.queue = this.queue.filter((id) => id !== socketId);
  }

  touch(socketId) {
    this.lastActivity.set(socketId, Date.now());
  }

  hasBeenInactive(socketId, now = Date.now()) {
    const lastSeen = this.lastActivity.get(socketId) || 0;
    return now - lastSeen > this.inactivityTimeoutMs;
  }

  getUniqueActivePairs() {
    const uniquePairs = [];
    const seen = new Set();

    for (const [socketId, match] of this.matches.entries()) {
      const key = createPairKey(socketId, match.partnerId);
      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      uniquePairs.push({
        socketA: socketId,
        socketB: match.partnerId,
        roomId: match.roomId
      });
    }

    return uniquePairs;
  }

  markBlocked(sessionA, sessionB, durationMs = this.temporaryBlockMs) {
    if (!sessionA || !sessionB || sessionA === sessionB) {
      return;
    }

    const expiresAt = Date.now() + durationMs;
    this.temporaryBlocks.set(createPairKey(sessionA, sessionB), expiresAt);
    this.persistenceService?.setPairBlock(sessionA, sessionB, expiresAt);
  }

  isBlocked(sessionA, sessionB) {
    if (!sessionA || !sessionB) {
      return false;
    }

    const key = createPairKey(sessionA, sessionB);
    let expiresAt = this.temporaryBlocks.get(key);

    if (!expiresAt) {
      expiresAt = this.persistenceService?.getPairBlockExpiry(sessionA, sessionB) || null;

      if (expiresAt) {
        this.temporaryBlocks.set(key, expiresAt);
      }
    }

    if (!expiresAt) {
      return false;
    }

    if (expiresAt <= Date.now()) {
      this.temporaryBlocks.delete(key);
      return false;
    }

    return true;
  }

  appendRoomMessage(roomId, message) {
    if (!roomId) {
      return;
    }

    if (!this.roomMessages.has(roomId)) {
      this.roomMessages.set(roomId, []);
    }

    const messages = this.roomMessages.get(roomId);
    messages.push(message);

    if (messages.length > 100) {
      messages.shift();
    }

    this.persistenceService?.insertMessage(message);
  }

  getRoomHistory(roomId) {
    return this.roomMessages.get(roomId) || [];
  }

  scoreCandidate(socketA, socketB) {
    const prefsA = this.getPreferences(socketA);
    const prefsB = this.getPreferences(socketB);

    const sessionA = this.getSessionId(socketA);
    const sessionB = this.getSessionId(socketB);

    if (this.isBlocked(sessionA, sessionB)) {
      return Number.NEGATIVE_INFINITY;
    }

    if (
      !matchesGenderPreference(prefsA.genderPreference, prefsB.gender) ||
      !matchesGenderPreference(prefsB.genderPreference, prefsA.gender)
    ) {
      return Number.NEGATIVE_INFINITY;
    }

    const moderationA = this.profileService.getModerationSnapshot(sessionA);
    const moderationB = this.profileService.getModerationSnapshot(sessionB);

    if (moderationA.shadowBanned || moderationB.shadowBanned) {
      const bothShadowBanned = moderationA.shadowBanned && moderationB.shadowBanned;
      const bothLowReputation = moderationA.reputation <= 45 && moderationB.reputation <= 45;

      if (!bothShadowBanned && !bothLowReputation) {
        return Number.NEGATIVE_INFINITY;
      }
    }

    let score = 0;

    const sharedInterestCount = prefsA.interests.filter((interest) =>
      prefsB.interests.includes(interest)
    ).length;

    score += sharedInterestCount * 20;

    if (prefsA.region !== ANY && prefsA.region === prefsB.region) {
      score += 12;
    }

    if (prefsA.language === prefsB.language) {
      score += 10;
    }

    if (prefsA.mood === prefsB.mood) {
      score += 18;
    } else {
      score -= 4;
    }

    score += Math.round((moderationA.reputation + moderationB.reputation) / 20);
    score += Math.random();

    return score;
  }

  createMatch(socketA, socketB) {
    const roomId = uuidv4();
    const createdAt = Date.now();

    this.matches.set(socketA, {
      partnerId: socketB,
      roomId,
      createdAt
    });

    this.matches.set(socketB, {
      partnerId: socketA,
      roomId,
      createdAt
    });

    this.roomMessages.set(roomId, []);

    const sessionA = this.getSessionId(socketA);
    const sessionB = this.getSessionId(socketB);

    this.roomParticipants.set(roomId, {
      sessionA,
      sessionB,
      startedAt: createdAt
    });

    this.persistenceService?.upsertChatSession({
      roomId,
      sessionA,
      sessionB,
      startedAt: createdAt
    });

    return {
      roomId,
      participants: [socketA, socketB],
      createdAt
    };
  }

  createDirectMatch(socketA, socketB) {
    if (!socketA || !socketB || socketA === socketB) {
      return null;
    }

    if (this.isMatched(socketA) || this.isMatched(socketB)) {
      return null;
    }

    this.dequeue(socketA);
    this.dequeue(socketB);
    this.touch(socketA);
    this.touch(socketB);

    return this.createMatch(socketA, socketB);
  }

  tryMatchmake() {
    const matches = [];

    if (this.queue.length < 2) {
      return matches;
    }

    let cycleAttempts = 0;

    while (this.queue.length >= 2 && cycleAttempts <= this.queue.length) {
      const seekerId = this.queue[0];
      let bestIndex = -1;
      let bestScore = Number.NEGATIVE_INFINITY;

      for (let i = 1; i < this.queue.length; i += 1) {
        const candidateId = this.queue[i];
        const score = this.scoreCandidate(seekerId, candidateId);

        if (score > bestScore) {
          bestScore = score;
          bestIndex = i;
        }
      }

      if (bestIndex < 0 || bestScore === Number.NEGATIVE_INFINITY) {
        this.queue.push(this.queue.shift());
        cycleAttempts += 1;
        continue;
      }

      const partnerId = this.queue[bestIndex];
      this.dequeue(seekerId);
      this.dequeue(partnerId);

      const createdMatch = this.createMatch(seekerId, partnerId);
      this.touch(seekerId);
      this.touch(partnerId);
      matches.push(createdMatch);

      cycleAttempts = 0;
    }

    return matches;
  }

  getPartnerSummary(forSocketId, partnerSocketId) {
    const partnerPrefs = this.getPreferences(partnerSocketId);
    const partnerSession = this.getSessionId(partnerSocketId);

    return {
      socketId: partnerSocketId,
      alias: `Stranger-${partnerSession?.slice(-4) || "anon"}`,
      interests: partnerPrefs.interests,
      language: partnerPrefs.language,
      region: partnerPrefs.region,
      gender: partnerPrefs.gender,
      mood: partnerPrefs.mood,
      voiceOnly: partnerPrefs.voiceOnly,
      reputation: this.profileService.getReputation(partnerSession),
      languageMatch: this.getPreferences(forSocketId).language === partnerPrefs.language
    };
  }

  endMatch(socketId, reason = "ended") {
    const match = this.matches.get(socketId);

    if (!match) {
      return null;
    }

    this.matches.delete(socketId);
    this.matches.delete(match.partnerId);

    const participants = this.roomParticipants.get(match.roomId);

    this.persistenceService?.upsertChatSession({
      roomId: match.roomId,
      sessionA: participants?.sessionA,
      sessionB: participants?.sessionB,
      startedAt: participants?.startedAt,
      endedAt: Date.now(),
      endReason: reason
    });

    this.roomParticipants.delete(match.roomId);

    return {
      reason,
      partnerId: match.partnerId,
      roomId: match.roomId,
      startedAt: participants?.startedAt
    };
  }

  removeSocket(socketId) {
    this.dequeue(socketId);
    this.lastActivity.delete(socketId);
    this.socketPreferences.delete(socketId);
    this.socketSessions.delete(socketId);

    return this.endMatch(socketId, "disconnect");
  }
}
