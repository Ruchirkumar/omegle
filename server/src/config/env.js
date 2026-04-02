import dotenv from "dotenv";

dotenv.config();

const asInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const asBool = (value, fallback = false) => {
  if (value === undefined) {
    return fallback;
  }

  const normalized = `${value}`.trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes";
};

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: asInt(process.env.PORT, 4000),
  clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
  queueSweepMs: asInt(process.env.QUEUE_SWEEP_MS, 2500),
  inactivityTimeoutMs: asInt(process.env.INACTIVITY_TIMEOUT_MS, 90000),
  temporaryBlockMs: asInt(process.env.TEMPORARY_BLOCK_MS, 1800000),
  translationProvider: process.env.TRANSLATION_PROVIDER || "mock",
  libreTranslateUrl:
    process.env.LIBRETRANSLATE_URL || "https://libretranslate.com/translate",
  sttProvider: process.env.STT_PROVIDER || "mock",
  moderationProvider: process.env.MODERATION_PROVIDER || "mock",
  socketMessageLimit: asInt(process.env.SOCKET_MESSAGE_LIMIT, 12),
  socketMessageWindowMs: asInt(process.env.SOCKET_MESSAGE_WINDOW_MS, 10000),
  dbEnabled: asBool(process.env.DB_ENABLED, true),
  dbFile: process.env.DB_FILE || "./db.sqlite3",
  openAiApiKey: process.env.OPENAI_API_KEY || "",
  openAiBaseUrl: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
  openAiModerationModel:
    process.env.OPENAI_MODERATION_MODEL || "omni-moderation-latest",
  openAiTranslationModel: process.env.OPENAI_TRANSLATION_MODEL || "gpt-4o-mini",
  openAiSttModel: process.env.OPENAI_STT_MODEL || "whisper-1",
  icebreakerIdleMs: asInt(process.env.ICEBREAKER_IDLE_MS, 18000),
  icebreakerCooldownMs: asInt(process.env.ICEBREAKER_COOLDOWN_MS, 25000),
  sessionLinkTtlMs: asInt(process.env.SESSION_LINK_TTL_MS, 600000)
};
