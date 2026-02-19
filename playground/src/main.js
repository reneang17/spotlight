import { BridgePDF, ThemeController } from '@bridge-pdf/core';
import '@bridge-pdf/core/src/theme.css';

const container = document.getElementById('pdf-container');
const prevBtn = document.getElementById('prev-page');
const nextBtn = document.getElementById('next-page');
const pageInput = document.getElementById('page-input');
const totalPagesSpan = document.getElementById('total-pages');

// Views
const landingView = document.getElementById('landing-view');
const viewerView = document.getElementById('viewer-view');
const fileUpload = document.getElementById('file-upload');
const loadDemoBtn = document.getElementById('load-demo');
const backHomeBtn = document.getElementById('back-home');

const toggleThumbnails = document.getElementById('toggle-thumbnails');
const thumbnailContainer = document.getElementById('thumbnail-container');
const toggleAnnotations = document.getElementById('toggle-annotations');
const zoomInBtn = document.getElementById('zoom-in');
const zoomOutBtn = document.getElementById('zoom-out');
const zoomResetBtn = document.getElementById('zoom-reset');
const zoomLevelSpan = document.getElementById('zoom-level');
const qualitySlider = document.getElementById('quality-slider');
const qualityVal = document.getElementById('quality-val');
const togglePaperBtn = document.getElementById('toggle-paper');
const toggleDarkBtn = document.getElementById('toggle-dark');
const toggleSidebarBtn = document.getElementById('toggle-sidebar');
const appContainer = document.getElementById('app');

// Sidebar Toggle Logic
toggleSidebarBtn.addEventListener('click', () => {
    appContainer.classList.toggle('sidebar-collapsed');
    // Resize bridge to fit new width
    setTimeout(() => {
        themeController.updateSpotlightPosition();
    }, 300); 
});

// Mobile Menu Logic
const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const sidebar = document.querySelector('.sidebar');

if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent closing immediately
        sidebar.classList.toggle('open');
    });
}

// Close mobile sidebar when clicking outside
document.addEventListener('click', (e) => {
    if (window.innerWidth <= 768 && sidebar.classList.contains('open')) {
        if (!sidebar.contains(e.target) && e.target !== mobileMenuBtn) {
            sidebar.classList.remove('open');
        }
    }
});

// Auto-collapse on desktop small screens, but on mobile we use CSS to hide/show
if (window.innerWidth > 768 && window.innerWidth <= 1024) {
    appContainer.classList.add('sidebar-collapsed');
}

// Initialize BridgePDF (Empty initially)
const bridge = new BridgePDF(container, {
  workerUrl: `${import.meta.env.BASE_URL}pdf.worker.min.mjs`,
  enableAnnotationLayer: toggleAnnotations.checked
});

const themeController = new ThemeController(document.body);

bridge.setThumbnailContainer(thumbnailContainer);

let currentPage = 1;

// Event Listeners
bridge.on('document-loaded', (data) => {
  totalPagesSpan.textContent = data.totalPages;
  console.log('Document Proportions:', data.proportions);
  
  // Mobile Auto-Fit Width Logic
  if (window.innerWidth <= 768) {
      const containerWidth = window.innerWidth; // Use full window width for edge-to-edge
      const pdfWidth = data.proportions.width;
      if (pdfWidth > 0 && containerWidth > 0) {
          const scale = containerWidth / pdfWidth; // Exact fit, no padding
          // Set state directly to affect initial render
          bridge.state.zoomLevel = scale;
          // Update UI
          zoomLevelSpan.textContent = `${Math.round(scale * 100)}%`;
      }
  }

  currentPage = 1;
  updateUI();
});

bridge.on('page-rendered', (data) => {
  console.log(`Page ${data.pageNumber} rendered`);
});

bridge.on('page-changed', (data) => {
    currentPage = data.pageNumber;
    updateUI();
});

bridge.on('error', (err) => {
  console.error('BridgePDF Error Event:', err);
  // alert(`Error: ${err.message || err}`);
});



// UI Controls
prevBtn.addEventListener('click', () => {
  if (currentPage > 1) {
    bridge.goToPage(currentPage - 1);
  }
});

nextBtn.addEventListener('click', () => {
  if (currentPage < bridge.state.totalPages) {
    bridge.goToPage(currentPage + 1);
  }
});

// View Logic
function showViewer(url) {
    if (!url) return;
    landingView.classList.add('hidden');
    viewerView.classList.remove('hidden');
    bridge.loadDocument(url);
}

function showLanding() {
    viewerView.classList.add('hidden');
    landingView.classList.remove('hidden');
    // Optional: Clear bridge?
    // bridge.destroy(); // Would need re-init
}

fileUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
        const url = URL.createObjectURL(file);
        showViewer(url);
    } else {
        alert('Please select a valid PDF file.');
    }
});

loadDemoBtn.addEventListener('click', () => {
    showViewer('https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/web/compressed.tracemonkey-pldi-09.pdf');
});

backHomeBtn.addEventListener('click', () => {
    showLanding();
});


// Initialize Spotlight Tracking via Core
const pdfContainer = document.getElementById('pdf-container');
// const previewContainer = document.querySelector('.preview'); // No longer needed for scrolling
if (pdfContainer) {
    themeController.trackSpotlight(pdfContainer);
}

toggleThumbnails.addEventListener('change', (e) => {
    const app = document.getElementById('app');
    if (e.target.checked) {
        thumbnailContainer.classList.add('visible');
        app.classList.add('with-thumbnails');
        // Only render if empty to avoid restart
        if (thumbnailContainer.children.length === 0) {
             bridge.thumbnailViewer.render();
        }
    } else {
        thumbnailContainer.classList.remove('visible');
        app.classList.remove('with-thumbnails');
    }

    // Explicitly update spotlight multiple times to handle race conditions
    themeController.updateSpotlightPosition(); 
    setTimeout(() => themeController.updateSpotlightPosition(), 50);
    setTimeout(() => themeController.updateSpotlightPosition(), 300);
});

pageInput.addEventListener('change', (e) => {
    let page = parseInt(e.target.value);
    if (page >= 1 && page <= bridge.state.totalPages) {
        bridge.goToPage(page);
    } else {
        // Reset to valid current page if invalid
        e.target.value = currentPage;
    }
});

// Keyboard Navigation
document.addEventListener('keydown', (e) => {
    // Ignore if typing in an input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        if (currentPage < bridge.state.totalPages) {
            bridge.goToPage(currentPage + 1);
        }
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        if (currentPage > 1) {
            bridge.goToPage(currentPage - 1);
        }
    }
});

// Zoom Controls
zoomInBtn.addEventListener('click', () => {
    bridge.setZoom(bridge.state.zoomLevel + 0.25);
});

zoomOutBtn.addEventListener('click', () => {
    bridge.setZoom(Math.max(0.25, bridge.state.zoomLevel - 0.25));
});

zoomResetBtn.addEventListener('click', () => {
    bridge.setZoom(1.0);
});

bridge.on('zoom-changed', ({ zoomLevel }) => {
    zoomLevelSpan.textContent = `${Math.round(zoomLevel * 100)}%`;
});

// Definition Control
qualitySlider.addEventListener('input', (e) => {
    const quality = parseFloat(e.target.value);
    qualityVal.textContent = quality.toFixed(1);
    bridge.setRenderQuality(quality);
});
toggleAnnotations.addEventListener('change', (e) => {
    // This requires a method in BridgePDF to toggle options dynamically
    // For now, simpler to reload or just toggle CSS if implemented that way?
    // BridgePDF doesn't have a setOption method yet.
    // Let's implement setOption or just public options access + re-render.
    bridge.options.enableAnnotationLayer = e.target.checked;
    // Force re-render of current view
    // A full reload is safest for MVP to ensure layers are added/removed correctly
    bridge.loadDocument(); // Reloads current document
});

const toggleLampBtn = document.getElementById('toggle-lamp');
const toggleSpotlightBtn = document.getElementById('toggle-spotlight');

togglePaperBtn.addEventListener('click', () => {
    const isPaper = themeController.togglePaperMode();
    togglePaperBtn.textContent = isPaper ? "Disable Paper Mode" : "Enable Paper Mode";
    
    // Reset others
    if (isPaper) {
        toggleDarkBtn.textContent = "Enable Dark Mode";
        toggleLampBtn.textContent = "Enable Lamp Mode";
        toggleSpotlightBtn.textContent = "Enable Spotlight Mode";
    }
});

toggleDarkBtn.addEventListener('click', () => {
    const isDark = themeController.toggleDarkMode();
    toggleDarkBtn.textContent = isDark ? "Disable Dark Mode" : "Enable Dark Mode";
    
    // Reset others
    if (isDark) {
        togglePaperBtn.textContent = "Enable Paper Mode";
        toggleLampBtn.textContent = "Enable Lamp Mode";
        toggleSpotlightBtn.textContent = "Enable Spotlight Mode";
    }
});

toggleLampBtn.addEventListener('click', () => {
    const isLamp = themeController.toggleLampMode();
    toggleLampBtn.textContent = isLamp ? "Disable Lamp Mode" : "Enable Lamp Mode";
    
    // Reset others
    if (isLamp) {
        togglePaperBtn.textContent = "Enable Paper Mode";
        toggleDarkBtn.textContent = "Enable Dark Mode";
        toggleSpotlightBtn.textContent = "Enable Spotlight Mode";
    }
});

const spotlightControls = document.getElementById('spotlight-controls');
const spotlightSizeSlider = document.getElementById('spotlight-size-slider');

toggleSpotlightBtn.addEventListener('click', () => {
    const isSpotlight = themeController.toggleSpotlightMode();
    toggleSpotlightBtn.textContent = isSpotlight ? "Disable Spotlight Mode" : "Enable Spotlight Mode";
    
    // Toggle controls visibility
    spotlightControls.style.display = isSpotlight ? 'block' : 'none';
    
    // Reset others
    if (isSpotlight) {
        togglePaperBtn.textContent = "Enable Paper Mode";
        toggleDarkBtn.textContent = "Enable Dark Mode";
        toggleLampBtn.textContent = "Enable Lamp Mode";
    }
});

spotlightSizeSlider.addEventListener('input', (e) => {
    const size = e.target.value;
    document.body.style.setProperty('--spotlight-radius', `${size}%`);
});

function updateUI() {
  pageInput.value = currentPage;
}

// Initial Load handled by landing page
// bridge.loadDocument();

// Init Spotlight
// Handled by ThemeController

