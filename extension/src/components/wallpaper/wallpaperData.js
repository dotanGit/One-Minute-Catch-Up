let CONFIG_URL = '';
let wallpaperSet = 'oregon_mthood'; // default fallback
let wallpaperList = [];
let currentIndex = 0;
let timeBasedIndex = 0;
let currentMode = 'time-based'; // 'time-based' or 'temporary'

function timeToMinutes(timeStr) {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
}

export async function loadWallpaperData() {
    const CACHE_KEY = 'wallpaper_config';
    const { wallpaper_set } = await chrome.storage.local.get('wallpaper_set');
    wallpaperSet = wallpaper_set || 'oregon_mthood';
    CONFIG_URL = `https://catch-up-f6fa1.web.app/${wallpaperSet}/wallpaper-config.json`;

    try {
        const result = await chrome.storage.local.get(CACHE_KEY);
        const cachedData = result[CACHE_KEY];

        if (cachedData) {
            wallpaperList = cachedData.map((entry, index) => ({
                ...entry,
                image: entry.image,
                minutes: timeToMinutes(entry.time),
                index
            }));
            wallpaperList.sort((a, b) => a.minutes - b.minutes);
            console.log('🗂️ Loaded wallpaper config from cache');
            return;
        }

        // If not cached, fetch from network
        const response = await fetch(CONFIG_URL);
        const data = await response.json();

        wallpaperList = data.map((entry, index) => ({
            ...entry,
            minutes: timeToMinutes(entry.time),
            index
        }));

        wallpaperList.sort((a, b) => a.minutes - b.minutes);

        await chrome.storage.local.set({
            [CACHE_KEY]: data
        });

        console.log('🌐 Fetched and cached wallpaper config from network');
    } catch (err) {
        console.error('❌ Failed to load wallpaper config:', err);
    }
}


export function getWallpaperList() {
    return wallpaperList;
}

export function getCurrentIndex() {
    return currentIndex;
}

export function getCurrentMode() {
    return currentMode;
}

export function setCurrentIndex(index) {
    currentIndex = index;
}

export function setTimeBasedIndex(index) {
    timeBasedIndex = index;
}

export function getTimeBasedIndex() {
    return timeBasedIndex;
}

export function setMode(mode) {
    currentMode = mode;
}

export function findIndexForCurrentTime() {

    console.log("🕒 Current time:", new Date().toLocaleTimeString());
console.log("⏱ Wallpaper schedule:", wallpaperList.map(w => `${w.minutes} → ${w.image}`));


  const now = new Date();
  const minutesNow = now.getHours() * 60 + now.getMinutes();

  let index = -1;

  for (let i = 0; i < wallpaperList.length; i++) {
    if (wallpaperList[i].minutes <= minutesNow) {
      index = i;
    } else {
      break;
    }
  }

  console.log("🎯 Selected index:", index, "→", wallpaperList[index]?.image);


  if (index === -1) {
    // אם אנחנו לפני התמונה הראשונה – נחזיר את האחרונה
    index = wallpaperList.length - 1;
  }

  return index;
}


export function getImageNameAtIndex(index) {
    return wallpaperList[index]?.image || null;
}
