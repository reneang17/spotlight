import * as pdfjsLib from 'pdfjs-dist';

export class SmartWorker {
  static configure(workerUrl) {
    if (workerUrl) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
      return;
    }

    // Default to jsdelivr CDN matching the installed version
    const version = pdfjsLib.version;
    const cdnUrl = `//cdn.jsdelivr.net/npm/pdfjs-dist@${version}/build/pdf.worker.min.mjs`;
    
    console.warn(`BridgePDF: No local worker provided. Falling back to CDN: ${cdnUrl}`);
    pdfjsLib.GlobalWorkerOptions.workerSrc = cdnUrl;
  }
}
