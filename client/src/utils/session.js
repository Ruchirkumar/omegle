const STORAGE_KEY = "omegle-next-session-id";

export const getOrCreateSessionId = () => {
  const existing = window.localStorage.getItem(STORAGE_KEY);

  if (existing) {
    return existing;
  }

  const generated = crypto.randomUUID();
  window.localStorage.setItem(STORAGE_KEY, generated);
  return generated;
};
