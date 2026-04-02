import cors from "cors";
import express from "express";
import http from "http";
import { Server } from "socket.io";
import { env } from "./config/env.js";
import { PersistenceService } from "./db/persistenceService.js";
import { createHttpRateLimiter } from "./middleware/httpRateLimiter.js";
import { createAiRoutes } from "./routes/aiRoutes.js";
import { IcebreakerService } from "./services/icebreakerService.js";
import { MatchmakingService } from "./services/matchmakingService.js";
import { ModerationService } from "./services/moderationService.js";
import { OpenAiGateway } from "./services/openAiGateway.js";
import { ProfileService } from "./services/profileService.js";
import { SessionLinkService } from "./services/sessionLinkService.js";
import { SubtitleService } from "./services/subtitleService.js";
import { SummaryService } from "./services/summaryService.js";
import { TranslationService } from "./services/translationService.js";
import { registerSocketHandlers } from "./socket/socketHandlers.js";
import { log } from "./utils/logger.js";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: env.clientOrigin,
    methods: ["GET", "POST"]
  }
});

app.use(cors({ origin: env.clientOrigin }));
app.use(express.json({ limit: "4mb" }));
app.use(createHttpRateLimiter());

const persistenceService = env.dbEnabled
  ? new PersistenceService({ dbFile: env.dbFile })
  : null;

const openAiGateway = new OpenAiGateway({
  apiKey: env.openAiApiKey,
  baseUrl: env.openAiBaseUrl,
  moderationModel: env.openAiModerationModel,
  translationModel: env.openAiTranslationModel,
  sttModel: env.openAiSttModel
});

const profileService = new ProfileService({
  persistenceService
});

const translationService = new TranslationService({
  provider: env.translationProvider,
  libreTranslateUrl: env.libreTranslateUrl,
  openAiGateway
});

const moderationService = new ModerationService({
  provider: env.moderationProvider,
  openAiGateway
});

const subtitleService = new SubtitleService({
  translationService,
  sttProvider: env.sttProvider,
  openAiGateway
});

const matchmakingService = new MatchmakingService({
  profileService,
  persistenceService,
  inactivityTimeoutMs: env.inactivityTimeoutMs,
  temporaryBlockMs: env.temporaryBlockMs
});
const icebreakerService = new IcebreakerService();
const summaryService = new SummaryService();
const sessionLinkService = new SessionLinkService({
  ttlMs: env.sessionLinkTtlMs
});

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    time: new Date().toISOString(),
    persistenceEnabled: Boolean(persistenceService),
    providers: {
      translation: env.translationProvider,
      moderation: env.moderationProvider,
      stt: env.sttProvider,
      openAiConfigured: openAiGateway.isReady()
    }
  });
});

app.get("/", (_req, res) => {
  res.json({
    message: "Omegle Next backend is running.",
    frontend: env.clientOrigin,
    health: "/health",
    aiRoutes: "/api/ai/*"
  });
});

app.use(
  "/api/ai",
  createAiRoutes({
    translationService,
    moderationService,
    subtitleService
  })
);

registerSocketHandlers({
  io,
  matchmakingService,
  moderationService,
  translationService,
  subtitleService,
  profileService,
  icebreakerService,
  summaryService,
  sessionLinkService
});

server.listen(env.port, () => {
  log.info(`Server is running on http://localhost:${env.port}`);
  log.info(`Allowed client origin: ${env.clientOrigin}`);
  log.info(`DB enabled: ${env.dbEnabled} (${env.dbFile})`);
});
