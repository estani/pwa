# Soundboard Premium PWA ⬡

A professional soundboard for improv theater, RPGs, and live shows. Built with modern Web Audio API and File System Access API.

## ✨ New Features
- **Modern Modular Architecture**: Split into `js/` modules for better maintainability.
- **Premium Design**: Dark mode with glassmorphism and metallic gold accents.
- **Dual Filtering**: Separate filters for **Genre** and **Mood**.
- **Multiple Tags**: Each soundtrack can have multiple genres and moods.
- **Dynamic Registry**: Add your own genres and moods on the fly.
- **Persistent Mode**: Use the "Persistent Mode" (🔒) when adding tracks to save the file location across sessions (Chrome/Edge).
- **Smooth Transitions**: Built-in 1s, 5s, and 10s fading controls.

## 🚀 Getting Started
1. Run a local server: `npx serve .`
2. Open in a modern browser (Chrome/Edge recommended for Persistent Mode).
3. **Install as PWA**: On mobile, use "Add to Home Screen". On desktop, click the install icon in the URL bar.

## 📁 Project Structure
- `index.html`: Main entry point (minimal).
- `css/style.css`: Premium CSS variables and styles.
- `js/app.js`: Main orchestration and PWA registration.
- `js/audio.js`: High-fidelity audio engine.
- `js/store.js`: IndexedDB & LocalStorage management.
- `js/ui.js`: DOM interaction and rendering.
- `sw.js`: Service worker for offline support.

## 🔒 Persistence Note
Standard file inputs in browsers are session-only for security. To keep your soundtracks loaded between sessions, use the **Persistent Mode** when importing. This uses the File System Access API to store a handle to your file in IndexedDB. Upon reload, the browser may ask for permission to re-access your soundtracks.

---
*Created by Antigravity.*
