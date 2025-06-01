import { getWallpaperList } from './wallpaperData.js';
import { saveWallpaperToDB, getWallpaperFromDB } from './wallpaperDB.js';

const TRANSITION_DURATION = 1000;

class WallpaperManager {
    constructor() {
        this.container = this.getOrCreateContainer();
        this.currentBlobUrl = null;  // Track current blob URL
        this.blobUrlCache = new Map();  // Cache for blob URLs
        console.log('[CACHE] Initialized blob URL cache');
    }

    getOrCreateContainer() {
        const containerId = 'wallpaper-transition-container';
        let container = document.getElementById(containerId);
        if (!container) {
            container = document.createElement('div');
            container.id = containerId;
            document.body.appendChild(container);
        }
        return container;
    }

    async getWallpaperSet() {
        const { wallpaper_set } = await chrome.storage.local.get('wallpaper_set');
        return wallpaper_set || 'oregon_mthood';
    }

    async getFullImageUrl(imageName) {
        const set = await this.getWallpaperSet();
        return `https://catch-up-f6fa1.web.app/${set}/${imageName}`;
    }

    async fetchAndCacheWallpaper(imageName, cache = true) {
        const set = await this.getWallpaperSet();
        let blob = await getWallpaperFromDB(set, imageName);

        if (!blob) {
            const url = await this.getFullImageUrl(imageName);
            console.time(`[FETCH] ${imageName}`);
            const response = await fetch(url);
            blob = await response.blob();
            console.timeEnd(`[FETCH] ${imageName}`);

            if (cache) {
                await saveWallpaperToDB(set, imageName, blob);
            }
        } else {
            console.log(`[IndexedDB] Loaded blob for ${imageName}`);
        }

        return blob;
    }

    createWallpaperElement(blobUrl, className) {
        const div = document.createElement('div');
        div.className = `wallpaper-slide ${className}`;
        div.style.backgroundImage = `url("${blobUrl}")`;
        return div;
    }

    revokeCurrentBlobUrl() {
        if (this.currentBlobUrl) {
            URL.revokeObjectURL(this.currentBlobUrl);
            this.currentBlobUrl = null;
        }
    }

    async getBlobUrl(imageName) {
        // Check cache first
        if (this.blobUrlCache.has(imageName)) {
            console.log(`[CACHE] Hit: Using cached URL for ${imageName}`);
            return this.blobUrlCache.get(imageName);
        }

        // If not in cache, create new URL
        console.log(`[CACHE] Miss: Creating new URL for ${imageName}`);
        const blob = await this.fetchAndCacheWallpaper(imageName);
        const blobUrl = URL.createObjectURL(blob);
        this.blobUrlCache.set(imageName, blobUrl);
        console.log(`[CACHE] Added: New URL cached for ${imageName}`);
        return blobUrl;
    }

    revokeAllBlobUrls() {
        console.log(`[CACHE] Clearing ${this.blobUrlCache.size} cached URLs`);
        this.blobUrlCache.forEach((url, imageName) => {
            console.log(`[CACHE] Revoking URL for ${imageName}`);
            URL.revokeObjectURL(url);
        });
        this.blobUrlCache.clear();
        this.revokeCurrentBlobUrl();
        console.log('[CACHE] All URLs cleared');
    }

    async setWallpaper(imageName, { cache = true, immediate = false } = {}) {
        console.log(`[WALLPAPER] Setting wallpaper: ${imageName}`);
        const blobUrl = await this.getBlobUrl(imageName);
        this.currentBlobUrl = blobUrl;

        if (immediate) {
            console.log(`[WALLPAPER] Immediate set for ${imageName}`);
            this.container.innerHTML = '';
            this.container.appendChild(this.createWallpaperElement(blobUrl, 'final'));
            return;
        }

        // Get the current wallpaper if it exists
        const oldSlide = this.container.querySelector('.wallpaper-slide');
        const oldBg = oldSlide ? oldSlide.style.backgroundImage : 'none';

        // Create the old wallpaper element
        const oldDiv = document.createElement('div');
        oldDiv.className = 'wallpaper-slide current';
        oldDiv.style.backgroundImage = oldBg;

        // Create the new wallpaper element
        const newDiv = document.createElement('div');
        newDiv.className = 'wallpaper-slide new';
        newDiv.style.backgroundImage = `url("${blobUrl}")`;

        // Add both elements to the container
        this.container.appendChild(oldDiv);
        this.container.appendChild(newDiv);

        // Force reflow to ensure transitions work
        oldDiv.offsetHeight;
        newDiv.offsetHeight;

        // Start the transition
        requestAnimationFrame(() => {
            oldDiv.style.opacity = '0';
            newDiv.style.opacity = '1';
        });

        // Return a Promise that resolves after the transition
        return new Promise(resolve => {
            setTimeout(() => {
                const finalDiv = document.createElement('div');
                finalDiv.className = 'wallpaper-slide final';
                finalDiv.style.backgroundImage = `url("${blobUrl}")`;
                this.container.innerHTML = '';
                this.container.appendChild(finalDiv);
                console.log(`[WALLPAPER] Transition complete for ${imageName}`);
                resolve();
            }, TRANSITION_DURATION);
        });
    }

    async renderCachedWallpaperInstantly(imageName) {
        const set = await this.getWallpaperSet();
        const blob = await getWallpaperFromDB(set, imageName);
        if (!blob) return;

        const blobUrl = URL.createObjectURL(blob);
        this.container.innerHTML = '';
        this.container.appendChild(this.createWallpaperElement(blobUrl, 'final'));
    }

    async preloadAllWallpapers() {
        const set = await this.getWallpaperSet();
        const preloadPromises = getWallpaperList().map(async (item) => {
            const exists = await getWallpaperFromDB(set, item.image);
            if (exists) return;

            const url = await this.getFullImageUrl(item.image);
            const response = await fetch(url);
            const blob = await response.blob();
            await saveWallpaperToDB(set, item.image, blob);
        });

        await Promise.all(preloadPromises);
    }
}

// Create a singleton instance
const wallpaperManager = new WallpaperManager();

// Export the instance methods
export const setWallpaperByName = (imageName, options) => wallpaperManager.setWallpaper(imageName, options);
export const renderCachedWallpaperInstantly = (imageName) => wallpaperManager.renderCachedWallpaperInstantly(imageName);
export const preloadAllWallpapers = () => wallpaperManager.preloadAllWallpapers();
export const revokeAllBlobUrls = () => wallpaperManager.revokeAllBlobUrls();