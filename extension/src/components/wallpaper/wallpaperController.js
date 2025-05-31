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
import { clearWallpapersDB } from './wallpaperDB.js';

class WallpaperController {
    constructor() {
        this.baseWallpaperIndex = 0;
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Change wallpaper button
        document.getElementById('changeWallpaper').addEventListener('click', () => {
            const sidebar = document.getElementById('wallpaperSidebar');
            const changeWallpaperBtn = document.getElementById('changeWallpaper');
            sidebar.classList.add('open');
            changeWallpaperBtn.style.display = 'none';
        });

        // Click outside handler
        document.addEventListener('click', (event) => {
            const sidebar = document.getElementById('wallpaperSidebar');
            const changeWallpaperBtn = document.getElementById('changeWallpaper');
            
            if (!sidebar.contains(event.target) && !changeWallpaperBtn.contains(event.target)) {
                sidebar.classList.remove('open');
                changeWallpaperBtn.style.display = 'block';
            }
        });

        // Wallpaper set selection
        document.querySelectorAll('.wallpaper-set-item').forEach(item => {
            item.addEventListener('click', () => this.handleWallpaperSetChange(item));
        });

        // Chrome message listener
        chrome.runtime.onMessage.addListener((message) => {
            if (message.action === 'updateWallpaper') {
                this.updateWallpaperToCurrentTime();
            }
        });

        // Initial load
        document.addEventListener('DOMContentLoaded', () => this.initWallpaperSystem());
    }

    async handleWallpaperSetChange(item) {
        const selectedSet = item.getAttribute('data-set');
        const changeWallpaperBtn = document.getElementById('changeWallpaper');
    
        await clearWallpapersDB();
        await chrome.storage.local.set({
            wallpaper_set: selectedSet,
            wallpaper_config: null,
        });
        
        await this.initWallpaperSystem();
        initTimelineScroll();
    
        document.getElementById('wallpaperSidebar').classList.remove('open');
        changeWallpaperBtn.style.display = 'block';
    }

    async initWallpaperSystem() {
        await loadWallpaperData();
        const index = findIndexForCurrentTime();
        this.setBaseWallpaperIndex(index);
        setTimeBasedIndex(index);
        setCurrentIndex(index);
        setMode('time-based');

        const imageName = getImageNameAtIndex(index);
        if (imageName) {
            await renderCachedWallpaperInstantly(imageName);
            await setWallpaperByName(imageName, { immediate: true });
        }

        preloadAllWallpapers();
    }

    async updateWallpaperToCurrentTime() {
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

    async switchWallpaper(direction = 'forward') {
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

    async resetWallpaper() {
        setMode('time-based');

        const index = getTimeBasedIndex();
        setCurrentIndex(index);

        const imageName = getImageNameAtIndex(index);
        if (imageName) {
            await setWallpaperByName(imageName);
            console.log(`✅ Reset to time-based wallpaper: ${imageName}`);
        }
    }

    setBaseWallpaperIndex(index) {
        this.baseWallpaperIndex = index;
    }

    getBaseWallpaperIndex() {
        return this.baseWallpaperIndex;
    }
}

// Create singleton instance
const wallpaperController = new WallpaperController();

// Export the instance methods
export const initWallpaperSystem = () => wallpaperController.initWallpaperSystem();
export const updateWallpaperToCurrentTime = () => wallpaperController.updateWallpaperToCurrentTime();
export const switchWallpaper = (direction) => wallpaperController.switchWallpaper(direction);
export const resetWallpaper = () => wallpaperController.resetWallpaper();
export const setBaseWallpaperIndex = (index) => wallpaperController.setBaseWallpaperIndex(index);
export const getBaseWallpaperIndex = () => wallpaperController.getBaseWallpaperIndex();

