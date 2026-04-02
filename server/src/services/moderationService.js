import Filter from "bad-words";

export class ModerationService {
  constructor({ provider = "mock", openAiGateway } = {}) {
    this.filter = new Filter();
    this.provider = provider;
    this.openAiGateway = openAiGateway;
  }

  sanitizeMessage(text) {
    const normalized = `${text || ""}`.trim();

    if (!normalized) {
      return {
        cleanedText: "",
        containsProfanity: false
      };
    }

    return {
      cleanedText: this.filter.clean(normalized),
      containsProfanity: this.filter.isProfane(normalized)
    };
  }

  async evaluateWithAiModeration(text) {
    if (!text) {
      return {
        flagged: false,
        score: 0,
        provider: this.provider
      };
    }

    if (this.provider === "openai") {
      const result = await this.openAiGateway?.moderateText(text);

      if (result) {
        return {
          ...result,
          provider: "openai"
        };
      }

      return {
        flagged: false,
        score: 0,
        provider: "openai",
        note: "OpenAI moderation unavailable; fallback allowed message."
      };
    }

    if (this.provider === "mock") {
      const hasViolentIntent = /kill|attack|bomb|shoot/i.test(text);
      return {
        flagged: hasViolentIntent,
        score: hasViolentIntent ? 0.85 : 0.1,
        provider: "mock"
      };
    }

    return {
      flagged: false,
      score: 0,
      provider: this.provider,
      note: "Integrate your moderation API provider here."
    };
  }
}
