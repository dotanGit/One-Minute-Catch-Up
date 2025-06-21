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
      
      // Check if this key already exists
      const keyExists = cacheKeys.includes(dateKey);

      // Only clean up if we're adding a NEW key AND we're at the limit
      if (!keyExists && cacheKeys.length >= this.maxEntries) {
        const oldestKeys = cacheKeys.sort().slice(0, cacheKeys.length - this.maxEntries + 1);
        await chrome.storage.local.remove(oldestKeys);
      } else {
        console.log('[CACHE] ✅ No cleanup needed');
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
      console.log('[CACHE] ✅ Cache set successfully for:', dateKey, { wasNew: !keyExists });
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


// === First 6 Events HTML Cache ===
export async function saveFirst6EventsHTML(htmlString) {
  try {
    await chrome.storage.local.set({ first6events_html: htmlString });
    console.log('[CACHE] 📦 First 6 events HTML saved');
  } catch (error) {
    console.error('[CACHE] ❌ Error saving first 6 events HTML:', error);
  }
}

export async function loadFirst6EventsHTML() {
  try {
    const result = await chrome.storage.local.get('first6events_html');
    return result.first6events_html || null;
  } catch (error) {
    console.error('[CACHE] ❌ Error loading first 6 events HTML:', error);
    return null;
  }
}

export async function clearFirst6EventsHTML() {
  try {
    await chrome.storage.local.remove('first6events_html');
    console.log('[CACHE] 🧹 First 6 events HTML cleared');
  } catch (error) {
    console.error('[CACHE] ❌ Error clearing first 6 events HTML:', error);
  }
}