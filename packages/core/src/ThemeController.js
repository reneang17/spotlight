export class ThemeController {
  constructor(container) {
    this.container = container;
    this.spotlightRequest = null;
    this.pdfContainer = null;
    this.scrollContainer = null;
    this.resizeObserver = null;
    this.boundUpdateSpotlight = this.updateSpotlightPosition.bind(this);
    this.isTracking = false;
  }

  setContainer(container) {
      this.container = container;
      this.applyTheme();
  }

  /* Spotlight Tracking Logic */
  trackSpotlight(pdfContainer, scrollContainer) {
      this.pdfContainer = pdfContainer;
      this.scrollContainer = scrollContainer;
      
      // Initialize ResizeObserver
      if (this.pdfContainer && !this.resizeObserver) {
          this.resizeObserver = new ResizeObserver(() => {
              this.updateSpotlightPosition();
          });
      }
      
      // Re-apply tracking if currently in a spotlight mode
      if (this.currentTheme === 'lamp' || this.currentTheme === 'spotlight') {
          this.enableSpotlightTracking();
      }
  }

  enableSpotlightTracking() {
      if (this.isTracking) return;
      if (!this.pdfContainer) return; // Can't track without target

      this.isTracking = true;
      
      // Listeners
      window.addEventListener('resize', this.boundUpdateSpotlight);
      if (this.scrollContainer) {
          this.scrollContainer.addEventListener('scroll', this.boundUpdateSpotlight);
      }
      if (this.resizeObserver) {
          this.resizeObserver.observe(this.pdfContainer);
      }
      
      // Initial update
      this.updateSpotlightPosition();
  }

  disableSpotlightTracking() {
      if (!this.isTracking) return;
      
      this.isTracking = false;
      
      window.removeEventListener('resize', this.boundUpdateSpotlight);
      if (this.scrollContainer) {
          this.scrollContainer.removeEventListener('scroll', this.boundUpdateSpotlight);
      }
      if (this.resizeObserver) {
          this.resizeObserver.disconnect();
      }
      
      if (this.spotlightRequest) {
          cancelAnimationFrame(this.spotlightRequest);
          this.spotlightRequest = null;
      }
  }

  updateSpotlightPosition() {
      if (this.spotlightRequest) return;
      if (!this.container) return; 

      this.spotlightRequest = requestAnimationFrame(() => {
          if (!this.pdfContainer) {
              this.spotlightRequest = null;
              return;
          }

          const rect = this.pdfContainer.getBoundingClientRect();
          
          if (rect.width > 0 && rect.height > 0) {
              // Calculate visible intersection
              const visibleLeft = Math.max(rect.left, 0);
              const visibleRight = Math.min(rect.right, window.innerWidth);
              
              if (visibleLeft < visibleRight) {
                  const centerX = (visibleLeft + visibleRight) / 2;
                  this.container.style.setProperty('--spotlight-x', `${centerX}px`);
                  this.spotlightRequest = null;
                  return;
              }
          } 
          
          // Fallback
          this.container.style.setProperty('--spotlight-x', '50%');
          this.spotlightRequest = null;
      });
  }

  togglePaperMode() {
      if (this.currentTheme === 'paper') {
          this.currentTheme = 'default';
      } else {
          this.currentTheme = 'paper';
      }
      this.applyTheme();
      return this.currentTheme === 'paper';
  }

  toggleDarkMode() {
      if (this.currentTheme === 'dark') {
          this.currentTheme = 'default';
      } else {
          this.currentTheme = 'dark';
      }
      this.applyTheme();
      return this.currentTheme === 'dark';
  }

  toggleLampMode() {
      if (this.currentTheme === 'lamp') {
          this.currentTheme = 'default';
      } else {
          this.currentTheme = 'lamp';
      }
      this.applyTheme();
      return this.currentTheme === 'lamp';
  }

  toggleSpotlightMode() {
      if (this.currentTheme === 'spotlight') {
          this.currentTheme = 'default';
      } else {
          this.currentTheme = 'spotlight';
      }
      this.applyTheme();
      return this.currentTheme === 'spotlight';
  }

  applyTheme() {
      if (!this.container) return;
      
      // Remove known themes
      this.container.classList.remove('theme-paper');
      this.container.classList.remove('theme-dark');
      this.container.classList.remove('theme-lamp');
      this.container.classList.remove('theme-spotlight');
      
      let isSpotlightActive = false;

      // Apply current
      if (this.currentTheme === 'paper') {
          this.container.classList.add('theme-paper');
      } else if (this.currentTheme === 'dark') {
          this.container.classList.add('theme-dark');
      } else if (this.currentTheme === 'lamp') {
          this.container.classList.add('theme-lamp');
          isSpotlightActive = true;
      } else if (this.currentTheme === 'spotlight') {
          this.container.classList.add('theme-spotlight');
          isSpotlightActive = true;
      }

      // Manage Tracking
      if (isSpotlightActive) {
          this.enableSpotlightTracking();
      } else {
          this.disableSpotlightTracking();
      }
  }
}
