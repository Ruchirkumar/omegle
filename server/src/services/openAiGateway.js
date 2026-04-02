import FormData from "form-data";
import axios from "axios";

export class OpenAiGateway {
  constructor({ apiKey, baseUrl, moderationModel, translationModel, sttModel }) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.moderationModel = moderationModel;
    this.translationModel = translationModel;
    this.sttModel = sttModel;
  }

  isReady() {
    return Boolean(this.apiKey);
  }

  get headers() {
    return {
      Authorization: `Bearer ${this.apiKey}`
    };
  }

  async moderateText(text) {
    if (!this.isReady() || !text) {
      return null;
    }

    const response = await fetch(`${this.baseUrl}/moderations`, {
      method: "POST",
      headers: {
        ...this.headers,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: this.moderationModel,
        input: text
      })
    });

    if (!response.ok) {
      return null;
    }

    const payload = await response.json();
    const first = payload.results?.[0];

    if (!first) {
      return null;
    }

    const categoryScores = first.category_scores || {};
    const score = Math.max(0, ...Object.values(categoryScores));

    return {
      flagged: Boolean(first.flagged),
      score
    };
  }

  async translateText({ text, sourceLanguage, targetLanguage }) {
    if (!this.isReady() || !text || !targetLanguage) {
      return null;
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        ...this.headers,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: this.translationModel,
        temperature: 0,
        messages: [
          {
            role: "system",
            content:
              "You are a translation engine. Return only translated text and no commentary."
          },
          {
            role: "user",
            content: `Translate from ${sourceLanguage || "auto"} to ${targetLanguage}: ${text}`
          }
        ]
      })
    });

    if (!response.ok) {
      return null;
    }

    const payload = await response.json();
    return payload.choices?.[0]?.message?.content?.trim() || null;
  }

  async transcribeBase64Audio({ audioBase64, mimeType = "audio/webm", language }) {
    if (!this.isReady() || !audioBase64) {
      return null;
    }

    const form = new FormData();
    const buffer = Buffer.from(audioBase64, "base64");

    form.append("model", this.sttModel);
    form.append("file", buffer, {
      filename: "audio.webm",
      contentType: mimeType
    });

    if (language) {
      form.append("language", language);
    }

    try {
      const response = await axios.post(`${this.baseUrl}/audio/transcriptions`, form, {
        headers: {
          ...this.headers,
          ...form.getHeaders()
        },
        timeout: 15000
      });

      return response.data?.text?.trim() || null;
    } catch (_error) {
      return null;
    }
  }
}
