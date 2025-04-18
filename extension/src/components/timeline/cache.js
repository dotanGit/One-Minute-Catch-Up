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
          const oldestKeys = cacheKeys.sort().slice(0, cacheKeys.length - this.maxEntries + 1);
          console.log(`[CACHE] 🧹 Removing oldest keys: ${oldestKeys.join(', ')}`);
          await chrome.storage.local.remove(oldestKeys);
        }
    
        const payload = {
          timestamp: Date.now(),
          lastFetchedAt: Date.now(),
          data: data,
          date: dateKey.split('_')[1]
        };
    
        console.log(`[CACHE] 💾 Saving cache for ${dateKey} → history: ${data?.history?.length ?? 'null'}, downloads: ${data?.downloads?.length ?? 'null'}`);
    
        await chrome.storage.local.set({ [dateKey]: payload });
      } catch (error) {
        console.error('[CACHE] ❌ Write error:', error);
      }
    }
    
  };