import { STORAGE_KEY } from "../constants";

export const readStoredState = () => {
  try {
    if (typeof window === "undefined") {
      return null;
    }
    const stored = window.localStorage?.getItem(STORAGE_KEY);
    if (!stored) {
      return null;
    }
    const parsed = JSON.parse(stored);
    if (
      parsed &&
      Array.isArray(parsed.conversations) &&
      parsed.conversations.length > 0
    ) {
      return parsed;
    }
  } catch (error) {
    // Ignore invalid storage.
  }
  return null;
};

export const writeStoredState = (state) => {
  try {
    const payload = JSON.stringify(state);
    window.localStorage?.setItem(STORAGE_KEY, payload);
  } catch (error) {
    // Ignore storage errors (quota, privacy mode, etc.)
  }
};
