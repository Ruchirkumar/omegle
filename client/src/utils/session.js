const STORAGE_KEY = "omegle-next-session-id";

const generateFallbackId = () =>
  `sid-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;

export const getOrCreateSessionId = () => {
  let existing = null;

  try {
    existing = window.localStorage.getItem(STORAGE_KEY);
  } catch (_error) {
    return generateFallbackId();
  }

  if (existing) {
    return existing;
  }

  const generated = window.crypto?.randomUUID?.() || generateFallbackId();

  try {
    window.localStorage.setItem(STORAGE_KEY, generated);
  } catch (_error) {
    return generated;
  }

  return generated;
};
