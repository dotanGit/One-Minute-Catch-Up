const CONFIG_URL = 'https://catch-up-f6fa1.web.app/above_clouds/wallpaper-config.json';

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

    try {
        const result = await chrome.storage.local.get(CACHE_KEY);
        const cachedData = result[CACHE_KEY];

        if (cachedData) {
            wallpaperList = cachedData.map((entry, index) => ({
                ...entry,
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
    const now = new Date();
    const minutesNow = now.getHours() * 60 + now.getMinutes();

    let index = 0;
    for (let i = 0; i < wallpaperList.length; i++) {
        if (wallpaperList[i].minutes <= minutesNow) {
            index = i;
        } else {
            break;
        }
    }
    return index;
}

export function getImageNameAtIndex(index) {
    return wallpaperList[index]?.image || null;
}
