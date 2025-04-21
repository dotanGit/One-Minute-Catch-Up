export const timelineCache = {
  maxEntries: 7,

  async get(dateKey) {
    try {
      const result = await chrome.storage.local.get(dateKey);
      return result[dateKey];
    } catch (error) {
      console.error('[CACHE] ❌ Read error:', error);
      return null;
    }
  },

  async set(dateKey, data) {
    try {
      const allKeys = await chrome.storage.local.get(null);
      const cacheKeys = Object.keys(allKeys).filter(key => key.startsWith('timeline_'));

      if (cacheKeys.length >= this.maxEntries) {
        const oldestKeys = cacheKeys.sort().slice(0, cacheKeys.length - this.maxEntries + 1);
        await chrome.storage.local.remove(oldestKeys);
      }

      const payload = data?.data && data?.lastFetchedAt
        ? data
        : {
            timestamp: Date.now(),
            lastFetchedAt: Date.now(),
            data: data,
            date: dateKey.split('_')[1]
          };

      await chrome.storage.local.set({ [dateKey]: payload });
    } catch (error) {
      console.error('[CACHE] ❌ Write error:', error);
    }
  }
};


export async function cleanupHiddenEventIdsFromCache() {
  const allItems = await chrome.storage.local.get(null);
  const validIds = new Set();

  Object.entries(allItems).forEach(([key, value]) => {
    if (!key.startsWith('timeline_')) return;
    const data = value?.data;
    if (!data) return;

    (data.history || []).forEach(e => validIds.add(String(e.id)));
    (data.drive?.files || []).forEach(e => validIds.add(String(e.id)));
    (data.emails?.all || []).forEach(e => validIds.add(String(e.threadId)));
    (data.calendar?.today || []).forEach(e => validIds.add(String(e.id)));
    (data.calendar?.tomorrow || []).forEach(e => validIds.add(String(e.id)));
    (data.downloads || []).forEach(e => validIds.add(String(e.id)));
  });

  const result = await chrome.storage.local.get('hiddenEventIds');
  const oldHidden = result.hiddenEventIds || [];

  const cleaned = oldHidden.filter(id => validIds.has(id));
  await chrome.storage.local.set({ hiddenEventIds: cleaned });
}
