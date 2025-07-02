class WallpaperDataManager {
    constructor() {
        this.wallpaperSet = 'oregon_mthood';
        this.wallpaperList = [];
        this.currentIndex = 0;
        this.timeBasedIndex = 0;
        this.currentMode = 'time-based';
        this.CONFIG_URL = '';
    }

    timeToMinutes(timeStr) {
        const [h, m] = timeStr.split(':').map(Number);
        return h * 60 + m;
    }

    async loadData() {
        const CACHE_KEY = 'wallpaper_config';
        const { wallpaper_set } = await chrome.storage.local.get('wallpaper_set');
        this.wallpaperSet = wallpaper_set || 'oregon_mthood';
        this.CONFIG_URL = `https://testing-3fc8b.web.app/${this.wallpaperSet}/wallpaper-config.json`;

        try {
            const result = await chrome.storage.local.get(CACHE_KEY);
            const cachedData = result[CACHE_KEY];

            if (cachedData) {
                this.wallpaperList = this.processWallpaperData(cachedData);
                return;
            }

            const response = await fetch(this.CONFIG_URL);
            const data = await response.json();
            this.wallpaperList = this.processWallpaperData(data);

            await chrome.storage.local.set({
                [CACHE_KEY]: data
            });
        } catch (err) {
            // Add fallback to default set
            this.wallpaperSet = 'oregon_mthood';
            this.CONFIG_URL = `https://testing-3fc8b.web.app/${this.wallpaperSet}/wallpaper-config.json`;
            try {
                const response = await fetch(this.CONFIG_URL);
                const data = await response.json();
                this.wallpaperList = this.processWallpaperData(data);
            } catch (retryErr) {
                this.wallpaperList = []; // Prevent errors with empty list
            }
        }
    }

    processWallpaperData(data) {
        if (!Array.isArray(data)) {
            return [];
        }
        return data.map((entry, index) => ({
            ...entry,
            minutes: this.timeToMinutes(entry.time),
            index
        })).sort((a, b) => a.minutes - b.minutes);
    }

    findIndexForCurrentTime() {
        const now = new Date();
        const minutesNow = now.getHours() * 60 + now.getMinutes();

        let index = -1;
        for (let i = 0; i < this.wallpaperList.length; i++) {
            if (this.wallpaperList[i].minutes <= minutesNow) {
                index = i;
            } else {
                break;
            }
        }
        return index === -1 ? this.wallpaperList.length - 1 : index;
    }

    getWallpaperList() {
        return this.wallpaperList;
    }

    getCurrentIndex() {
        return this.currentIndex;
    }

    getCurrentMode() {
        return this.currentMode;
    }

    setCurrentIndex(index) {
        this.currentIndex = index;
    }

    setTimeBasedIndex(index) {
        this.timeBasedIndex = index;
    }

    getTimeBasedIndex() {
        return this.timeBasedIndex;
    }

    setMode(mode) {
        this.currentMode = mode;
    }

    getImageNameAtIndex(index) {
        return this.wallpaperList[index]?.image || null;
    }

    getWallpaperSet() {
        return this.wallpaperSet;
    }
}

// Create singleton instance
const wallpaperData = new WallpaperDataManager();

// Export the instance methods
export const loadWallpaperData = () => wallpaperData.loadData();
export const getWallpaperList = () => wallpaperData.getWallpaperList();
export const getCurrentIndex = () => wallpaperData.getCurrentIndex();
export const setCurrentIndex = (index) => wallpaperData.setCurrentIndex(index);
export const getCurrentMode = () => wallpaperData.getCurrentMode();
export const setMode = (mode) => wallpaperData.setMode(mode);
export const setTimeBasedIndex = (index) => wallpaperData.setTimeBasedIndex(index);
export const getTimeBasedIndex = () => wallpaperData.getTimeBasedIndex();
export const findIndexForCurrentTime = () => wallpaperData.findIndexForCurrentTime();
export const getImageNameAtIndex = (index) => wallpaperData.getImageNameAtIndex(index);
export const getWallpaperSet = () => wallpaperData.getWallpaperSet();
