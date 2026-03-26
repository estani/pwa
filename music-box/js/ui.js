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

            const icon = this.ICONS[t.genres?.[0]] || '♪';
            const tags = [...(t.genres || []), ...(t.moods || [])].map(tag => `<span class="track-tag">${tag}</span>`).join('');

            return `
        <div class="track-item ${isActive ? 'active' : ''}" onclick="window.UI.selectTrack('${t.id}')">
          <div class="track-icon">${icon}</div>
          <div class="track-info">
            <div class="track-name">${t.name}</div>
            <div class="track-tags">${tags}</div>
          </div>
          ${isPlaying ? `
            <div class="track-playing-indicator">
              <span></span><span></span><span></span>
            </div>
          ` : ''}
          <button class="btn btn-icon" onclick="event.stopPropagation(); window.UI.deleteTrack('${t.id}')">✕</button>
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
            // Try from IndexedDB handle
            const result = await Store.getFileFromHandle(id);
            if (result && !result.needsPermission) {
                file = result;
            } else if (result && result.needsPermission) {
                this.showToast('Please re-authorize access to this folder.');
                // In a real app we'd trigger a permission request here
                return;
            } else {
                this.showToast('File not found this session. Please re-add.');
                return;
            }
        }

        if (AudioEngine.isPlaying) {
            // Show switch modal or just fade?
            // Let's implement quick fade 1s by default for smoothness
            await AudioEngine.stop(1);
        }

        await AudioEngine.loadAndPlay(file, id);
        this.updateNowPlaying();
        this.updatePlayButton();
        this.renderTracks();
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

            document.getElementById('file-label').textContent = this.pendingFile.name;
            const nameInput = document.getElementById('track-name-input');
            if (!nameInput.value) nameInput.value = this.pendingFile.name.split('.')[0];

            this.showToast('Direct Access Enabled ✔');
        } catch (e) {
            console.log('User cancelled or not supported', e);
        }
    },

    async confirmAddTrack() {
        const fileInput = document.getElementById('file-input');
        const nameInput = document.getElementById('track-name-input');

        let file = this.pendingFile || fileInput.files[0];
        let handle = this.pendingHandle;

        if (!file) {
            alert('Please choose a file');
            return;
        }

        const track = {
            name: nameInput.value || file.name,
            genres: this.selectedGenres,
            moods: this.selectedMoods,
            addedAt: Date.now()
        };

        const idx = await Store.addTrack(track, file, handle);
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
