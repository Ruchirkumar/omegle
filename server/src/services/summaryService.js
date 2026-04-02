const STOP_WORDS = new Set([
  "the",
  "and",
  "that",
  "this",
  "have",
  "with",
  "from",
  "your",
  "about",
  "what",
  "were",
  "when",
  "where",
  "would",
  "there",
  "their",
  "them",
  "they",
  "just",
  "like",
  "into",
  "also",
  "chat",
  "yeah",
  "okay",
  "really",
  "very",
  "because"
]);

const tokenize = (text = "") =>
  `${text}`
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token));

export class SummaryService {
  summarize(messages = []) {
    const frequencies = new Map();

    for (const message of messages) {
      for (const token of tokenize(message.originalText || "")) {
        frequencies.set(token, (frequencies.get(token) || 0) + 1);
      }
    }

    const keywords = [...frequencies.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([token]) => token);

    if (keywords.length === 0) {
      return "You had a short chat and explored a few quick topics.";
    }

    if (keywords.length === 1) {
      return `You talked mostly about ${keywords[0]}.`;
    }

    if (keywords.length === 2) {
      return `You talked about ${keywords[0]} and ${keywords[1]}.`;
    }

    return `You talked about ${keywords[0]}, ${keywords[1]}, and ${keywords[2]}.`;
  }
}
