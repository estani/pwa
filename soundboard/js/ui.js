/**
 * UI Controls and Rendering
 */

import { AudioEngine } from './audio.js';
import { Store, FACTORY_GENRES, FACTORY_MOODS } from './store.js';

export const UI = {
    activeSection: 'library',
    genreFilter: 'all',
    moodFilter: 'all',
    tagFilter: 'all',
    searchQuery: '',

    toggleCollapse(targetId, btn) {
        const el = document.getElementById(targetId);
        if (!el) return;
        
        const isOpening = el.style.display === 'none';

        if (isOpening && btn) {
            const bar = btn.closest('.filter-bar');
            if (bar) {
                // Reset all icons to '▼' in this bar
                bar.querySelectorAll('.collapse-icon').forEach(icon => icon.textContent = '▼');
                // Remove active class from all buttons
                bar.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                
                // Hide all contents in the corresponding container
                const contents = bar.nextElementSibling;
                if (contents && contents.classList.contains('filter-contents')) {
                    Array.from(contents.children).forEach(child => {
                        child.style.display = 'none';
                    });
                }
            }
        }

        if (isOpening) {
            el.style.display = '';
            if(btn) {
                btn.classList.add('active');
                const sp = btn.querySelector('.collapse-icon');
                if(sp) sp.textContent = '▲';
            }
        } else {
            el.style.display = 'none';
            if(btn) {
                btn.classList.remove('active');
                const sp = btn.querySelector('.collapse-icon');
                if(sp) sp.textContent = '▼';
            }
        }
    },

    // ICONS mapping
    ICONS: {
        Western: '🤠', 'Sci-fi': '🚀', Fantasy: '⚔️', Horror: '😱',
        Nature: '🌿', Urban: '🏙️', Historical: '🏛️', Other: '♪'
    },
    VERSION: '1.0',

    async init() {
        this.bindEvents();
        this.renderAll();

        // Set audio callbacks
        AudioEngine.onProgress = (elapsed, duration) => this.updateProgressBar(elapsed, duration);
        AudioEngine.onEnded = () => {
            this.updatePlayButton();
            this.renderTracks();
        };
    },

    bindEvents() {
        document.getElementById('add-btn').onclick = () => this.showAddModal();
        document.getElementById('play-btn').onclick = async () => {
            await AudioEngine.togglePlay();
            this.updatePlayButton();
        };
        document.getElementById('vol-slider').oninput = (e) => AudioEngine.setVolume(e.target.value);

        document.getElementById('search-input').oninput = (e) => {
            this.searchQuery = e.target.value.toLowerCase();
            this.renderTracks();
        };

        document.getElementById('progress-bar').onclick = (e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const pct = (e.clientX - rect.left) / rect.width;
            AudioEngine.seek(pct);
        };

        // Nav
        document.querySelectorAll('.nav-item').forEach(el => {
            el.onclick = () => this.switchSection(el.getAttribute('data-section'));
        });
    },

    switchSection(section) {
        this.activeSection = section;
        document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
        document.getElementById(`section-${section}`).classList.add('active');

        document.querySelectorAll('.nav-item').forEach(n => {
            n.classList.toggle('active', n.getAttribute('data-section') === section);
        });

        if (section === 'status') this.renderStatus();
        this.renderAll();
    },

    renderAll() {
        this.renderFilters();
        this.renderTracks();
        this.updateNowPlaying();
    },

    renderFilters() {
        const query = this.searchQuery || '';

        // Adaptive Genres
        const tracksForGenreLogic = Store.library.filter(t => {
            const matchMood = this.moodFilter === 'all' || (t.moods && t.moods.includes(this.moodFilter));
            const matchTag = this.tagFilter === 'all' || (t.tags && t.tags.includes(this.tagFilter));
            const matchSearch = !query || t.name.toLowerCase().includes(query) ||
                (t.genres && t.genres.some(g => g.toLowerCase().includes(query)));
            return matchMood && matchTag && matchSearch;
        });
        const availGenres = [...new Set(tracksForGenreLogic.flatMap(t => t.genres || []))].sort();

        // Adaptive Moods
        const tracksForMoodLogic = Store.library.filter(t => {
            const matchGenre = this.genreFilter === 'all' || (t.genres && t.genres.includes(this.genreFilter));
            const matchTag = this.tagFilter === 'all' || (t.tags && t.tags.includes(this.tagFilter));
            const matchSearch = !query || t.name.toLowerCase().includes(query) ||
                (t.moods && t.moods.some(m => m.toLowerCase().includes(query)));
            return matchGenre && matchTag && matchSearch;
        });
        const availMoods = [...new Set(tracksForMoodLogic.flatMap(t => t.moods || []))].sort();

        // Adaptive Tags
        const tracksForTagLogic = Store.library.filter(t => {
            const matchGenre = this.genreFilter === 'all' || (t.genres && t.genres.includes(this.genreFilter));
            const matchMood = this.moodFilter === 'all' || (t.moods && t.moods.includes(this.moodFilter));
            const matchSearch = !query || t.name.toLowerCase().includes(query) ||
                (t.tags && t.tags.some(m => m.toLowerCase().includes(query)));
            return matchGenre && matchMood && matchSearch;
        });
        const availTags = [...new Set(tracksForTagLogic.flatMap(t => t.tags || []))].sort();

        const genreChips = ['all', ...availGenres].map(g =>
            `<button class="chip ${this.genreFilter === g ? 'active' : ''}" onclick="window.UI.setGenreFilter('${g}')">${g}</button>`
        ).join('');

        const moodChips = ['all', ...availMoods].map(m =>
            `<button class="chip ${this.moodFilter === m ? 'active' : ''}" onclick="window.UI.setMoodFilter('${m}')">${m}</button>`
        ).join('');

        const tagChips = ['all', ...availTags].map(m =>
            `<button class="chip ${this.tagFilter === m ? 'active' : ''}" onclick="window.UI.setTagFilter('${m}')">${m}</button>`
        ).join('');

        const elGen = document.getElementById('genre-chips');
        const elMood = document.getElementById('mood-chips');
        const elTag = document.getElementById('tag-chips');
        if(elGen) elGen.innerHTML = genreChips;
        if(elMood) elMood.innerHTML = moodChips;
        if(elTag) elTag.innerHTML = tagChips;
    },

    setGenreFilter(f) {
        this.genreFilter = f;
        this.renderAll();
    },

    setMoodFilter(f) {
        this.moodFilter = f;
        this.renderAll();
    },

    setTagFilter(f) {
        this.tagFilter = f;
        this.renderAll();
    },

    renderTracks() {
        const listEl = document.getElementById('track-list');
        const filtered = Store.library.filter(t => {
            const matchGenre = this.genreFilter === 'all' || (t.genres && t.genres.includes(this.genreFilter));
            const matchMood = this.moodFilter === 'all' || (t.moods && t.moods.includes(this.moodFilter));
            const matchTag = this.tagFilter === 'all' || (t.tags && t.tags.includes(this.tagFilter));
            const matchSearch = !this.searchQuery || t.name.toLowerCase().includes(this.searchQuery) ||
                (t.genres && t.genres.some(g => g.toLowerCase().includes(this.searchQuery))) ||
                (t.moods && t.moods.some(m => m.toLowerCase().includes(this.searchQuery))) ||
                (t.tags && t.tags.some(m => m.toLowerCase().includes(this.searchQuery)));
            return matchGenre && matchMood && matchTag && matchSearch;
        });

        if (Store.library.length === 0) {
            listEl.innerHTML = `<div class="empty-state"><div class="big">♬</div><p>Empty library.</p></div>`;
            return;
        }

        listEl.innerHTML = filtered.map(t => {
            const isActive = t.id === AudioEngine.currentTrackId;
            const isPlaying = isActive && AudioEngine.isPlaying;

            const f = Store.fileMap.get(t.id);
            const isLoadedOrBlob = f && (f instanceof File || f instanceof Blob || f.type === 'blob');
            const isHandle = f && f.type === 'handle';

            let sizeStr = '';
            if (isLoadedOrBlob && t.size) sizeStr = ` <small style="opacity:0.5">(${this.fmtSize(t.size)})</small>`;

            if (isLoadedOrBlob) {
                status = `<span style="color:var(--success)" title="Ready">●${sizeStr}</span>`;
            } else if (isHandle) {
                status = '<span style="color:var(--accent); font-size:10px" title="Needs Authorization">🔒</span>';
            } else {
                status = '<span style="color:var(--danger); font-size:10px" title="Missing File">⚠️</span>';
            }

            const icon = this.ICONS[t.genres?.[0]] || '♪';
            const tags = [...(t.genres || []), ...(t.moods || []), ...(t.tags || [])];

            // Priority: Name or Tags
            const primary = t.name || tags.join(' · ') || 'Untagged';
            const secondary = t.name ? tags.join(' · ') : '';

            return `
        <div class="track-item ${isActive ? 'active' : ''}" onclick="window.UI.selectTrack('${t.id}')">
          <div class="track-icon">${icon}</div>
          <div class="track-info">
            <div class="track-name" style="${!t.name ? 'font-weight:600; color:var(--accent)' : ''}">${primary} ${status}</div>
            <div class="track-tags" style="${!t.name ? 'display:none' : ''}">${secondary}</div>
          </div>
          ${isPlaying ? `
            <div class="track-playing-indicator">
              <span></span><span></span><span></span>
            </div>
          ` : ''}
          <div style="display:flex; gap: 4px">
            <button class="btn btn-icon" style="opacity: 0.6; font-size: 14px" onclick="event.stopPropagation(); window.UI.showAddModal('${t.id}')">✎</button>
            <button class="btn btn-icon" style="opacity: 0.3; font-size: 14px" onclick="event.stopPropagation(); window.UI.deleteTrack('${t.id}')">✕</button>
          </div>
        </div>
      `;
        }).join('');
    },

    async selectTrack(id) {
        if (id === AudioEngine.currentTrackId && AudioEngine.isPlaying) {
            AudioEngine.togglePlay();
            this.updatePlayButton();
            return;
        }

        // Try to get file from session memory
        let file = Store.fileMap.get(id);
        const isReady = file && (file instanceof Blob || file instanceof File);

        if (!isReady) {
            // Check for Blob first (True persistence)
            const blob = await Store.getFileBlob(id);
            if (blob) {
                file = blob;
                Store.fileMap.set(id, file);
                this.renderTracks();
            } else {
                // Check for handle
                const result = await Store.getFileFromHandle(id);
                if (result && !result.needsPermission) {
                    file = result;
                    Store.fileMap.set(id, file);
                    this.renderTracks();
                } else if (result && result.needsPermission) {
                    const track = Store.library.find(t => t.id === id);
                    if (confirm(`Authorize access to restore "${track.name || track.fileName}"?`)) {
                        const handle = result.handle;
                        if (await handle.requestPermission({ mode: 'read' }) === 'granted') {
                            file = await handle.getFile();
                            Store.fileMap.set(id, file);
                            this.renderTracks();
                        } else return;
                    } else return;
                } else {
                    const track = Store.library.find(t => t.id === id);
                    if (confirm(`Soundtrack file "${track.fileName}" is missing. Re-link it now?`)) {
                        await this.relinkTrack(id);
                        return;
                    } else return;
                }
            }
        }

        if (AudioEngine.isPlaying) {
            await AudioEngine.stop(1);
        }

        await AudioEngine.loadAndPlay(file, id);
        this.updateNowPlaying();
        this.updatePlayButton();
        this.renderTracks();
    },

    async relinkTrack(id) {
        this.relinkingId = id;
        const track = Store.library.find(t => t.id === id);
        const isSecure = window.isSecureContext && typeof window.showOpenFilePicker === 'function';

        this.showToast(`Relinking: ${track.name}`);

        if (isSecure) {
            const file = await this.selectWithDirectAccess();
            if (file) {
                await Store.relinkFile(id, file, this.pendingHandle);
                this.renderAll();
            }
        } else {
            const picker = document.createElement('input');
            picker.type = 'file'; picker.accept = 'audio/*';
            picker.onchange = async (e) => {
                const file = e.target.files[0];
                if (file) { await Store.relinkFile(id, file, null); this.renderAll(); }
            };
            picker.click();
        }
        this.relinkingId = null;
    },

    setFadeOut(btn, secs) {
        AudioEngine.setFadeOut(secs);
        btn.parentNode.querySelectorAll('.fade-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.updatePlayButton();
    },

    setFadeIn(btn, secs) {
        AudioEngine.setFadeIn(secs);
        btn.parentNode.querySelectorAll('.fade-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    },

    seekToStart() {
        AudioEngine.seek(0);
    },

    updateNowPlaying() {
        const t = Store.library.find(t => t.id === AudioEngine.currentTrackId);
        if (!t) return;

        const iconEl = document.getElementById('np-icon');
        const titleEl = document.getElementById('np-title');
        const metaEl = document.getElementById('np-meta');
        const emptyEl = document.getElementById('np-empty');

        if (iconEl) iconEl.textContent = this.ICONS[t.genres?.[0]] || '♪';
        if (titleEl) titleEl.textContent = t.name;
        if (metaEl) metaEl.textContent = [...(t.genres || []), ...(t.moods || []), ...(t.tags || [])].join(' · ');
        if (emptyEl) emptyEl.style.display = 'none';
    },

    updatePlayButton() {
        const btn = document.getElementById('play-btn');
        const isFadeActive = AudioEngine.fadeOutSecs > 0;

        if (AudioEngine.isPlaying) {
            btn.textContent = isFadeActive ? '>⏸' : '⏸';
        } else {
            btn.textContent = '▶';
        }

        btn.classList.toggle('playing', AudioEngine.isPlaying);
    },

    updateProgressBar(elapsed, duration) {
        const pct = (elapsed / duration) * 100;
        document.getElementById('progress-fill').style.width = `${Math.min(pct, 100)}%`;
        document.getElementById('time-current').textContent = this.fmtTime(elapsed);
        document.getElementById('time-total').textContent = this.fmtTime(duration);
    },

    async renderStatus() {
        const totalTracks = Store.library.length;
        const totalStoredSize = await Store.getTotalBlobSize();

        const content = document.getElementById('status-content');
        if (!content) return;

        content.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:flex-start">
              <h3>📊 System Status</h3>
              <span style="font-size:10px; color:var(--text-dim); background:var(--surface-active); padding:2px 8px; border-radius:4px">v${this.VERSION}</span>
            </div>
            <div style="margin-top:20px; display:grid; gap:16px">
                <div class="status-stat" style="background:var(--surface-active); padding:16px; border-radius:12px">
                    <div style="font-size:12px; color:var(--text-dim); margin-bottom:4px">TOTAL TRACKS</div>
                    <div style="font-size:24px; font-weight:600; color:var(--accent)">${totalTracks}</div>
                </div>
                <div class="status-stat" style="background:var(--surface-active); padding:16px; border-radius:12px">
                    <div style="font-size:12px; color:var(--text-dim); margin-bottom:4px">OFFLINE STORAGE</div>
                    <div style="font-size:24px; font-weight:600; color:var(--success)">${this.fmtSize(totalStoredSize)}</div>
                    <div style="font-size:10px; color:var(--text-dim); margin-top:8px">Stored objects in IndexedDB. Use "Store in browser" to enable.</div>
                </div>
            </div>
            <div style="margin-top:20px; display:flex; gap:12px">
                <button class="btn btn-ghost" style="flex:1" onclick="location.reload()">Refresh App</button>
                <button class="btn btn-danger" style="flex:1" onclick="window.UI.nukeEverything()">Nuke Everything</button>
            </div>
        `;
    },

    async nukeEverything() {
        if (!confirm('This will DELETE all tracks, metadata and stored files from this browser. Continue?')) return;
        if (!confirm('Are you ABSOLUTELY sure? This cannot be undone.')) return;

        this.showToast('Nuking data...');

        await Store.clearAllData();

        // Clear caches
        if ('caches' in window) {
            const names = await caches.keys();
            await Promise.all(names.map(n => caches.delete(n)));
        }

        // Unregister SW
        if ('serviceWorker' in navigator) {
            const regs = await navigator.serviceWorker.getRegistrations();
            await Promise.all(regs.map(r => r.unregister()));
        }

        this.showToast('Reset complete. Reloading.');
        setTimeout(() => location.reload(), 1000);
    },

    fmtSize(bytes) {
        if (!bytes) return '0KB';
        const k = 1024;
        const m = k * k;
        if (bytes >= m) return Math.round(bytes / m) + 'MB';
        return Math.round(bytes / k) + 'KB';
    },

    fmtTime(s) {
        s = Math.max(0, Math.floor(s));
        return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
    },

    deleteTrack(id) {
        if (confirm('Remove this track from library?')) {
            Store.deleteTrack(id);
            this.renderAll();
        }
    },

    // ── Modals ──
    async showAddModal(editId = null) {
        this.editingTrackId = editId;
        const modalWrap = document.createElement('div');
        modalWrap.id = 'modal-container';
        modalWrap.innerHTML = document.getElementById('tpl-add').innerHTML;
        document.body.appendChild(modalWrap);

        const track = editId ? Store.library.find(t => t.id === editId) : null;
        const status = editId ? Store.fileMap.get(editId) : null;

        if (track) {
            document.querySelector('#modal-container h3').textContent = 'Edit Soundtrack';
            document.getElementById('track-name-input').value = track.name || '';
            document.getElementById('confirm-add-btn').textContent = 'Save Changes';
            this.selectedGenres = [...(track.genres || [])];
            this.selectedMoods = [...(track.moods || [])];
            this.selectedTags = [...(track.tags || [])];

            // Check if stored as blob
            const isBlob = status && (status.type === 'blob' || status instanceof Blob);
            const isHandle = status && (status.type === 'handle' || (status.getFile && typeof status.getFile === 'function'));
            const blobInDB = await Store.getFileBlob(editId);

            const checkbox = document.getElementById('store-blob-input');
            if (blobInDB) {
                checkbox.checked = true;
            } else {
                // Only allow enabling if we have the file binary now or can get it from handle
                const canStoreNow = this.pendingFile || isReady(status);
                if (!canStoreNow && !isHandle) {
                    checkbox.disabled = true;
                    checkbox.parentElement.style.opacity = '0.5';
                    checkbox.parentElement.title = 'Need to re-select file to store in browser';
                }
            }

            document.getElementById('file-label').textContent = Store.fileMap.get(editId) ? 'Linked' : 'Missing/Locked';
        } else {
            this.selectedGenres = [];
            this.selectedMoods = [];
            this.selectedTags = [];
        }

        this.setupTagPicks();

        function isReady(f) { return f && (f instanceof Blob || f instanceof File); }
    },

    closeModal() {
        const m = document.getElementById('modal-container');
        if (m) m.remove();
    },

    setupTagPicks() {
        const gContainer = document.getElementById('genre-picks');
        const mContainer = document.getElementById('mood-picks');
        const tContainer = document.getElementById('tag-picks');

        const genres = Store.getAvailableGenres();
        const moods = Store.getAvailableMoods();
        const tags = Store.getAvailableTags();

        if (gContainer) gContainer.innerHTML = genres.map(g => `<button class="tag-pick ${this.selectedGenres.includes(g) ? 'active' : ''}" data-val="${g}" onclick="window.UI.toggleTag(this, 'genre')">${g}</button>`).join('') +
            `<button class="tag-add-btn" onclick="window.UI.addCustomTag('genre')">+</button>`;

        if (mContainer) mContainer.innerHTML = moods.map(m => `<button class="tag-pick ${this.selectedMoods.includes(m) ? 'active' : ''}" data-val="${m}" onclick="window.UI.toggleTag(this, 'mood')">${m}</button>`).join('') +
            `<button class="tag-add-btn" onclick="window.UI.addCustomTag('mood')">+</button>`;

        if (tContainer) tContainer.innerHTML = tags.map(m => `<button class="tag-pick ${this.selectedTags.includes(m) ? 'active' : ''}" data-val="${m}" onclick="window.UI.toggleTag(this, 'tag')">${m}</button>`).join('') +
            `<button class="tag-add-btn" onclick="window.UI.addCustomTag('tag')">+</button>`;
    },

    toggleTag(btn, type) {
        const val = btn.getAttribute('data-val');
        let list = this.selectedGenres;
        if (type === 'mood') list = this.selectedMoods;
        if (type === 'tag') list = this.selectedTags;

        if (list.includes(val)) {
            list.splice(list.indexOf(val), 1);
            btn.classList.remove('active');
        } else {
            list.push(val);
            btn.classList.add('active');
        }
    },

    addCustomTag(type) {
        const name = prompt('New tag name:');
        if (!name) return;

        let containerId = 'genre-picks';
        if (type === 'mood') containerId = 'mood-picks';
        if (type === 'tag') containerId = 'tag-picks';

        const container = document.getElementById(containerId);
        const btn = document.createElement('button');
        btn.className = 'tag-pick active';
        btn.textContent = name;
        btn.setAttribute('data-val', name);
        btn.onclick = () => this.toggleTag(btn, type);

        if (type === 'genre') this.selectedGenres.push(name);
        else if (type === 'mood') this.selectedMoods.push(name);
        else this.selectedTags.push(name);

        container.insertBefore(btn, container.lastElementChild);
    },

    async pickFileUnified() {
        const isSecure = window.isSecureContext && typeof window.showOpenFilePicker === 'function';
        if (isSecure) {
            const file = await this.selectWithDirectAccess();
            if (file) return file;
        }
        // Fallback to hidden input
        document.getElementById('file-input').click();
    },

    async selectWithDirectAccess() {
        try {
            const [handle] = await window.showOpenFilePicker({
                types: [{
                    description: 'Audio files',
                    accept: { 'audio/*': ['.mp3', '.ogg', '.wav', '.m4a'] }
                }],
                multiple: false
            });

            this.pendingHandle = handle;
            this.pendingFile = await handle.getFile();

            const fileLabel = document.getElementById('file-label');
            if (fileLabel) fileLabel.textContent = this.pendingFile.name;

            this.showToast('Direct Access Enabled ✔');
            return this.pendingFile;
        } catch (e) {
            console.log('User cancelled or not supported', e);
            return null;
        }
    },

    async confirmAddTrack() {
        const fileInput = document.getElementById('file-input');
        const nameInput = document.getElementById('track-name-input');
        const storeBlobInput = document.getElementById('store-blob-input');
        const storeBlob = storeBlobInput ? storeBlobInput.checked : false;

        let file = this.pendingFile || (fileInput ? fileInput.files[0] : null);
        let handle = this.pendingHandle;

        if (!file && !this.editingTrackId) {
            alert('Please choose a file');
            return;
        }

        const updates = {
            name: nameInput ? nameInput.value : '',
            genres: this.selectedGenres,
            moods: this.selectedMoods,
            tags: this.selectedTags,
        };

        if (this.editingTrackId) {
            Store.updateTrack(this.editingTrackId, updates);

            // Handle offline storage toggle
            const wasStored = await Store.getFileBlob(this.editingTrackId);
            if (wasStored && !storeBlob) {
                await Store.deleteFileBlob(this.editingTrackId);
            } else if (!wasStored && storeBlob) {
                // We need the file. If not provided now, try from session memory
                const currentFile = file || Store.fileMap.get(this.editingTrackId);
                // If it's a handle, we'd need to async get it, but let's keep it simple: 
                // Only if it's already binary in session
                if (currentFile && (currentFile instanceof Blob)) {
                    await Store.saveFileBlob(this.editingTrackId, currentFile);
                }
            }

            if (file) await Store.relinkFile(this.editingTrackId, file, handle, storeBlob);
            this.editingTrackId = null;
        } else if (this.relinkingId) {
            await Store.relinkFile(this.relinkingId, file, handle, storeBlob);
            this.relinkingId = null;
        } else {
            updates.addedAt = Date.now();
            await Store.addTrack(updates, file, handle, storeBlob);
        }

        this.pendingFile = null;
        this.pendingHandle = null;
        this.closeModal();
        this.renderAll();
    },

    onFileChosen(input) {
        const file = input.files[0];
        if (file) {
            document.getElementById('file-label').textContent = file.name;
        }
    },

    fillNameFromFilename() {
        const file = this.pendingFile || document.getElementById('file-input').files[0];
        if (file) {
            const nameInput = document.getElementById('track-name-input');
            nameInput.value = file.name.split('.')[0]
                .replace(/[_-]/g, ' ')
                .replace(/\b\w/g, c => c.toUpperCase());
        } else {
            this.showToast('Pick a file first');
        }
    },

    showToast(msg) {
        const t = document.createElement('div');
        t.className = 'toast';
        t.textContent = msg;
        document.body.appendChild(t);
        setTimeout(() => t.remove(), 3000);
    }
};

// Global exports for inline onclicks
window.UI = UI;
