# Music Box PWA ⬡ (v1.0)

A professional, high-performance soundboard and soundtrack manager for improv theater, RPGs, and live shows. Built with the Web Audio API, IndexedDB, and the File System Access API.

## ✨ Core Features
- **True Offline Persistence**: Choose "Store in Browser" to save entire audio files into IndexedDB, ensuring your show works even without an internet connection or local files.
- **Persistent Linking**: Supporting browsers (Chrome/Edge) can store "handles" to local files, allowing the app to remember file locations across sessions with a single click.
- **Adaptive Faceted Search**: Filtering by Genre (e.g., *Western*) dynamically updates the available Moods (e.g., *Tense*, *Epic*) so you only see valid combinations.
- **Advanced Audio Engine**: Smooth concurrent fades, millisecond-precise timing, and "Fade-out on Pause" functionality.
- **Premium Interface**: Dark-mode glassmorphism design with responsive controls, animated "dancing bars" for active tracks, and a dedicated **System Status** dashboard.
- **Modular Metadata**: Support for multiple tags per track, custom genre creation, and original filename tracking for easy library recovery.

## 🚀 Getting Started
1. Serve locally: `npx serve .` (requires HTTPS or localhost for the File System Access API).
2. **Install as PWA**: On mobile, use "Add to Home Screen". On desktop, use the install button in the URL bar.
3. Add soundtracks and tag them for instant retrieval during performances.

## 📁 System Status & Storage
Visit the **Status (📊)** tab to monitor:
- **Total Tracks**: Complete library count.
- **Offline Storage**: Cumulative browser database occupancy.
- **System Health**: Tools to refresh the app or perform a full "Factory Reset".

## 🛠 Project Architecture
- `js/audio.js`: High-fidelity audio orchestration.
- `js/store.js`: Multi-backend storage for metadata (LocalStorage) and binary data (IndexedDB).
- `js/ui.js`: Reactive interface and adaptive filtering logic.
- `sw.js`: Service worker optimized for modular soundtrack caching.

## 📝 Changelog

### v1.0 (2026-03-26)
- **First Stable Release.**
- Renamed project to **Music Box**.
- Implemented **Offline Blob Storage** for high-reliability persistence.
- Added **Adaptive Filtering** (Faceted search) for faster navigation.
- Added **System Status** dashboard with storage metrics.
- Added **Fade-out on Pause/Stop** for professional show transitions.
- Added **Nuke Everything** factory reset utility.
- Integrated **Original Filename Tracking** to aid in library recovery.
- Realigned control interface (Fade-in on left, Fade-out on right).
- Set professional default transitions to 5s.

---
*Created with 🦾 by Antigravity.*
