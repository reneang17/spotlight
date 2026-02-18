import * as pdfjsLib from 'pdfjs-dist';
import { EventBus } from './EventBus.js';
import { SmartWorker } from './utils/SmartWorker.js';

import { ThumbnailViewer } from './utils/ThumbnailViewer.js';
import { ThemeController } from './utils/ThemeController.js';

export class BridgePDF {
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      url: options.url || '',
      scale: options.scale || 1.0,
      scrollMode: options.scrollMode || 0, // 0: Vertical, 1: Horizontal, 2: Wrapped
      spreadMode: options.spreadMode || 0, // 0: None, 1: Odd, 2: Even
      workerUrl: options.workerUrl || null,
      ...options
    };

    this.state = {
      pdfDocument: null,
      currentPage: 1,
      totalPages: 0,
      zoomLevel: this.options.scale,
      renderQuality: this.options.quality || window.devicePixelRatio || 1.0,
      renderingQueue: new Set(),
      aspectRatio: null, // Width / Height
      originalWidth: 0,
      originalHeight: 0,
    };

    this.eventBus = new EventBus();
    
    // Initialize SmartWorker
    SmartWorker.configure(this.options.workerUrl);

    this.thumbnailViewer = new ThumbnailViewer(this);
    this.themeController = new ThemeController(this.container);

    // Bind methods
    this.loadDocument = this.loadDocument.bind(this);
    this.renderPage = this.renderPage.bind(this);
    this.renderThumbnail = this.renderThumbnail.bind(this);
    this.goToPage = this.goToPage.bind(this);
  }

  togglePaperMode() {
      return this.themeController.togglePaperMode();
  }

  toggleDarkMode() {
      return this.themeController.toggleDarkMode();
  }

  setThumbnailContainer(container) {
      this.thumbnailViewer.setContainer(container);
  }

  on(event, callback) {
    return this.eventBus.on(event, callback);
  }

  goToPage(pageNumber) {
      if (pageNumber < 1 || pageNumber > this.state.totalPages) return;
      this.state.currentPage = pageNumber;
      
      const pageData = this.pageMap.get(pageNumber);
      if (pageData && pageData.element) {
          pageData.element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          // Virtualization observer will trigger renderPage, but we can force it if needed/preferred
          this.renderPage(pageNumber);
      }
      this.eventBus.emit('page-changed', { pageNumber });
  }


  async setZoom(newScale) {
    if (newScale <= 0 || newScale === this.state.zoomLevel) return;
    
    // 1. Update Zoom Level
    this.state.zoomLevel = newScale;
    
    // 2. Save current page to restore position
    const targetPage = this.state.currentPage || 1;
    
    // 3. Re-initialize virtualization
    // This clears the container and rebuilds placeholders with new dimensions
    await this.initVirtualization();
    
    // 4. Restore position
    // We use goToPage to scroll back to the page we were on
    this.goToPage(targetPage);
    
    this.eventBus.emit('zoom-changed', { zoomLevel: this.state.zoomLevel });
  }

  async setRenderQuality(quality) {
      if (quality <= 0 || quality === this.state.renderQuality) return;
      this.state.renderQuality = quality;
      
      // Re-render all rendered pages with new quality
      // We can iterate pageMap and force re-render if visible/rendered
      this.pageMap.forEach((data, pageNumber) => {
          if (data.rendered) {
              data.rendered = false; // Force re-render
              // Optional: Clear canvas?
              const canvas = data.element.querySelector('canvas');
              if (canvas) {
                  const ctx = canvas.getContext('2d');
                  ctx.clearRect(0, 0, canvas.width, canvas.height);
              }
          }
      });
      
      // Trigger update for visible pages
      this.observer.takeRecords(); // Clear pending
      // Manually trigger for current page range? 
      // Actually intersection observer callbacks happen on scroll.
      // We need to re-trigger for currently visible.
      // Simple way: 
      this.pageMap.forEach((data, pageNumber) => {
         // Check if visible? For MVP, just re-render if it was rendered.
         // Or rely on scroll. 
         // Let's re-render current page and neighbors.
         if (Math.abs(pageNumber - this.state.currentPage) <= 1) {
             this.renderPage(pageNumber);
         }
      });
      
      this.thumbnailViewer.reset();
      this.eventBus.emit('quality-changed', { quality: this.state.renderQuality });
  }

  async loadDocument(url) {
    const loadUrl = url || this.options.url;
    if (!loadUrl) {
      throw new Error('BridgePDF: No URL provided for loading.');
    }

    try {
      this.eventBus.emit('loading-start', { url: loadUrl });
      
      const loadingTask = pdfjsLib.getDocument(loadUrl);
      this.state.pdfDocument = await loadingTask.promise;
      
      this.state.totalPages = this.state.pdfDocument.numPages;
      
      // Get first page dimensions for proportions
      const firstPage = await this.state.pdfDocument.getPage(1);
      const viewport = firstPage.getViewport({ scale: 1.0 });
      
      this.state.aspectRatio = viewport.width / viewport.height;
      this.state.originalWidth = viewport.width;
      this.state.originalHeight = viewport.height;

      this.eventBus.emit('document-loaded', { 
        totalPages: this.state.totalPages,
        pdfDocument: this.state.pdfDocument,
        proportions: {
            width: viewport.width,
            height: viewport.height,
            aspectRatio: this.state.aspectRatio
        }
      });


      // Initialize Virtualization
      await this.initVirtualization();

    } catch (error) {
      this.eventBus.emit('error', error);
      console.error('BridgePDF Error:', error);
      throw error;
    }
  }

  async initVirtualization() {
    this.container.innerHTML = ''; // Clear existing
    this.pageMap = new Map(); // Store page elements
    
    // dimensions based on ZOOM level and ASPECT RATIO
    // If we have original width, we scale it.
    // However, usually we want to fit to width or similar. 
    // Here we use scale as a multiplier of original size (standard PDF.js behavior)
    const width = this.state.originalWidth * this.state.zoomLevel;
    const height = width / this.state.aspectRatio;

    // Create placeholders
    for (let i = 1; i <= this.state.totalPages; i++) {
        const pageContainer = document.createElement('div');
        pageContainer.className = 'bridge-page-container';
        pageContainer.setAttribute('data-page-number', i);
        pageContainer.style.width = `${width}px`;
        pageContainer.style.height = `${height}px`;
        pageContainer.style.position = 'relative';
        pageContainer.style.marginBottom = '20px';
        
        this.container.appendChild(pageContainer);
        this.pageMap.set(i, { element: pageContainer, rendered: false });
    }

    // Setup IntersectionObserver
    const options = {
        root: this.container.parentElement, // Assuming container is scrolling? Or container itself.
        rootMargin: '200px', // Pre-load margin
        threshold: 0
    };

    this.observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const pageNum = parseInt(entry.target.getAttribute('data-page-number'));
                this.renderPage(pageNum);
            }
        });
    }, options);

    this.pageMap.forEach((value) => {
        this.observer.observe(value.element);
    });
    
    // Trigger Thumbnails render if container is set
    this.thumbnailViewer.render();
    
    this.initPageObserver();
  }

  initPageObserver() {
      const options = {
          root: this.container.parentElement,
          rootMargin: '-50% 0px -50% 0px', // Center line detection
          threshold: 0
      };
      
      this.pageObserver = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
              if (entry.isIntersecting) {
                  const pageNum = parseInt(entry.target.getAttribute('data-page-number'));
                  if (pageNum !== this.state.currentPage) {
                      this.state.currentPage = pageNum;
                      this.eventBus.emit('page-changed', { pageNumber: pageNum });
                  }
              }
          });
      }, options);
      
      this.pageMap.forEach((value) => {
          this.pageObserver.observe(value.element);
      });
  }

  // Unified Rendering Method
  async renderPageToContext(pageNumber, canvasContext, scale = 1.0, quality = 1.0) {
      const page = await this.state.pdfDocument.getPage(pageNumber);
      
      // Calculate viewport based on scale
      // If we simply want to match width?
      // For now, let's respect the requested scale.
      const viewport = page.getViewport({ scale });
      
      const transform = [quality, 0, 0, quality, 0, 0];
      
      const renderContext = {
        canvasContext,
        viewport,
        transform
      };
      
      await page.render(renderContext).promise;
      
      return viewport;
  }

  async renderPage(pageNumber) {
    if (!this.state.pdfDocument) return;
    const pageData = this.pageMap.get(pageNumber);
    if (!pageData || pageData.rendered || this.state.renderingQueue.has(pageNumber)) return;

    try {
      this.state.renderingQueue.add(pageNumber);
      this.eventBus.emit('page-rendering', { pageNumber });

      const pageContainer = pageData.element;
      
      // Current dimensions from layout
      // We want to fill the container width/height ideally
      // Or rather, we set the container size based on zoom.
      // So render scale should match zoom level.
      const scale = this.state.zoomLevel;
      const quality = this.state.renderQuality;

      // Create canvas
      let canvas = pageContainer.querySelector('canvas');
      if (!canvas) {
        canvas = document.createElement('canvas');
        pageContainer.appendChild(canvas);
      }

      const context = canvas.getContext('2d');
      
      // We need to fetch page to get viewport for canvas sizing
      // But we can estimate from aspect ratio + zomm
      // However, renderPageToContext fetches page anyway.
      
      // Let's get the page first to confirm dimensions
      const page = await this.state.pdfDocument.getPage(pageNumber);
      const viewport = page.getViewport({ scale });
      
      // Update container if needed (should match initVirtualization)
      if (Math.abs(parseFloat(pageContainer.style.width) - viewport.width) > 1) {
          pageContainer.style.width = `${viewport.width}px`;
          pageContainer.style.height = `${viewport.height}px`;
      }

      // Canvas dimensions depend on quality (pixel density)
      canvas.height = Math.floor(viewport.height * quality);
      canvas.width = Math.floor(viewport.width * quality);
      
      // CSS dimensions match viewport
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;

      // Use unified render
      await this.renderPageToContext(pageNumber, context, scale, quality);

      // Text Layer
      if (this.options.enableTextLayer !== false) {
        let textLayerDiv = pageContainer.querySelector('.textLayer');
        if (!textLayerDiv) {
            textLayerDiv = document.createElement('div');
            textLayerDiv.className = 'textLayer';
            pageContainer.appendChild(textLayerDiv);
        }
        
        textLayerDiv.innerHTML = '';
        textLayerDiv.style.width = `${viewport.width}px`;
        textLayerDiv.style.height = `${viewport.height}px`;

        const textContent = await page.getTextContent();
        
        const textLayer = new pdfjsLib.TextLayer({
            textContentSource: textContent,
            container: textLayerDiv,
            viewport: viewport,
        });
        await textLayer.render();
      }

      // Annotation Layer
      if (this.options.enableAnnotationLayer !== false) {
          let annotationLayerDiv = pageContainer.querySelector('.annotationLayer');
          if (!annotationLayerDiv) {
              annotationLayerDiv = document.createElement('div');
              annotationLayerDiv.className = 'annotationLayer';
              pageContainer.appendChild(annotationLayerDiv);
          }
          
          annotationLayerDiv.innerHTML = '';
          annotationLayerDiv.style.width = `${viewport.width}px`;
          annotationLayerDiv.style.position = 'absolute';
          annotationLayerDiv.style.left = '0';
          annotationLayerDiv.style.top = '0';
          annotationLayerDiv.style.pointerEvents = 'none'; 
          
          const annotations = await page.getAnnotations();
          this.renderAnnotations(annotations, annotationLayerDiv, viewport);
      }

      pageData.rendered = true;
      this.state.renderingQueue.delete(pageNumber);
      this.eventBus.emit('page-rendered', { pageNumber });

    } catch (error) {
      console.error(`Error rendering page ${pageNumber}:`, error);
      this.state.renderingQueue.delete(pageNumber);
      this.eventBus.emit('error', { type: 'render-error', pageNumber, error });
    }
  }

  // Public method for thumbnails to use
  async renderThumbnail(pageNumber, canvas, width) {
      // Calculate scale to fit width
      // width = originalWidth * scale
      // scale = width / originalWidth
      const scale = width / this.state.originalWidth;
      const quality = this.state.renderQuality;
      
      const context = canvas.getContext('2d');
      // Set dimensions
      const height = width / this.state.aspectRatio;
      
      canvas.width = Math.floor(width * quality);
      canvas.height = Math.floor(height * quality);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      return this.renderPageToContext(pageNumber, context, scale, quality);
  }

  renderAnnotations(annotations, container, viewport) {
      annotations.forEach(annotation => {
          if (!annotation.rect) return;
          const rect = viewport.convertToViewportRectangle(annotation.rect);
          
          const [x1, y1, x2, y2] = rect;
          const width = x2 - x1;
          const height = y2 - y1; 
          
          const x = Math.min(x1, x2);
          const y = Math.min(y1, y2); 
          const w = Math.abs(x2 - x1);
          const h = Math.abs(y2 - y1);
          
          const element = document.createElement('div'); 
          element.style.position = 'absolute';
          element.style.left = `${x}px`;
          element.style.top = `${y}px`;
          element.style.width = `${w}px`;
          element.style.height = `${h}px`;
          element.style.pointerEvents = 'auto'; 
          
          if (annotation.subtype === 'Link' && annotation.url) {
              const link = document.createElement('a');
              link.href = annotation.url;
              link.target = '_blank';
              link.style.display = 'block';
              link.style.width = '100%';
              link.style.height = '100%';
              link.title = annotation.url;
              element.appendChild(link);
              container.appendChild(element);
          } else if (annotation.subtype === 'Widget') {
              if (annotation.fieldType === 'Tx') { 
                  const input = document.createElement('input');
                  input.style.width = '100%';
                  input.style.height = '100%';
                  input.value = annotation.fieldValue || '';
                  element.appendChild(input);
                  container.appendChild(element);
              }
          }
      });
  }

  destroy() {
    if (this.observer) this.observer.disconnect();
    if (this.pageObserver) this.pageObserver.disconnect();
    this.container.innerHTML = '';
    if (this.state.pdfDocument) {
      this.state.pdfDocument.destroy();
    }
    // eventBus cleanup if needed
  }
}
