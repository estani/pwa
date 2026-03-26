/**
 * Main App Entry
 */

import { Store } from './store.js';
import { UI } from './ui.js';

async function main() {
    console.log('⬡ SOUNDBOARD: Initializing...');

    try {
        // 1. Init Store (load library)
        await Store.init();

        // 2. Init UI (bind events, first render)
        await UI.init();

        console.log('⬡ SOUNDBOARD: Online.');
    } catch (err) {
        console.error('⬡ SOUNDBOARD Initialization Error:', err);
    }
}

// Start
document.addEventListener('DOMContentLoaded', main);

// PWA: Register Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('⬡ SW: Registered:', reg.scope))
            .catch(err => console.error('⬡ SW: Registration failed:', err));
    });
}
