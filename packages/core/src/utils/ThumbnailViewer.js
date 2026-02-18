export class ThumbnailViewer {
  constructor(bridgePDF) {
    this.bridge = bridgePDF;
    this.container = null;
    this.thumbnails = new Map(); // pageNum -> { element, rendered }
    
    // Listen to page changes
    this.bridge.on('page-changed', ({ pageNumber }) => {
        this.highlightPage(pageNumber);
    });
  }

  setContainer(container) {
    this.container = container;
    this.clean();
  }

  clean() {
    if (this.container) {
        this.container.innerHTML = '';
    }
    this.thumbnails.clear();
  }

  async render() {
    if (!this.container || !this.bridge.state.pdfDocument) return;
    
    // Prevent duplicate rendering or rendering on invalid state
    if (this.thumbnails.size > 0 && this.container.children.length > 0) {
        // Already rendered placeholder structure?
        // If we want to support re-render (e.g. resize), we should clean.
        // But for toggle visibility, we might just want to refresh observer?
        // Let's safe clean to be sure.
        this.clean();
    }
    
    const numPages = this.bridge.state.totalPages;
    
    // Get first page to estimate aspect ratio
    const firstPage = await this.bridge.state.pdfDocument.getPage(1);
    const viewport = firstPage.getViewport({ scale: 0.2 }); // Thumbnail scale
    
    for (let i = 1; i <= numPages; i++) {
        const thumbContainer = document.createElement('div');
        thumbContainer.className = 'bridge-thumbnail';
        thumbContainer.setAttribute('data-page-number', i);
        thumbContainer.onclick = () => this.bridge.goToPage(i);
        thumbContainer.title = `Go to page ${i}`;
        
        // Placeholder style
        thumbContainer.style.width = '100%';
        thumbContainer.style.minHeight = `${viewport.height}px`; // Min height to reduce layout shift? Or just let it flow?
        // Actually, if we want them to look good before load, we should probably keep aspect ratio.
        // But for now, let's just make it auto to fit content.
        thumbContainer.style.height = 'auto'; 
        thumbContainer.style.marginBottom = '20px'; // More space
        thumbContainer.style.cursor = 'pointer';
        thumbContainer.style.position = 'relative';
        thumbContainer.style.display = 'flex';
        thumbContainer.style.flexDirection = 'column';
        thumbContainer.style.alignItems = 'center';
        thumbContainer.style.padding = '10px';

        const label = document.createElement('div'); // Div for block
        label.className = 'bridge-thumbnail-label';
        label.textContent = `Page ${i}`;
        label.style.marginTop = '5px';
        label.style.fontSize = '12px';
        label.style.color = '#666';
        
        thumbContainer.appendChild(label);
        this.container.appendChild(thumbContainer);
        
        this.thumbnails.set(i, { element: thumbContainer, rendered: false });
        
        // Lazy render validation... or just render all since they are small?
        // Let's render lazily using IntersectionObserver for performance.
    }
    
    this.initObserver();
  }

  initObserver() {
      const options = {
          root: this.container, // Use container as root
          rootMargin: '50px', // Reduce margin to be more "lazy"
          threshold: 0.1 // Require at least 10% visibility
      };
      
      // If container has display:none, IntersectionObserver might not trigger.
      // But once it becomes visible, it SHOULD trigger.
      // However, root: this.container requires the container to have height/overflow.
      // Our CSS sets overflow-y: auto on sidebar.
      
      this.observer = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
              if (entry.isIntersecting) {
                  const pageNum = parseInt(entry.target.getAttribute('data-page-number'));
                  this.renderThumbnail(pageNum);
              }
          });
      }, options);
      
      this.thumbnails.forEach(t => this.observer.observe(t.element));
  }

  async renderThumbnail(pageNumber) {
      const data = this.thumbnails.get(pageNumber);
      if (!data || data.rendered) return;
      
      try {
          const page = await this.bridge.state.pdfDocument.getPage(pageNumber);
          // Scale to fit width of container? 
          // Let's assume standard width ~150px
          // But simpler: fixed scale 0.2
          const baseScale = 0.2;
          const viewport = page.getViewport({ scale: baseScale });
          
          let canvas = data.element.querySelector('canvas');
          if (!canvas) {
              canvas = document.createElement('canvas');
              data.element.insertBefore(canvas, data.element.firstChild); // Insert before label
          }

          const quality = this.bridge.state.renderQuality || 1.0;

          canvas.height = Math.floor(viewport.height * quality);
          canvas.width = Math.floor(viewport.width * quality);
          canvas.style.width = '100%';
          canvas.style.height = 'auto';
          // canvas.style.boxShadow = '0 1px 3px rgba(0,0,0,0.2)'; // Add shadow to page (moved to CSS or kept here)
          if (!canvas.style.boxShadow) canvas.style.boxShadow = '0 1px 3px rgba(0,0,0,0.2)';
          canvas.style.backgroundColor = 'white';
          
          const context = canvas.getContext('2d');
          const transform = [quality, 0, 0, quality, 0, 0];
          
          await page.render({ canvasContext: context, viewport, transform }).promise;
          
          data.rendered = true;
          
      } catch (e) {
          console.error(`Thumbnail render error page ${pageNumber}`, e);
      }
  }

  reset() {
      this.thumbnails.forEach(data => {
          data.rendered = false;
          const canvas = data.element.querySelector('canvas');
          if (canvas) {
              const ctx = canvas.getContext('2d');
              ctx.clearRect(0, 0, canvas.width, canvas.height);
          }
      });
      // Force re-check of visibility to trigger re-renders
      if (this.observer) {
          this.observer.disconnect();
          this.initObserver();
      }
  }
  
  highlightPage(pageNumber) {
      if (!this.container) return;
      
      // Remove existing highlight
      const previous = this.container.querySelector('.bridge-thumbnail.active');
      if (previous) previous.classList.remove('active');
      
      const current = this.thumbnails.get(pageNumber);
      if (current && current.element) {
          current.element.classList.add('active');
          
          // Scroll into view if needed
          // Only scroll if not fully visible? Or always center?
          // Using scrollIntoView with block: 'nearest' is standard behavior
          // But 'center' feels better for context?
          current.element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          
          // Ensure it's rendered if we jumped to it
          if (!current.rendered) {
              this.renderThumbnail(pageNumber);
          }
      }
  }

  destroy() {
      if (this.observer) this.observer.disconnect();
      this.clean();
  }
}
