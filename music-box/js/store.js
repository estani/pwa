/**
 * Store and Library Management
 */

const DB_NAME = 'soundboard_db';
const STORE_NAME = 'file_handles';
const LIBRARY_KEY = 'sb_library_v2'; // Increased version for multiple tags

export const FACTORY_GENRES = ['Western', 'Sci-fi', 'Fantasy', 'Horror', 'Nature', 'Urban', 'Historical', 'Other'];
export const FACTORY_MOODS = ['Tense', 'Epic', 'Light', 'Joyful', 'Dark', 'Mysterious', 'Peaceful', 'Action'];

export const Store = {
    library: [],
    fileMap: new Map(), // idx -> File object/handle

    async init() {
        this.library = JSON.parse(localStorage.getItem(LIBRARY_KEY) || '[]');
        // Clean up old session-based fileMap if any (handled per session)
        await this.refreshFileHandles();
    },

    save() {
        localStorage.setItem(LIBRARY_KEY, JSON.stringify(this.library));
    },

    async addTrack(track, file, handle = null) {
        // Fallback for non-secure contexts where crypto.randomUUID is unavailable
        track.id = (typeof crypto.randomUUID === 'function')
            ? crypto.randomUUID()
            : Date.now().toString(36) + Math.random().toString(36).substr(2);

        this.library.push(track);
        this.save();

        if (handle) {
            await this.saveFileHandle(track.id, handle);
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
    },

    async relinkFile(id, file, handle = null) {
        if (handle) {
            await this.saveFileHandle(id, handle);
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

    async refreshFileHandles() {
        const db = await this.openDB();
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);

        return new Promise((resolve) => {
            const request = store.getAllKeys();
            request.onsuccess = () => {
                const keys = request.result || [];
                for (const id of keys) {
                    if (!this.fileMap.has(id)) {
                        this.fileMap.set(id, null);
                    }
                }
                resolve();
            };
            request.onerror = () => resolve(); // Fail silently
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

    openDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, 1);
            request.onupgradeneeded = () => {
                request.result.createObjectStore(STORE_NAME);
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
};
