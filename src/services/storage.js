export const db = {
  get: async (key) => {
    try {
      if (!window.storage) return null;
      const result = await window.storage.get(key);
      return result ? JSON.parse(result.value) : null;
    } catch {
      return null;
    }
  },
  set: async (key, value) => {
    try {
      if (!window.storage) return;
      await window.storage.set(key, JSON.stringify(value));
    } catch {}
  },
};
