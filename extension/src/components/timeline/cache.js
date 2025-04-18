export const timelineCache = {
    maxEntries: 7,
  
    async get(dateKey) {
      try {
        const result = await chrome.storage.local.get(dateKey);
        return result[dateKey];
      } catch (error) {
        console.error('Cache read error:', error);
        return null;
      }
    },
  
    async set(dateKey, data) {
      try {
        const allKeys = await chrome.storage.local.get(null);
        const cacheKeys = Object.keys(allKeys).filter(key => key.startsWith('timeline_'));
  
        if (cacheKeys.length >= this.maxEntries) {
          const oldestKeys = cacheKeys
            .sort()
            .slice(0, cacheKeys.length - this.maxEntries + 1);
          await chrome.storage.local.remove(oldestKeys);
        }
  
        await chrome.storage.local.set({
          [dateKey]: {
            timestamp: Date.now(),
            lastFetchedAt: Date.now(), // 🔁 for delta logic
            data: data,
            date: dateKey.split('_')[1]
          }
        });
      } catch (error) {
        console.error('Cache write error:', error);
      }
    }
  };