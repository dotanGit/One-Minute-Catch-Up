const DB_NAME = 'WallpaperDB';
const DB_VERSION = 1;
const STORE_NAME = 'wallpapers';

class WallpaperDB {
    constructor() {
        this.db = null;
        this.initPromise = this.init();
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            
            request.onerror = () => {
                // Try to recover by closing and reopening
                if (this.db) {
                    this.db.close();
                    this.db = null;
                }
                reject(request.error);
            };
            
            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME, { keyPath: 'name' });
                }
            };
        });
    }

    async ensureDB() {
        if (!this.db) {
            await this.initPromise;
        }
        return this.db;
    }

    async getWallpaper(set, name) {
        const key = `${set}/${name}`;

        const db = await this.ensureDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const req = store.get(key);
            
            req.onsuccess = () => {
                if (req.result?.data) {
                    resolve(req.result.data);
                } else {
                    resolve(null);
                }
            };
            req.onerror = () => reject(req.error);
        });
    }

    async saveWallpaper(set, name, blob) {
        const key = `${set}/${name}`;

        const db = await this.ensureDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            store.put({ name: key, data: blob });
            
            tx.oncomplete = () => {
                resolve();
            };
            tx.onerror = () => {
                reject(tx.error);
            };
        });
    }

    async clearAll() {
        const db = await this.ensureDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            tx.objectStore(STORE_NAME).clear();
            
            tx.oncomplete = () => {
                resolve();
            };
            tx.onerror = () => reject(tx.error);
        });
    }
}

// Create singleton instance
const wallpaperDB = new WallpaperDB();

// Export the instance methods
export const getWallpaperFromDB = (set, name) => wallpaperDB.getWallpaper(set, name);
export const saveWallpaperToDB = (set, name, blob) => wallpaperDB.saveWallpaper(set, name, blob);
export const clearWallpapersDB = () => wallpaperDB.clearAll();
