import {
    loadWallpaperData,
    getWallpaperList,
    getCurrentIndex,
    setCurrentIndex,
    getCurrentMode,
    setMode,
    setTimeBasedIndex,
    getTimeBasedIndex,
    findIndexForCurrentTime,
    getImageNameAtIndex
} from './wallpaperData.js';

import { setWallpaperByName, renderCachedWallpaperInstantly } from './wallpaperRenderer.js';

let baseWallpaperIndex = 0;


export async function initWallpaperSystem() {

    // Show instantly from cache
    await renderCachedWallpaperInstantly();

    await loadWallpaperData();

    const index = findIndexForCurrentTime();
    setBaseWallpaperIndex(index); // ✅ add this
    setTimeBasedIndex(index);
    setCurrentIndex(index);
    setMode('time-based');

    const imageName = getImageNameAtIndex(index);
    if (imageName) {
        const result = await chrome.storage.local.get('current_wallpaper');
        const cached = result.current_wallpaper?.name;
        const useImmediate = cached === imageName;

        await setWallpaperByName(imageName, { immediate: useImmediate });
    }
}


export async function updateWallpaperToCurrentTime() {
    if (getCurrentMode() !== 'time-based') return;

    const index = findIndexForCurrentTime();
    setTimeBasedIndex(index);
    setCurrentIndex(index);

    const imageName = getImageNameAtIndex(index);
    if (imageName) {
        await setWallpaperByName(imageName);
        console.log(`🕒 Updated to current time-based wallpaper: ${imageName}`);
    }
}

export async function switchWallpaper(direction = 'forward') {
    setMode('temporary');

    const list = getWallpaperList();
    let index = getCurrentIndex();

    index = direction === 'forward'
        ? (index + 1) % list.length
        : (index - 1 + list.length) % list.length;

    setCurrentIndex(index);

    const imageName = getImageNameAtIndex(index);
    if (imageName) {
        await setWallpaperByName(imageName);
        console.log(`🔁 Switched wallpaper temporarily (${direction}): ${imageName}`);
    }
}

export async function resetWallpaper() {
    setMode('time-based');

    const index = getTimeBasedIndex();
    setCurrentIndex(index);

    const imageName = getImageNameAtIndex(index);
    if (imageName) {
        await setWallpaperByName(imageName);
        console.log(`✅ Reset to time-based wallpaper: ${imageName}`);
    }
}


export function setBaseWallpaperIndex(index) {
  baseWallpaperIndex = index;
}

export function getBaseWallpaperIndex() {
  return baseWallpaperIndex;
}


chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'updateWallpaper') {
        updateWallpaperToCurrentTime();
    }
});

document.addEventListener('DOMContentLoaded', () => {
    initWallpaperSystem();
});