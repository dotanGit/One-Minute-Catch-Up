import { getWallpaperList } from './wallpaperData.js';
import { saveWallpaperToDB, getWallpaperFromDB } from './wallpaperDB.js';

const TRANSITION_DURATION = 1000;

export async function setWallpaperByName(imageName, { cache = true, immediate = false } = {}) {
    const { wallpaper_set } = await chrome.storage.local.get('wallpaper_set');
    const set = wallpaper_set || 'oregon_mthood';

    let blob = await getWallpaperFromDB(set, imageName);

    if (!blob) {
        const url = await getFullImageUrl(imageName);
        const response = await fetch(url);
        blob = await response.blob();
        if (cache) {
            await saveWallpaperToDB(set, imageName, blob);
        }
    } else {
        console.log(`[IndexedDB] Loaded blob for ${imageName}`);
    }

    const blobUrl = URL.createObjectURL(blob);
    const containerId = 'wallpaper-transition-container';
    let container = document.getElementById(containerId);
    if (!container) {
        container = document.createElement('div');
        container.id = containerId;
        document.body.appendChild(container);
    }

    if (immediate) {
        const finalDiv = document.createElement('div');
        finalDiv.className = 'wallpaper-slide final';
        finalDiv.style.backgroundImage = `url("${blobUrl}")`;
        container.innerHTML = '';
        container.appendChild(finalDiv);
        return;
    }

    const oldSlide = container.querySelector('.wallpaper-slide');
    const oldBg = oldSlide ? oldSlide.style.backgroundImage : 'none';

    const oldDiv = document.createElement('div');
    oldDiv.className = 'wallpaper-slide current';
    oldDiv.style.backgroundImage = oldBg;

    const newDiv = document.createElement('div');
    newDiv.className = 'wallpaper-slide new';
    newDiv.style.backgroundImage = `url("${blobUrl}")`;

    container.innerHTML = '';
    container.appendChild(oldDiv);
    container.appendChild(newDiv);

    oldDiv.offsetHeight;
    newDiv.offsetHeight;

    requestAnimationFrame(() => {
        oldDiv.style.opacity = '0';
        newDiv.style.opacity = '1';
    });

    return new Promise(resolve => {
        setTimeout(() => {
            const finalDiv = document.createElement('div');
            finalDiv.className = 'wallpaper-slide final';
            finalDiv.style.backgroundImage = `url("${blobUrl}")`;
            container.innerHTML = '';
            container.appendChild(finalDiv);
            resolve();
        }, TRANSITION_DURATION);
    });
}

export async function renderCachedWallpaperInstantly(imageName) {
    const { wallpaper_set } = await chrome.storage.local.get('wallpaper_set');
    const set = wallpaper_set || 'oregon_mthood';

    const blob = await getWallpaperFromDB(set, imageName);
    if (!blob) return;

    const blobUrl = URL.createObjectURL(blob);
    const containerId = 'wallpaper-transition-container';
    let container = document.getElementById(containerId);
    if (!container) {
        container = document.createElement('div');
        container.id = containerId;
        document.body.appendChild(container);
    }

    const finalDiv = document.createElement('div');
    finalDiv.className = 'wallpaper-slide final';
    finalDiv.style.backgroundImage = `url("${blobUrl}")`;
    container.innerHTML = '';
    container.appendChild(finalDiv);
}

export async function preloadAllWallpapers() {
    const preloadPromises = getWallpaperList().map(async (item) => {
        const { wallpaper_set } = await chrome.storage.local.get('wallpaper_set');
        const set = wallpaper_set || 'oregon_mthood';

        const exists = await getWallpaperFromDB(set, item.image);
        if (exists) return;

        const url = await getFullImageUrl(item.image);
        const response = await fetch(url);
        const blob = await response.blob();
        await saveWallpaperToDB(set, item.image, blob);
    });

    await Promise.all(preloadPromises);
}

export function getFullImageUrl(imageName) {
    return new Promise((resolve) => {
        chrome.storage.local.get('wallpaper_set').then(({ wallpaper_set }) => {
            const set = wallpaper_set || 'oregon_mthood';
            resolve(`https://catch-up-f6fa1.web.app/${set}/${imageName}`);
        });
    });
}
