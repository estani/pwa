# Soundboard PWA

A personal RPG/game music player with fade controls, genre/mood tags, and offline support.

## Files
- `index.html` — the full app
- `sw.js` — service worker (offline support)
- `manifest.json` — PWA metadata (home screen icon)

---

## How to deploy (free options)

### Option A — GitHub Pages (recommended, free)
1. Create a free account at github.com
2. Create a new repository (e.g. "soundboard")
3. Upload all 3 files to the repository
4. Go to Settings → Pages → Source: "main" branch → Save
5. Your app is live at: `https://yourusername.github.io/soundboard/`
6. Open that URL in Chrome on your Android phone
7. Tap the menu (⋮) → "Add to Home screen"
8. Done — it works like a native app!

### Option B — Netlify Drop (even easier, no account)
1. Go to app.netlify.com/drop
2. Drag the entire soundboard folder onto the page
3. Get an instant URL
4. Open on Android → Add to Home screen

### Option C — Local network (no internet needed)
Run a simple local server on your PC:
```
npx serve .
```
Then open `http://YOUR_PC_IP:3000` on your phone (both on same WiFi).

---

## How to use

### Adding tracks
- Tap **+ Add track**
- Pick an audio file (MP3, OGG, WAV, M4A)
- Give it a name, genre, and mood tag
- Tap **Add to library**

**Note:** Audio files are loaded per-session (browser security restriction).
Each time you open the app, you'll need to re-add your files — OR store them
in a cloud service (Google Drive) and re-import each time. The track names,
genres, and moods ARE saved between sessions.

### Playing music
- Tap any track to play it
- Tap again to pause
- Use the progress bar to seek
- Use the volume slider to adjust

### Fading
- **Fade out** — when a track ends or you stop it, it fades over X seconds
- **Fade in** — when a track starts, it fades in over X seconds
- **When switching tracks** — choose "Start now", "Fade 1s", or "Fade 5s"

### Filtering
- Use the chips at the top to filter by genre or mood
- Use the search bar to find by name

---

## Workaround for persistent audio files

Since browsers can't access your file system directly, the best approach
for a phone-only app is to store your audio files in:
- A folder in your phone's storage, and re-import each session
- Google Drive (bookmark the folder for quick access)
- OR use the Android app "Solid Explorer" to keep files organized

For a truly native app that auto-loads files, the next step would be
building this with MIT App Inventor (no coding) or Capacitor.js (wraps
this exact HTML into a real APK). Let me know if you'd like that!
