# Spotlight PDF Viewer

Spotlight is a minimalist, high-performance web-based PDF viewer built with `pdf.js`. It features a clean interface, smooth navigation, and optimized rendering.

## Features

- **Document Loading**: Upload local PDF files directly from the landing page.
- **Performance**: Virtualized rendering for large documents using `IntersectionObserver`.
- **Navigation**: Next/Previous buttons, direct page jump, and keyboard shortcuts (Arrow keys).
- **Zoom**: Control document scale with Zoom In/Out/Reset.
- **Definition Control**: Adjust rendering quality (pixel density) via a slider to balance performance and visual sharpness.
- **Thumbnails**: Toggleable sidebar with page previews.
- **Annotations**: Support for links and basic form fields.

## Tech Stack

- **Core**: Vanilla JavaScript (ES modules)
- **PDF Rendering**: `pdfjs-dist`
- **Build Tool**: Vite

## Getting Started

1.  Clone the repository:
    ```bash
    git clone https://github.com/reneang17/spotlight.git
    cd spotlight
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Run the development server:
    ```bash
    npm run dev
    ```

4.  Open `http://localhost:5173` in your browser.

## Project Structure

- `packages/core`: The core `BridgePDF` library (headless controller).
- `packages/playground`: The demo application showcasing the viewer features.

## License

MIT
