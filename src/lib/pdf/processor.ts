import { createCanvas } from 'canvas';
import sharp from 'sharp';

// Import pdfjs-dist for Node.js - using dynamic import for ESM module
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pdfjsLib: any = null;

async function getPdfjs() {
  if (!pdfjsLib) {
    pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
    pdfjsLib.GlobalWorkerOptions.workerSrc = '';
  }
  return pdfjsLib;
}

export interface ProcessedPage {
  pageNumber: number;
  width: number;
  height: number;
  imageBuffer: Buffer;
  thumbnailBuffer: Buffer;
}

export interface PDFProcessingResult {
  pageCount: number;
  pages: ProcessedPage[];
  metadata: {
    title?: string;
    author?: string;
    subject?: string;
    creator?: string;
  };
}

// Configuration
const RENDER_SCALE = 2.0; // 2x for good quality
const THUMBNAIL_WIDTH = 300;
const JPEG_QUALITY = 85;
const THUMBNAIL_QUALITY = 70;

/**
 * Process a PDF buffer and extract all pages as images
 */
export async function processPDF(pdfBuffer: Buffer | ArrayBuffer): Promise<PDFProcessingResult> {
  const pdfjs = await getPdfjs();

  // Convert to Uint8Array for pdfjs
  const data = pdfBuffer instanceof Buffer
    ? new Uint8Array(pdfBuffer)
    : new Uint8Array(pdfBuffer);

  // Load the PDF document
  const loadingTask = pdfjs.getDocument({
    data,
    useSystemFonts: true,
  });

  const pdfDoc = await loadingTask.promise;
  const pageCount = pdfDoc.numPages;

  // Get metadata
  let metadata: PDFProcessingResult['metadata'] = {};
  try {
    const meta = await pdfDoc.getMetadata();
    if (meta?.info) {
      metadata = {
        title: meta.info.Title as string | undefined,
        author: meta.info.Author as string | undefined,
        subject: meta.info.Subject as string | undefined,
        creator: meta.info.Creator as string | undefined,
      };
    }
  } catch {
    // Metadata extraction failed, continue without it
  }

  // Process each page
  const pages: ProcessedPage[] = [];

  for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const processedPage = await renderPage(page, pageNum);
    pages.push(processedPage);
  }

  return {
    pageCount,
    pages,
    metadata,
  };
}

/**
 * Render a single PDF page to image buffers
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function renderPage(page: any, pageNumber: number): Promise<ProcessedPage> {
  // Get page dimensions at render scale
  const viewport = page.getViewport({ scale: RENDER_SCALE });
  const width = Math.floor(viewport.width);
  const height = Math.floor(viewport.height);

  // Create canvas
  const canvas = createCanvas(width, height);
  const context = canvas.getContext('2d');

  // Render page to canvas
  // pdfjs expects a specific render context format
  await page.render({
    canvasContext: context,
    viewport: viewport,
  }).promise;

  // Convert canvas to PNG buffer
  const pngBuffer = canvas.toBuffer('image/png');

  // Create full-size JPEG for storage (smaller than PNG)
  const imageBuffer = await sharp(pngBuffer)
    .jpeg({ quality: JPEG_QUALITY })
    .toBuffer();

  // Create thumbnail
  const thumbnailBuffer = await sharp(pngBuffer)
    .resize(THUMBNAIL_WIDTH, null, { fit: 'inside' })
    .jpeg({ quality: THUMBNAIL_QUALITY })
    .toBuffer();

  return {
    pageNumber,
    width,
    height,
    imageBuffer,
    thumbnailBuffer,
  };
}

/**
 * Process a single page from a PDF (for on-demand processing)
 */
export async function processSinglePage(
  pdfBuffer: Buffer | ArrayBuffer,
  pageNumber: number
): Promise<ProcessedPage | null> {
  const pdfjs = await getPdfjs();

  const data = pdfBuffer instanceof Buffer
    ? new Uint8Array(pdfBuffer)
    : new Uint8Array(pdfBuffer);

  const loadingTask = pdfjs.getDocument({
    data,
    useSystemFonts: true,
  });

  const pdfDoc = await loadingTask.promise;

  if (pageNumber < 1 || pageNumber > pdfDoc.numPages) {
    return null;
  }

  const page = await pdfDoc.getPage(pageNumber);
  return renderPage(page, pageNumber);
}

/**
 * Get the page count of a PDF without processing all pages
 */
export async function getPDFPageCount(pdfBuffer: Buffer | ArrayBuffer): Promise<number> {
  const pdfjs = await getPdfjs();

  const data = pdfBuffer instanceof Buffer
    ? new Uint8Array(pdfBuffer)
    : new Uint8Array(pdfBuffer);

  const loadingTask = pdfjs.getDocument({
    data,
    useSystemFonts: true,
  });

  const pdfDoc = await loadingTask.promise;
  return pdfDoc.numPages;
}
