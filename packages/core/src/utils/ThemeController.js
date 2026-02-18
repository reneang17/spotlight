export class ThemeController {
  constructor(container) {
    this.container = container;
    this.currentTheme = 'default';
  }

  setContainer(container) {
      this.container = container;
      this.applyTheme();
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

  applyTheme() {
      if (!this.container) return;
      
      // Remove known themes
      this.container.classList.remove('theme-paper');
      this.container.classList.remove('theme-dark');
      
      // Apply current
      if (this.currentTheme === 'paper') {
          this.container.classList.add('theme-paper');
      } else if (this.currentTheme === 'dark') {
          this.container.classList.add('theme-dark');
      }
  }
}
