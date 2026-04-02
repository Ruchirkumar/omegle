import axios from "axios";

const normalizeLanguage = (language = "en") => language.toLowerCase().split("-")[0];

const detectByScript = (text) => {
  if (/[\u0900-\u097F]/.test(text)) {
    return "hi";
  }

  if (/[\u0400-\u04FF]/.test(text)) {
    return "ru";
  }

  if (/[\u0600-\u06FF]/.test(text)) {
    return "ar";
  }

  if (/[\u4E00-\u9FFF]/.test(text)) {
    return "zh";
  }

  if (/[\u3040-\u30FF]/.test(text)) {
    return "ja";
  }

  if (/[\uAC00-\uD7AF]/.test(text)) {
    return "ko";
  }

  return "en";
};

export class TranslationService {
  constructor({ provider = "mock", libreTranslateUrl, openAiGateway } = {}) {
    this.provider = provider;
    this.libreTranslateUrl = libreTranslateUrl;
    this.openAiGateway = openAiGateway;
  }

  async detectLanguage(text = "") {
    const normalized = `${text}`.trim();

    if (!normalized) {
      return "en";
    }

    return detectByScript(normalized);
  }

  async translateWithLibre({ text, sourceLanguage, targetLanguage }) {
    const response = await axios.post(
      this.libreTranslateUrl,
      {
        q: text,
        source: sourceLanguage,
        target: targetLanguage,
        format: "text"
      },
      {
        timeout: 5000
      }
    );

    return response.data?.translatedText || text;
  }

  async translateText({ text, sourceLanguage = "auto", targetLanguage = "en" }) {
    const normalizedText = `${text || ""}`.trim();
    const normalizedTarget = normalizeLanguage(targetLanguage || "en");

    if (!normalizedText) {
      return "";
    }

    const detectedLanguage =
      sourceLanguage === "auto"
        ? await this.detectLanguage(normalizedText)
        : normalizeLanguage(sourceLanguage);

    if (detectedLanguage === normalizedTarget) {
      return normalizedText;
    }

    if (this.provider === "openai") {
      const translated = await this.openAiGateway?.translateText({
        text: normalizedText,
        sourceLanguage: detectedLanguage,
        targetLanguage: normalizedTarget
      });

      if (translated) {
        return translated;
      }

      return `[${normalizedTarget}] ${normalizedText}`;
    }

    if (this.provider === "libre") {
      try {
        return await this.translateWithLibre({
          text: normalizedText,
          sourceLanguage: detectedLanguage,
          targetLanguage: normalizedTarget
        });
      } catch (_error) {
        return `[${normalizedTarget}] ${normalizedText}`;
      }
    }

    return `[${normalizedTarget}] ${normalizedText}`;
  }
}
