/**
 * Core Audio Engine
 */

export const AudioEngine = {
    context: null,
    gainNode: null,
    currentSource: null,
    currentAudioBuffer: null,
    startedAt: 0,
    pausedAt: 0,
    isPlaying: false,
    currentTrackId: null,
    pendingTrackId: null,
    loopEnabled: false,
    fadeOutSecs: 5,
    fadeInSecs: 5,
    masterVolume: 0.8,
    progressTimer: null,
    isStopping: false,
    onProgress: null, // callback for UI progress updates
    onEnded: null, // callback for UI track completion

    init() {
        if (!this.context) {
            this.context = new (window.AudioContext || window.webkitAudioContext)();
            this.gainNode = this.context.createGain();
            this.gainNode.connect(this.context.destination);
            this.gainNode.gain.setValueAtTime(this.masterVolume, this.context.currentTime);
        }
        if (this.context.state === 'suspended') {
            this.context.resume();
        }
    },

    async loadAndPlay(file, id, offsetSecs = 0) {
        this.init();

        try {
            const buf = await file.arrayBuffer();
            const decodedBuf = await this.context.decodeAudioData(buf);
            this.currentAudioBuffer = decodedBuf;
            this.playBuffer(offsetSecs);
            this.currentTrackId = id;
        } catch (e) {
            console.error('Audio decode error:', e);
            throw e;
        }
    },

    playBuffer(offsetSecs = 0, applyFadeIn = true) {
        if (!this.currentAudioBuffer) return;

        // Reset gain for possible fade-in
        this.gainNode.gain.cancelScheduledValues(this.context.currentTime);

        const src = this.context.createBufferSource();
        src.buffer = this.currentAudioBuffer;
        src.loop = this.loopEnabled;
        src.connect(this.gainNode);

        if (applyFadeIn && this.fadeInSecs > 0) {
            this.gainNode.gain.setValueAtTime(0, this.context.currentTime);
            this.gainNode.gain.linearRampToValueAtTime(this.masterVolume, this.context.currentTime + this.fadeInSecs);
        } else {
            this.gainNode.gain.setValueAtTime(this.masterVolume, this.context.currentTime);
        }

        src.start(0, offsetSecs);
        this.startedAt = this.context.currentTime - offsetSecs;
        this.pausedAt = 0;
        this.currentSource = src;
        this.isPlaying = true;

        src.onended = () => {
            if (this.currentSource === src && this.isPlaying && !this.loopEnabled) {
                this.isPlaying = false;
                this.pausedAt = 0;
                if (this.onEnded) this.onEnded();
            }
        };

        if (this.onProgress) {
            clearInterval(this.progressTimer);
            this.progressTimer = setInterval(() => {
                if (!this.isPlaying) return;
                const elapsed = this.context.currentTime - this.startedAt;
                const dur = this.currentAudioBuffer.duration;
                this.onProgress(elapsed, dur);
            }, 100);
        }
    },

    async stop(secs = 0.5) {
        if (!this.currentSource) return Promise.resolve();
        if (this.isStopping) return Promise.resolve();

        this.isStopping = true;
        const gain = this.gainNode.gain;
        gain.setValueAtTime(gain.value, this.context.currentTime);
        gain.exponentialRampToValueAtTime(0.001, this.context.currentTime + secs);

        return new Promise(resolve => {
            setTimeout(() => {
                this._immediateStop();
                this.isStopping = false;
                if (this.onEnded) this.onEnded();
                resolve();
            }, secs * 1000);
        });
    },

    _immediateStop() {
        if (this.currentSource) {
            try { this.currentSource.stop(); } catch (e) { }
            this.currentSource = null;
        }
        this.isPlaying = false;
        clearInterval(this.progressTimer);
    },

    async togglePlay() {
        if (this.currentTrackId === null) return;
        this.init();
        if (this.isPlaying) {
            if (this.isStopping) return;
            this.pausedAt = this.context.currentTime - this.startedAt + this.fadeOutSecs;
            if (this.currentAudioBuffer && this.pausedAt > this.currentAudioBuffer.duration) {
                this.pausedAt = this.currentAudioBuffer.duration;
            }
            await this.stop(this.fadeOutSecs);
        } else {
            this.playBuffer(this.pausedAt);
        }
    },

    setVolume(val) {
        this.masterVolume = val / 100;
        if (this.gainNode) {
            this.gainNode.gain.setTargetAtTime(this.masterVolume, this.context.currentTime, 0.05);
        }
    },

    setFadeOut(secs) { this.fadeOutSecs = secs; },
    setFadeIn(secs) { this.fadeInSecs = secs; },
    toggleLoop() {
        this.loopEnabled = !this.loopEnabled;
        if (this.currentSource) this.currentSource.loop = this.loopEnabled;
        return this.loopEnabled;
    },

    seek(pct) {
        if (!this.currentAudioBuffer) return;
        const offset = pct * this.currentAudioBuffer.duration;
        if (this.isPlaying) {
            this._immediateStop();
            this.playBuffer(offset, false);
        } else {
            this.pausedAt = offset;
            if (this.onProgress) {
                this.onProgress(this.pausedAt, this.currentAudioBuffer.duration);
            }
        }
        return offset;
    }
};
