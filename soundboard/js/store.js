/**
 * Store and Library Management
 */

const DB_NAME = 'soundboard_db';
const STORE_NAME = 'file_handles';
const BLOB_STORE = 'file_blobs';
const LIBRARY_KEY = 'sb_library_v2';

export const FACTORY_GENRES = ['Western', 'Sci-fi', 'Fantasy', 'Horror', 'Nature', 'Urban', 'Historical', 'Other'];
export const FACTORY_MOODS = ['Tense', 'Epic', 'Light', 'Joyful', 'Dark', 'Mysterious', 'Peaceful', 'Action'];

export const Store = {
    library: [],
    fileMap: new Map(), // idx -> File object/handle

    async init() {
        this.library = JSON.parse(localStorage.getItem(LIBRARY_KEY) || '[]');
        await this.refreshFileDiscovery();
    },

    save() {
        localStorage.setItem(LIBRARY_KEY, JSON.stringify(this.library));
    },

    async addTrack(track, file, handle = null, storeBlob = false) {
        // Fallback for non-secure contexts where crypto.randomUUID is unavailable
        track.id = (typeof crypto.randomUUID === 'function')
            ? crypto.randomUUID()
            : Date.now().toString(36) + Math.random().toString(36).substr(2);

        track.fileName = file.name; // Keep original filename
        track.size = file.size; // Store original size
        this.library.push(track);
        this.save();

        if (handle) {
            await this.saveFileHandle(track.id, handle);
        } else if (storeBlob) {
            await this.saveFileBlob(track.id, file);
        }

        this.fileMap.set(track.id, file);
        return track.id;
    },

    updateTrack(id, updates) {
        const idx = this.library.findIndex(t => t.id === id);
        if (idx !== -1) {
            this.library[idx] = { ...this.library[idx], ...updates };
            this.save();
        }
    },

    deleteTrack(id) {
        this.library = this.library.filter(t => t.id !== id);
        this.save();
        this.fileMap.delete(id);
        this.deleteFileHandle(id);
        this.deleteFileBlob(id);
    },

    async relinkFile(id, file, handle = null, storeBlob = false) {
        const track = this.library.find(t => t.id === id);
        if (track) {
            track.fileName = file.name;
            track.size = file.size;
            this.save();
        }

        if (handle) {
            await this.saveFileHandle(id, handle);
        } else if (storeBlob) {
            await this.saveFileBlob(id, file);
        }
        this.fileMap.set(id, file);
    },

    // ── Dynamic Metadata Registry ──
    getAvailableGenres() {
        const custom = this.library.flatMap(t => t.genres || []);
        return [...new Set([...FACTORY_GENRES, ...custom])].sort();
    },

    getAvailableMoods() {
        const custom = this.library.flatMap(t => t.moods || []);
        return [...new Set([...FACTORY_MOODS, ...custom])].sort();
    },

    // ── File System Access Persistence ──
    async saveFileHandle(id, handle) {
        const db = await this.openDB();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        return new Promise((resolve) => {
            const request = store.put(handle, id);
            request.onsuccess = () => resolve();
            request.onerror = () => resolve();
        });
    },

    async deleteFileHandle(id) {
        const db = await this.openDB();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        return new Promise((resolve) => {
            const request = store.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = () => resolve();
        });
    },

    async refreshFileDiscovery() {
        const db = await this.openDB();

        // Check handles
        const txH = db.transaction(STORE_NAME, 'readonly');
        const storeH = txH.objectStore(STORE_NAME);
        const keysH = await new Promise(r => {
            const req = storeH.getAllKeys();
            req.onsuccess = () => r(req.result || []);
            req.onerror = () => r([]);
        });

        // Check blobs
        const txB = db.transaction(BLOB_STORE, 'readonly');
        const storeB = txB.objectStore(BLOB_STORE);
        const keysB = await new Promise(r => {
            const req = storeB.getAllKeys();
            req.onsuccess = () => r(req.result || []);
            req.onerror = () => r([]);
        });

        for (const id of keysB) {
            if (!this.fileMap.has(id)) this.fileMap.set(id, { type: 'blob' });
        }
        for (const id of keysH) {
            if (!this.fileMap.has(id)) this.fileMap.set(id, { type: 'handle' });
        }
    },

    async saveFileBlob(id, blob) {
        const db = await this.openDB();
        const tx = db.transaction(BLOB_STORE, 'readwrite');
        const store = tx.objectStore(BLOB_STORE);
        return new Promise((resolve) => {
            const request = store.put(blob, id);
            request.onsuccess = () => resolve();
            request.onerror = () => resolve();
        });
    },

    async getFileBlob(id) {
        const db = await this.openDB();
        const tx = db.transaction(BLOB_STORE, 'readonly');
        const store = tx.objectStore(BLOB_STORE);
        return new Promise((resolve) => {
            const request = store.get(id);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => resolve(null);
        });
    },

    async deleteFileBlob(id) {
        const db = await this.openDB();
        const tx = db.transaction(BLOB_STORE, 'readwrite');
        const store = tx.objectStore(BLOB_STORE);
        return new Promise((resolve) => {
            const request = store.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = () => resolve();
        });
    },

    async getTotalBlobSize() {
        const db = await this.openDB();
        const tx = db.transaction(BLOB_STORE, 'readonly');
        const store = tx.objectStore(BLOB_STORE);
        return new Promise(resolve => {
            let total = 0;
            const req = store.openCursor();
            req.onsuccess = (e) => {
                const cursor = e.target.result;
                if (cursor) {
                    total += cursor.value.size;
                    cursor.continue();
                } else {
                    resolve(total);
                }
            };
            req.onerror = () => resolve(0);
        });
    },

    async getFileFromHandle(id) {
        const db = await this.openDB();
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);

        const handle = await new Promise((resolve) => {
            const request = store.get(id);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => resolve(null);
        });

        if (handle) {
            try {
                const options = { mode: 'read' };
                if (await handle.queryPermission(options) === 'granted') {
                    return await handle.getFile();
                } else {
                    return { needsPermission: true, handle };
                }
            } catch (e) {
                console.error('Handle stale', e);
            }
        }
        return null;
    },

    async reindexFileHandles() {
        // Basic re-index to keep alignment with library array
        const db = await this.openDB(); // Added missing db declaration
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        await store.clear();
        // This is simple but risky. In a production app use UUIDs.
    },

    async clearAllData() {
        const db = await this.openDB();
        const txB = db.transaction(BLOB_STORE, 'readwrite');
        await txB.objectStore(BLOB_STORE).clear();

        const txH = db.transaction(STORE_NAME, 'readwrite');
        await txH.objectStore(STORE_NAME).clear();

        localStorage.removeItem(LIBRARY_KEY);
        this.library = [];
        this.fileMap.clear();
    },

    openDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, 2);
            request.onupgradeneeded = () => {
                const db = request.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
                if (!db.objectStoreNames.contains(BLOB_STORE)) db.createObjectStore(BLOB_STORE);
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
};
