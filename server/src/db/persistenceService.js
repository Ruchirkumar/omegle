import Database from "better-sqlite3";

const createPairKey = (a, b) => [a, b].sort().join("::");

export class PersistenceService {
  constructor({ dbFile }) {
    this.db = new Database(dbFile);
    this.initialize();

    this.profileSelect = this.db.prepare(
      `SELECT session_id, reputation, reports_submitted, reports_received, last_seen_at,
              positive_ratings, negative_ratings, shadow_banned
       FROM profiles
       WHERE session_id = ?`
    );

    this.profileUpsert = this.db.prepare(
      `INSERT INTO profiles
       (session_id, reputation, reports_submitted, reports_received, last_seen_at, positive_ratings, negative_ratings, shadow_banned)
       VALUES (@session_id, @reputation, @reports_submitted, @reports_received, @last_seen_at, @positive_ratings, @negative_ratings, @shadow_banned)
       ON CONFLICT(session_id) DO UPDATE SET
         reputation = excluded.reputation,
         reports_submitted = excluded.reports_submitted,
         reports_received = excluded.reports_received,
         last_seen_at = excluded.last_seen_at,
         positive_ratings = excluded.positive_ratings,
         negative_ratings = excluded.negative_ratings,
         shadow_banned = excluded.shadow_banned`
    );

    this.blockUpsert = this.db.prepare(
      `INSERT INTO pair_blocks (pair_key, session_a, session_b, expires_at)
       VALUES (@pair_key, @session_a, @session_b, @expires_at)
       ON CONFLICT(pair_key) DO UPDATE SET
         expires_at = excluded.expires_at,
         session_a = excluded.session_a,
         session_b = excluded.session_b`
    );

    this.blockSelect = this.db.prepare(
      `SELECT expires_at FROM pair_blocks WHERE pair_key = ?`
    );

    this.insertReportStmt = this.db.prepare(
      `INSERT INTO reports (reporter_session_id, reported_session_id, reason, created_at)
       VALUES (@reporter_session_id, @reported_session_id, @reason, @created_at)`
    );

    this.insertChatSessionStmt = this.db.prepare(
      `INSERT INTO chat_sessions (room_id, session_a, session_b, started_at, ended_at, end_reason)
       VALUES (@room_id, @session_a, @session_b, @started_at, @ended_at, @end_reason)
       ON CONFLICT(room_id) DO UPDATE SET
         ended_at = excluded.ended_at,
         end_reason = excluded.end_reason`
    );

    this.insertMessageStmt = this.db.prepare(
      `INSERT INTO chat_messages
       (id, room_id, sender_socket_id, original_text, translated_text, source_language, target_language, sent_at, contains_profanity)
       VALUES (@id, @room_id, @sender_socket_id, @original_text, @translated_text, @source_language, @target_language, @sent_at, @contains_profanity)`
    );
  }

  initialize() {
    this.db.pragma("journal_mode = WAL");

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS profiles (
        session_id TEXT PRIMARY KEY,
        reputation INTEGER NOT NULL DEFAULT 70,
        reports_submitted INTEGER NOT NULL DEFAULT 0,
        reports_received INTEGER NOT NULL DEFAULT 0,
        last_seen_at INTEGER NOT NULL,
        positive_ratings INTEGER NOT NULL DEFAULT 0,
        negative_ratings INTEGER NOT NULL DEFAULT 0,
        shadow_banned INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS pair_blocks (
        pair_key TEXT PRIMARY KEY,
        session_a TEXT NOT NULL,
        session_b TEXT NOT NULL,
        expires_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        reporter_session_id TEXT NOT NULL,
        reported_session_id TEXT NOT NULL,
        reason TEXT,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS chat_sessions (
        room_id TEXT PRIMARY KEY,
        session_a TEXT,
        session_b TEXT,
        started_at INTEGER NOT NULL,
        ended_at INTEGER,
        end_reason TEXT
      );

      CREATE TABLE IF NOT EXISTS chat_messages (
        id TEXT PRIMARY KEY,
        room_id TEXT NOT NULL,
        sender_socket_id TEXT,
        original_text TEXT NOT NULL,
        translated_text TEXT,
        source_language TEXT,
        target_language TEXT,
        sent_at INTEGER NOT NULL,
        contains_profanity INTEGER NOT NULL DEFAULT 0
      );
    `);

    this.ensureProfileColumns();
  }

  ensureProfileColumns() {
    const columns = this.db
      .prepare("PRAGMA table_info(profiles)")
      .all()
      .map((column) => column.name);

    if (!columns.includes("positive_ratings")) {
      this.db.exec(
        "ALTER TABLE profiles ADD COLUMN positive_ratings INTEGER NOT NULL DEFAULT 0"
      );
    }

    if (!columns.includes("negative_ratings")) {
      this.db.exec(
        "ALTER TABLE profiles ADD COLUMN negative_ratings INTEGER NOT NULL DEFAULT 0"
      );
    }

    if (!columns.includes("shadow_banned")) {
      this.db.exec(
        "ALTER TABLE profiles ADD COLUMN shadow_banned INTEGER NOT NULL DEFAULT 0"
      );
    }
  }

  getProfile(sessionId) {
    if (!sessionId) {
      return null;
    }

    const row = this.profileSelect.get(sessionId);

    if (!row) {
      return null;
    }

    return {
      reputation: row.reputation,
      reportsSubmitted: row.reports_submitted,
      reportsReceived: row.reports_received,
      lastSeenAt: row.last_seen_at,
      positiveRatings: row.positive_ratings || 0,
      negativeRatings: row.negative_ratings || 0,
      shadowBanned: Boolean(row.shadow_banned)
    };
  }

  upsertProfile(sessionId, profile) {
    if (!sessionId || !profile) {
      return;
    }

    this.profileUpsert.run({
      session_id: sessionId,
      reputation: profile.reputation,
      reports_submitted: profile.reportsSubmitted,
      reports_received: profile.reportsReceived,
      last_seen_at: profile.lastSeenAt,
      positive_ratings: profile.positiveRatings || 0,
      negative_ratings: profile.negativeRatings || 0,
      shadow_banned: profile.shadowBanned ? 1 : 0
    });
  }

  setPairBlock(sessionA, sessionB, expiresAt) {
    if (!sessionA || !sessionB) {
      return;
    }

    this.blockUpsert.run({
      pair_key: createPairKey(sessionA, sessionB),
      session_a: sessionA,
      session_b: sessionB,
      expires_at: expiresAt
    });
  }

  getPairBlockExpiry(sessionA, sessionB) {
    if (!sessionA || !sessionB) {
      return null;
    }

    const row = this.blockSelect.get(createPairKey(sessionA, sessionB));
    return row?.expires_at || null;
  }

  insertReport({ reporterSessionId, reportedSessionId, reason }) {
    if (!reporterSessionId || !reportedSessionId) {
      return;
    }

    this.insertReportStmt.run({
      reporter_session_id: reporterSessionId,
      reported_session_id: reportedSessionId,
      reason: reason || "manual-report",
      created_at: Date.now()
    });
  }

  upsertChatSession({ roomId, sessionA, sessionB, startedAt, endedAt, endReason }) {
    this.insertChatSessionStmt.run({
      room_id: roomId,
      session_a: sessionA || null,
      session_b: sessionB || null,
      started_at: startedAt || Date.now(),
      ended_at: endedAt || null,
      end_reason: endReason || null
    });
  }

  insertMessage(message) {
    if (!message?.id || !message?.roomId || !message?.originalText) {
      return;
    }

    this.insertMessageStmt.run({
      id: message.id,
      room_id: message.roomId,
      sender_socket_id: message.senderSocketId || null,
      original_text: message.originalText,
      translated_text: message.translatedText || null,
      source_language: message.sourceLanguage || null,
      target_language: message.targetLanguage || null,
      sent_at: message.sentAt || Date.now(),
      contains_profanity: message.containsProfanity ? 1 : 0
    });
  }
}
