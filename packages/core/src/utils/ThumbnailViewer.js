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
    
    // Prevent duplicate rendering
    if (this.thumbnails.size > 0 && this.container.children.length > 0) {
        this.clean();
    }
    
    const numPages = this.bridge.state.totalPages;
    const aspectRatio = this.bridge.state.aspectRatio;

    // Use a fixed width or percentage? 
    // Usually thumbnails sidebar has a fixed width.
    // Let's assume the container width controls the thumbnail width.
    // Actually, we need to set explicit height for lazy loading placeholders.
    // If container is hidden, ClientWidth might be 0.
    // Fallback?
    
    for (let i = 1; i <= numPages; i++) {
        const thumbContainer = document.createElement('div');
        thumbContainer.className = 'bridge-thumbnail';
        thumbContainer.setAttribute('data-page-number', i);
        thumbContainer.onclick = () => this.bridge.goToPage(i);
        thumbContainer.title = `Go to page ${i}`;
        
        // Style
        thumbContainer.style.width = '100%';
        thumbContainer.style.marginBottom = '20px'; 
        thumbContainer.style.cursor = 'pointer';
        thumbContainer.style.position = 'relative';
        thumbContainer.style.display = 'flex';
        thumbContainer.style.flexDirection = 'column';
        thumbContainer.style.alignItems = 'center';
        thumbContainer.style.padding = '10px';
        // Min-height based on approximate width? 
        // We can't know exact width if hidden.
        // Let's just set it to auto, and let the canvas set height when rendered?
        // OR better: set an aspect-ratio CSS property if supported?
        // thumbContainer.style.aspectRatio = `${aspectRatio}`; 
        // But that includes padding/labels.
        
        // Inner wrapper for Aspect Ratio
        const innerWrapper = document.createElement('div');
        innerWrapper.style.width = '100%';
        innerWrapper.style.position = 'relative';
        // Aspect Ratio trick or modern property
        innerWrapper.style.aspectRatio = `${aspectRatio}`;
        // Fallback for older browsers? PDF.js usually supports modern.
        if (!CSS.supports('aspect-ratio: 1')) {
            // Padding hack: height = width / ratio
            // padding-bottom = 1 / ratio * 100 %
            innerWrapper.style.paddingBottom = `${(1 / aspectRatio) * 100}%`;
        }

        const label = document.createElement('div'); 
        label.className = 'bridge-thumbnail-label';
        label.textContent = `Page ${i}`;
        label.style.marginTop = '5px';
        label.style.fontSize = '12px';
        label.style.color = '#666';
        
        thumbContainer.appendChild(innerWrapper);
        thumbContainer.appendChild(label);
        this.container.appendChild(thumbContainer);
        
        // We store innerWrapper as the target for canvas
        this.thumbnails.set(i, { element: thumbContainer, wrapper: innerWrapper, rendered: false });
    }
    
    this.initObserver();
  }

  initObserver() {
      const options = {
          root: this.container, 
          rootMargin: '50px', 
          threshold: 0.1 
      };
      
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
          const wrapper = data.wrapper;
          // Get current width
          let width = wrapper.clientWidth;
          
          // If 0 (hidden), rendering might fail or produce empty canvas.
          // Retry? Or assume default? 
          if (width === 0) {
              // Try to get container width
              width = this.container.clientWidth;
              // If still 0, maybe default to 150px?
              if (width === 0) width = 150; 
              // Adjust for padding if we used container width
              width = width - 20; // Approx padding
          }

          let canvas = wrapper.querySelector('canvas');
          if (!canvas) {
              canvas = document.createElement('canvas');
              // Make sure canvas fills wrapper
              canvas.style.width = '100%';
              canvas.style.height = '100%';
              canvas.style.display = 'block';
              if (canvas.style.position === 'absolute') {
                  // If using padding hack
                  canvas.style.position = 'absolute';
                  canvas.style.top = '0';
                  canvas.style.left = '0';
              }
              
              wrapper.appendChild(canvas);
          }
          
           // Shadow
          if (!canvas.style.boxShadow) canvas.style.boxShadow = '0 1px 3px rgba(0,0,0,0.2)';
          canvas.style.backgroundColor = 'white';

          // Use Bridge Unified Render
          // We pass the canvas and the desired width
          await this.bridge.renderThumbnail(pageNumber, canvas, width);
          
          data.rendered = true;
          
      } catch (e) {
          console.error(`Thumbnail render error page ${pageNumber}`, e);
      }
  }

  reset() {
      this.thumbnails.forEach(data => {
          data.rendered = false;
          // Clean canvas context?
          const canvas = data.wrapper.querySelector('canvas');
          if (canvas) {
              const ctx = canvas.getContext('2d');
              ctx.clearRect(0, 0, canvas.width, canvas.height);
          }
      });
      // Force re-check
      if (this.observer) {
          this.observer.disconnect();
          this.initObserver();
      }
  }
  
  highlightPage(pageNumber) {
      if (!this.container) return;
      
      const previous = this.container.querySelector('.bridge-thumbnail.active');
      if (previous) previous.classList.remove('active');
      
      const current = this.thumbnails.get(pageNumber);
      if (current && current.element) {
          current.element.classList.add('active');
          current.element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          
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
