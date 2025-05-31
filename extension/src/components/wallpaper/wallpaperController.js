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

import { setWallpaperByName, renderCachedWallpaperInstantly, preloadAllWallpapers } from './wallpaperRenderer.js';
import { initTimelineScroll } from '../timeline/timelineScroll.js';
import { clearWallpapersDB, saveWallpaperToDB, getWallpaperFromDB } from './wallpaperDB.js';


let baseWallpaperIndex = 0;


export async function initWallpaperSystem() {
    await loadWallpaperData();  // Load wallpaper config
    const index = findIndexForCurrentTime();
    setBaseWallpaperIndex(index);
    setTimeBasedIndex(index);
    setCurrentIndex(index);
    setMode('time-based');

    const imageName = getImageNameAtIndex(index);
    if (imageName) {
        await renderCachedWallpaperInstantly(imageName); // 👈 show correct image
        await setWallpaperByName(imageName, { immediate: true }); // update with animation
    }

    preloadAllWallpapers();  // Async preload in background
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


document.getElementById('changeWallpaper').addEventListener('click', () => {
    const sidebar = document.getElementById('wallpaperSidebar');
    const changeWallpaperBtn = document.getElementById('changeWallpaper');
    sidebar.classList.add('open');
    changeWallpaperBtn.style.display = 'none';
});

// Add click outside handler
document.addEventListener('click', (event) => {
    const sidebar = document.getElementById('wallpaperSidebar');
    const changeWallpaperBtn = document.getElementById('changeWallpaper');
    
    // Check if click is outside sidebar and not on the change wallpaper button
    if (!sidebar.contains(event.target) && !changeWallpaperBtn.contains(event.target)) {
        sidebar.classList.remove('open');
        changeWallpaperBtn.style.display = 'block';
    }
});

document.querySelectorAll('.wallpaper-set-item').forEach(item => {
    item.addEventListener('click', async () => {
        const selectedSet = item.getAttribute('data-set');
        const changeWallpaperBtn = document.getElementById('changeWallpaper');
    
        // Clear relevant storage and memory
        await clearWallpapersDB();

        await chrome.storage.local.set({
            wallpaper_set: selectedSet,
            wallpaper_config: null,
        });
        
        await initWallpaperSystem();
        // Reinitialize timeline scroll to reset its state
        initTimelineScroll();
    
        document.getElementById('wallpaperSidebar').classList.remove('open');
        changeWallpaperBtn.style.display = 'block';
    });    
});


chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'updateWallpaper') {
        updateWallpaperToCurrentTime();
    }
});

document.addEventListener('DOMContentLoaded', async () => {
    await initWallpaperSystem();
});

