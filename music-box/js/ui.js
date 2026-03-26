/**
 * UI Controls and Rendering
 */

import { AudioEngine } from './audio.js';
import { Store, FACTORY_GENRES, FACTORY_MOODS } from './store.js';

export const UI = {
    activeSection: 'library',
    genreFilter: 'all',
    moodFilter: 'all',
    searchQuery: '',

    // ICONS mapping
    ICONS: {
        Western: '🤠', 'Sci-fi': '🚀', Fantasy: '⚔️', Horror: '😱',
        Nature: '🌿', Urban: '🏙️', Historical: '🏛️', Other: '♪'
    },

    async init() {
        this.bindEvents();
        this.renderAll();

        // Set audio callbacks
        AudioEngine.onProgress = (elapsed, duration) => this.updateProgressBar(elapsed, duration);
        AudioEngine.onEnded = () => this.updatePlayButton();
    },

    bindEvents() {
        document.getElementById('add-btn').onclick = () => this.showAddModal();
        document.getElementById('play-btn').onclick = () => {
            AudioEngine.togglePlay();
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

        this.renderAll();
    },

    renderAll() {
        this.renderFilters();
        this.renderTracks();
        this.updateNowPlaying();
    },

    renderFilters() {
        const genres = Store.getAvailableGenres();
        const moods = Store.getAvailableMoods();

        const genreChips = ['all', ...genres].map(g =>
            `<button class="chip ${this.genreFilter === g ? 'active' : ''}" onclick="window.UI.setGenreFilter('${g}')">${g}</button>`
        ).join('');

        const moodChips = ['all', ...moods].map(m =>
            `<button class="chip ${this.moodFilter === m ? 'active' : ''}" onclick="window.UI.setMoodFilter('${m}')">${m}</button>`
        ).join('');

        document.getElementById('genre-chips').innerHTML = genreChips;
        document.getElementById('mood-chips').innerHTML = moodChips;
    },

    setGenreFilter(f) {
        this.genreFilter = f;
        this.renderAll();
    },

    setMoodFilter(f) {
        this.moodFilter = f;
        this.renderAll();
    },

    renderTracks() {
        const listEl = document.getElementById('track-list');
        const filtered = Store.library.filter(t => {
            const matchGenre = this.genreFilter === 'all' || (t.genres && t.genres.includes(this.genreFilter));
            const matchMood = this.moodFilter === 'all' || (t.moods && t.moods.includes(this.moodFilter));
            const matchSearch = !this.searchQuery || t.name.toLowerCase().includes(this.searchQuery) ||
                (t.genres && t.genres.some(g => g.toLowerCase().includes(this.searchQuery))) ||
                (t.moods && t.moods.some(m => m.toLowerCase().includes(this.searchQuery)));
            return matchGenre && matchMood && matchSearch;
        });

        if (Store.library.length === 0) {
            listEl.innerHTML = `<div class="empty-state"><div class="big">♬</div><p>Empty library.</p></div>`;
            return;
        }

        listEl.innerHTML = filtered.map(t => {
            const isActive = t.id === AudioEngine.currentTrackId;
            const isPlaying = isActive && AudioEngine.isPlaying;

            // Status indication
            let status = '';
            if (Store.fileMap.get(t.id)) {
                status = '<span style="color:var(--success)">●</span>'; // Loaded
            } else if (Store.fileMap.has(t.id)) {
                status = '<span style="color:var(--accent); font-size:10px">🔒</span>'; // Locked
            } else {
                status = '<span style="color:var(--danger); font-size:10px">⚠️</span>'; // Missing
            }

            const icon = this.ICONS[t.genres?.[0]] || '♪';
            const tags = [...(t.genres || []), ...(t.moods || [])].map(tag => `<span class="track-tag">${tag}</span>`).join('');

            return `
        <div class="track-item ${isActive ? 'active' : ''}" onclick="window.UI.selectTrack('${t.id}')" title="${Store.fileMap.get(t.id) ? 'Ready' : 'Click to authorize or re-add'}">
          <div class="track-icon">${icon}</div>
          <div class="track-info">
            <div class="track-name">${t.name} ${status}</div>
            <div class="track-tags">${tags}</div>
          </div>
          ${isPlaying ? `
            <div class="track-playing-indicator">
              <span></span><span></span><span></span>
            </div>
          ` : ''}
          <div style="display:flex;">
            <button class="btn btn-icon" style="opacity: 0.4" onclick="event.stopPropagation(); window.UI.deleteTrack('${t.id}')">✕</button>
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

        // Try to get file
        let file = Store.fileMap.get(id);

        if (!file) {
            // Check for handle in DB
            const result = await Store.getFileFromHandle(id);

            if (result && !result.needsPermission) {
                file = result;
                Store.fileMap.set(id, file); // Update session map
                this.renderTracks();
            } else if (result && result.needsPermission) {
                // Request authorization
                if (confirm(`Authorize access to restore "${Store.library.find(t => t.id === id).name}"?`)) {
                    const handle = result.handle;
                    if (await handle.requestPermission({ mode: 'read' }) === 'granted') {
                        file = await handle.getFile();
                        Store.fileMap.set(id, file);
                        this.renderTracks();
                    } else {
                        return;
                    }
                } else {
                    return;
                }
            } else {
                // No file and no handle -> Relink prompt
                if (confirm(`Soundtrack file is missing from this session. Re-link it now?`)) {
                    await this.relinkTrack(id);
                    return; // relinkTrack will re-call render
                } else {
                    return;
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
    },

    setFadeIn(btn, secs) {
        AudioEngine.setFadeIn(secs);
        btn.parentNode.querySelectorAll('.fade-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
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
        if (metaEl) metaEl.textContent = [...(t.genres || []), ...(t.moods || [])].join(' · ');
        if (emptyEl) emptyEl.style.display = 'none';
    },

    updatePlayButton() {
        const btn = document.getElementById('play-btn');
        btn.textContent = AudioEngine.isPlaying ? '⏸' : '▶';
        btn.classList.toggle('playing', AudioEngine.isPlaying);
    },

    updateProgressBar(elapsed, duration) {
        const pct = (elapsed / duration) * 100;
        document.getElementById('progress-fill').style.width = `${Math.min(pct, 100)}%`;
        document.getElementById('time-current').textContent = this.fmtTime(elapsed);
        document.getElementById('time-total').textContent = this.fmtTime(duration);
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
    showAddModal() {
        const modalWrap = document.createElement('div');
        modalWrap.id = 'modal-container';
        modalWrap.innerHTML = document.getElementById('tpl-add').innerHTML;
        document.body.appendChild(modalWrap);

        // Custom Tag interaction
        this.selectedGenres = [];
        this.selectedMoods = [];
        this.setupTagPicks();
    },

    closeModal() {
        const m = document.getElementById('modal-container');
        if (m) m.remove();
    },

    setupTagPicks() {
        const gContainer = document.getElementById('genre-picks');
        const mContainer = document.getElementById('mood-picks');

        const genres = Store.getAvailableGenres();
        const moods = Store.getAvailableMoods();

        gContainer.innerHTML = genres.map(g => `<button class="tag-pick" data-val="${g}" onclick="window.UI.toggleTag(this, 'genre')">${g}</button>`).join('') +
            `<button class="tag-add-btn" onclick="window.UI.addCustomTag('genre')">+</button>`;

        mContainer.innerHTML = moods.map(m => `<button class="tag-pick" data-val="${m}" onclick="window.UI.toggleTag(this, 'mood')">${m}</button>`).join('') +
            `<button class="tag-add-btn" onclick="window.UI.addCustomTag('mood')">+</button>`;
    },

    toggleTag(btn, type) {
        const val = btn.getAttribute('data-val');
        const list = type === 'genre' ? this.selectedGenres : this.selectedMoods;

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

        const container = document.getElementById(type === 'genre' ? 'genre-picks' : 'mood-picks');
        const btn = document.createElement('button');
        btn.className = 'tag-pick active';
        btn.textContent = name;
        btn.setAttribute('data-val', name);
        btn.onclick = () => this.toggleTag(btn, type);

        if (type === 'genre') this.selectedGenres.push(name);
        else this.selectedMoods.push(name);

        container.insertBefore(btn, container.lastElementChild);
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

            const nameInput = document.getElementById('track-name-input');
            if (nameInput && !nameInput.value) nameInput.value = this.pendingFile.name.split('.')[0];

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

        let file = this.pendingFile || (fileInput ? fileInput.files[0] : null);
        let handle = this.pendingHandle;

        if (!file) {
            alert('Please choose a file');
            return;
        }

        if (this.relinkingId) {
            // Update existing track instead of adding
            await Store.relinkFile(this.relinkingId, file, handle);
            this.relinkingId = null;
        } else {
            const track = {
                name: nameInput ? (nameInput.value || file.name) : file.name,
                genres: this.selectedGenres,
                moods: this.selectedMoods,
                addedAt: Date.now()
            };
            await Store.addTrack(track, file, handle);
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
            const nameInput = document.getElementById('track-name-input');
            if (!nameInput.value) nameInput.value = file.name.split('.')[0];
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
