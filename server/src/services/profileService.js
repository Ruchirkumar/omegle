const DEFAULT_REPUTATION = 70;
const SHADOW_BAN_REPUTATION_THRESHOLD = 35;
const SHADOW_BAN_REPORT_THRESHOLD = 3;
const SHADOW_BAN_NEGATIVE_RATING_THRESHOLD = 4;

const createDefaultProfile = () => ({
  reputation: DEFAULT_REPUTATION,
  reportsSubmitted: 0,
  reportsReceived: 0,
  positiveRatings: 0,
  negativeRatings: 0,
  shadowBanned: false,
  lastSeenAt: Date.now()
});

const shouldShadowBan = (profile) => {
  return (
    profile.reputation <= SHADOW_BAN_REPUTATION_THRESHOLD ||
    profile.reportsReceived >= SHADOW_BAN_REPORT_THRESHOLD ||
    profile.negativeRatings >= SHADOW_BAN_NEGATIVE_RATING_THRESHOLD
  );
};

export class ProfileService {
  constructor({ persistenceService } = {}) {
    this.persistenceService = persistenceService;
    this.profiles = new Map();
  }

  getOrCreate(sessionId) {
    if (!sessionId) {
      return createDefaultProfile();
    }

    if (!this.profiles.has(sessionId)) {
      const persistedProfile = this.persistenceService?.getProfile(sessionId);
      this.profiles.set(sessionId, persistedProfile || createDefaultProfile());
    }

    const profile = this.profiles.get(sessionId);
    profile.shadowBanned = profile.shadowBanned || shouldShadowBan(profile);
    profile.lastSeenAt = Date.now();
    this.persistenceService?.upsertProfile(sessionId, profile);

    return profile;
  }

  registerSession(sessionId) {
    return this.getOrCreate(sessionId);
  }

  getReputation(sessionId) {
    return this.getOrCreate(sessionId).reputation;
  }

  isShadowBanned(sessionId) {
    return this.getOrCreate(sessionId).shadowBanned;
  }

  getModerationSnapshot(sessionId) {
    const profile = this.getOrCreate(sessionId);

    return {
      reputation: profile.reputation,
      reportsReceived: profile.reportsReceived,
      positiveRatings: profile.positiveRatings,
      negativeRatings: profile.negativeRatings,
      shadowBanned: profile.shadowBanned
    };
  }

  reward(sessionId, delta = 1) {
    const profile = this.getOrCreate(sessionId);
    profile.reputation = Math.min(100, profile.reputation + delta);
    this.persistenceService?.upsertProfile(sessionId, profile);
    return profile.reputation;
  }

  penalize(sessionId, delta = 10) {
    const profile = this.getOrCreate(sessionId);
    profile.reputation = Math.max(0, profile.reputation - delta);
    profile.shadowBanned = profile.shadowBanned || shouldShadowBan(profile);
    this.persistenceService?.upsertProfile(sessionId, profile);
    return profile.reputation;
  }

  recordRating({ targetSessionId, value }) {
    if (!targetSessionId) {
      return null;
    }

    const profile = this.getOrCreate(targetSessionId);

    if (value >= 1) {
      profile.positiveRatings += 1;
      profile.reputation = Math.min(100, profile.reputation + 2);
    }

    if (value <= -1) {
      profile.negativeRatings += 1;
      profile.reputation = Math.max(0, profile.reputation - 5);
    }

    profile.shadowBanned = profile.shadowBanned || shouldShadowBan(profile);
    this.persistenceService?.upsertProfile(targetSessionId, profile);

    return profile;
  }

  recordReport({ reporterSessionId, reportedSessionId, reason = "manual-report" }) {
    const reporter = this.getOrCreate(reporterSessionId);
    const reported = this.getOrCreate(reportedSessionId);

    reporter.reportsSubmitted += 1;
    reported.reportsReceived += 1;
    reported.reputation = Math.max(0, reported.reputation - 10);
    reported.shadowBanned = reported.shadowBanned || shouldShadowBan(reported);

    this.persistenceService?.upsertProfile(reporterSessionId, reporter);
    this.persistenceService?.upsertProfile(reportedSessionId, reported);
    this.persistenceService?.insertReport({
      reporterSessionId,
      reportedSessionId,
      reason
    });

    return {
      reporter,
      reported
    };
  }
}
