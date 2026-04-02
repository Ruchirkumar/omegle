import { Router } from "express";

export const createAiRoutes = ({ translationService, moderationService, subtitleService }) => {
  const router = Router();

  router.post("/translate", async (req, res) => {
    try {
      const { text, sourceLanguage = "auto", targetLanguage = "en" } = req.body || {};

      const translatedText = await translationService.translateText({
        text,
        sourceLanguage,
        targetLanguage
      });

      return res.json({
        originalText: text,
        translatedText,
        sourceLanguage,
        targetLanguage
      });
    } catch (_error) {
      return res.status(500).json({ error: "Translation failed." });
    }
  });

  router.post("/moderate", async (req, res) => {
    try {
      const { text } = req.body || {};
      const sanitized = moderationService.sanitizeMessage(text);
      const aiModeration = await moderationService.evaluateWithAiModeration(text);

      return res.json({
        sanitized,
        aiModeration
      });
    } catch (_error) {
      return res.status(500).json({ error: "Moderation failed." });
    }
  });

  router.post("/subtitle", async (req, res) => {
    try {
      const { transcript, audioBase64, mimeType, sourceLanguage, targetLanguage } = req.body || {};

      const result = await subtitleService.processChunk({
        transcript,
        audioBase64,
        mimeType,
        sourceLanguage,
        targetLanguage
      });

      return res.json(result || { message: "No subtitle generated." });
    } catch (_error) {
      return res.status(500).json({ error: "Subtitle processing failed." });
    }
  });

  router.post("/tts", async (req, res) => {
    const { text, language = "en" } = req.body || {};

    return res.json({
      message: "TTS hook ready. Integrate your speech synthesis provider here.",
      text,
      language
    });
  });

  return router;
};
