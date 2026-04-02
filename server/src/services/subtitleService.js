export class SubtitleService {
  constructor({ translationService, sttProvider = "mock", openAiGateway } = {}) {
    this.translationService = translationService;
    this.sttProvider = sttProvider;
    this.openAiGateway = openAiGateway;
  }

  async speechToText({ transcript, audioBase64, mimeType, language }) {
    if (transcript) {
      return transcript;
    }

    if (this.sttProvider === "openai") {
      const transcribed = await this.openAiGateway?.transcribeBase64Audio({
        audioBase64,
        mimeType,
        language
      });

      return transcribed || "";
    }

    if (this.sttProvider === "mock") {
      return "";
    }

    return "";
  }

  async processChunk({ transcript, audioBase64, mimeType, sourceLanguage, targetLanguage }) {
    const originalText = await this.speechToText({
      transcript,
      audioBase64,
      mimeType,
      language: sourceLanguage
    });

    if (!originalText) {
      return null;
    }

    const detectedLanguage =
      sourceLanguage || (await this.translationService.detectLanguage(originalText));

    const translatedText = await this.translationService.translateText({
      text: originalText,
      sourceLanguage: detectedLanguage,
      targetLanguage
    });

    return {
      originalText,
      translatedText,
      sourceLanguage: detectedLanguage,
      targetLanguage
    };
  }
}
