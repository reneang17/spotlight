import { BridgePDF, ThemeController } from '@bridge-pdf/core';

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

// Initialize BridgePDF (Empty initially)
const bridge = new BridgePDF(container, {
  workerUrl: '/pdf.worker.min.mjs',
  enableAnnotationLayer: toggleAnnotations.checked
});

const themeController = new ThemeController(container);

bridge.setThumbnailContainer(thumbnailContainer);

let currentPage = 1;

// Event Listeners
bridge.on('document-loaded', (data) => {
  totalPagesSpan.textContent = data.totalPages;
  console.log('Document Proportions:', data.proportions);
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

togglePaperBtn.addEventListener('click', () => {
    const isPaper = themeController.togglePaperMode();
    togglePaperBtn.textContent = isPaper ? "Disable Paper Mode" : "Enable Paper Mode";
    // Ensure Dark Mode UI is reset if mutually exclusive (handled by controller but update UI)
    if (isPaper) toggleDarkBtn.textContent = "Enable Dark Mode";
});

toggleDarkBtn.addEventListener('click', () => {
    const isDark = themeController.toggleDarkMode();
    toggleDarkBtn.textContent = isDark ? "Disable Dark Mode" : "Enable Dark Mode";
    // Reset Paper Mode UI
    if (isDark) togglePaperBtn.textContent = "Enable Paper Mode";
});

function updateUI() {
  pageInput.value = currentPage;
}

// Initial Load handled by landing page
// bridge.loadDocument();
