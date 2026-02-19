import { BridgePDF, ThemeController } from '@bridge-pdf/core';
import '@bridge-pdf/core/src/theme.css';

// DOM Elements
const container = document.getElementById('pdf-container');
const sidebar = document.getElementById('sidebar'); // To apply theme to sidebar as well if needed
const buttons = document.querySelectorAll('.mode-btn');

// Initialize Bridge
const bridge = new BridgePDF(container, {
    workerUrl: `${import.meta.env.BASE_URL}pdf.worker.min.mjs`,
    scale: 1.0,
});

// Initialize Theme Controller on BODY to affect global styles (overlays, etc)
const themeController = new ThemeController(document.body);

// Load a sample document
bridge.loadDocument('https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/web/compressed.tracemonkey-pldi-09.pdf');

// Handle Mode Switching
buttons.forEach(btn => {
    btn.addEventListener('click', () => {
        const mode = btn.dataset.mode;
        
        // precise toggle logic: disable all others, enable selected
        // The themeController toggles, so we might need to reset first or just set directly if exposed
        // Since the current API is `toggleX`, we'll implement a 'reset and set' approach
        
        // 1. Reset visual active state on buttons
        buttons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // 2. Apply Theme
        // We can access `currentTheme` directly or keep track of local state. 
        // Let's rely on the controller's state if possible, but the API is `toggleX`.
        // Inspecting ThemeController again... it has `currentTheme` property.
        
        // Directly manipulating for the demo to ensure cleaner switching
        themeController.currentTheme = mode; 
        themeController.applyTheme();
        
        // Optional: Update sidebar theme for dark mode compatibility
        if (mode === 'dark') {
            sidebar.classList.add('theme-dark');
        } else {
            sidebar.classList.remove('theme-dark');
        }

        // Re-calculate spotlight if needed
        if (mode === 'spotlight') {
            updateSpotlightPosition();
        }
    });
});

// Basic Spotlight Tracking (similar to main.js)
let spotlightRequest = null;
function updateSpotlightPosition() {
    if (themeController.currentTheme !== 'spotlight') return;
    if (spotlightRequest) return;

    spotlightRequest = requestAnimationFrame(() => {
        // Simple center-screen spotlight for this demo
        // For a more advanced demo, copy the full intersection logic from main.js
        const x = window.innerWidth / 2;
        const y = window.innerHeight / 2;
        
        // Use CSS variables expected by the theme
        // Assuming theme-spotlight uses --spotlight-x/y or centers automatically?
        // Let's check style.css if possible, but for now we'll match main.js logic
        // which sets --spotlight-x on body.
        
        // Just center it horizontally based on the PDF container like main.js
        const rect = container.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        document.body.style.setProperty('--spotlight-x', `${centerX}px`);
        
        spotlightRequest = null;
    });
}

// Initial Position
updateSpotlightPosition();
window.addEventListener('resize', updateSpotlightPosition);
