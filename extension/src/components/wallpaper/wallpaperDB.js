const DB_NAME = 'WallpaperDB';
const DB_VERSION = 1;
const STORE_NAME = 'wallpapers';

function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'name' });
            }
        };
    });
}

export async function getWallpaperFromDB(set, name) {
    const key = `${set}/${name}`;
    console.log(`[🗃️ IDB] Get key: ${key}`);

    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(key);
        req.onsuccess = () => {
            if (req.result?.data) {
                console.log(`[✅ IDB] Found blob for ${key}`);
                resolve(req.result.data);
            } else {
                console.warn(`[❌ IDB] No blob found for ${key}`);
                resolve(null);
            }
        };
        req.onerror = () => reject(req.error);
    });
}

export async function saveWallpaperToDB(set, name, blob) {
    const key = `${set}/${name}`;
    console.log(`[💾 IDB] Saving key: ${key}, blob size: ${blob.size}`);

    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.put({ name: key, data: blob });
        tx.oncomplete = () => {
            console.log(`[✅ IDB] Saved blob for ${key}`);
            resolve();
        };
        tx.onerror = () => {
            console.error(`[❌ IDB] Failed to save blob for ${key}`, tx.error);
            reject(tx.error);
        };
    });
}

export async function clearWallpapersDB() {
    console.log(`[🧹 IDB] Clearing all stored wallpapers...`);
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).clear();
        tx.oncomplete = () => {
            console.log(`[✅ IDB] All wallpapers cleared`);
            resolve();
        };
        tx.onerror = () => reject(tx.error);
    });
}
