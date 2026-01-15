import sharp from 'sharp';

// Import pdfjs-dist for Node.js - for page count and metadata only
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pdfjsLib: any = null;

async function getPdfjs() {
  if (!pdfjsLib) {
    pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
    // Disable worker for serverless environments (Vercel)
    pdfjsLib.GlobalWorkerOptions.workerSrc = '';
  }
  return pdfjsLib;
}

// Common options for loading PDFs in serverless environment
const PDF_LOAD_OPTIONS = {
  useSystemFonts: true,
  isEvalSupported: false,
  disableFontFace: true,
};

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
const RENDER_DENSITY = 150; // DPI for rendering
const THUMBNAIL_WIDTH = 300;
const JPEG_QUALITY = 85;
const THUMBNAIL_QUALITY = 70;

/**
 * Process a PDF buffer and extract all pages as images using sharp
 * Sharp uses libvips which can handle PDFs directly on Vercel
 */
export async function processPDF(pdfBuffer: Buffer | ArrayBuffer): Promise<PDFProcessingResult> {
  const buffer = pdfBuffer instanceof Buffer ? pdfBuffer : Buffer.from(new Uint8Array(pdfBuffer));

  // Get page count and metadata using pdfjs (lightweight operation)
  let pageCount = 0;
  let metadata: PDFProcessingResult['metadata'] = {};

  try {
    const pdfjs = await getPdfjs();
    const data = new Uint8Array(buffer);
    const loadingTask = pdfjs.getDocument({ data, ...PDF_LOAD_OPTIONS });
    const pdfDoc = await loadingTask.promise;
    pageCount = pdfDoc.numPages;

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
  } catch (error) {
    console.error('Failed to get PDF info with pdfjs:', error);
    // Fallback: try to render and count pages
    pageCount = await countPagesWithSharp(buffer);
  }

  console.log(`PDF has ${pageCount} pages, rendering with sharp...`);

  // Process each page using sharp
  const pages: ProcessedPage[] = [];

  for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
    try {
      const processedPage = await renderPageWithSharp(buffer, pageNum);
      if (processedPage) {
        pages.push(processedPage);
        console.log(`Rendered page ${pageNum}/${pageCount}`);
      }
    } catch (error) {
      console.error(`Failed to render page ${pageNum}:`, error);
    }
  }

  return {
    pageCount,
    pages,
    metadata,
  };
}

/**
 * Render a single PDF page using sharp
 */
async function renderPageWithSharp(pdfBuffer: Buffer, pageNumber: number): Promise<ProcessedPage | null> {
  try {
    // Sharp can read specific pages from multi-page PDFs using the page option
    const image = sharp(pdfBuffer, {
      density: RENDER_DENSITY,
      page: pageNumber - 1, // sharp uses 0-based page index
    });

    // Get metadata for dimensions
    const meta = await image.metadata();
    const width = meta.width || 0;
    const height = meta.height || 0;

    if (width === 0 || height === 0) {
      console.error(`Page ${pageNumber} has invalid dimensions`);
      return null;
    }

    // Create full-size JPEG
    const imageBuffer = await image
      .jpeg({ quality: JPEG_QUALITY })
      .toBuffer();

    // Create thumbnail
    const thumbnailBuffer = await sharp(pdfBuffer, {
      density: RENDER_DENSITY,
      page: pageNumber - 1,
    })
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
  } catch (error) {
    console.error(`Sharp failed to render page ${pageNumber}:`, error);
    return null;
  }
}

/**
 * Count pages in PDF using sharp (fallback method)
 */
async function countPagesWithSharp(pdfBuffer: Buffer): Promise<number> {
  try {
    const meta = await sharp(pdfBuffer).metadata();
    return meta.pages || 1;
  } catch {
    return 1;
  }
}

/**
 * Process a single page from a PDF (for on-demand processing)
 */
export async function processSinglePage(
  pdfBuffer: Buffer | ArrayBuffer,
  pageNumber: number
): Promise<ProcessedPage | null> {
  const buffer = pdfBuffer instanceof Buffer ? pdfBuffer : Buffer.from(new Uint8Array(pdfBuffer));
  return renderPageWithSharp(buffer, pageNumber);
}

/**
 * Get the page count of a PDF without processing all pages
 */
export async function getPDFPageCount(pdfBuffer: Buffer | ArrayBuffer): Promise<number> {
  const buffer = pdfBuffer instanceof Buffer ? pdfBuffer : Buffer.from(new Uint8Array(pdfBuffer));

  try {
    const pdfjs = await getPdfjs();
    const data = new Uint8Array(buffer);
    const loadingTask = pdfjs.getDocument({ data, ...PDF_LOAD_OPTIONS });
    const pdfDoc = await loadingTask.promise;
    return pdfDoc.numPages;
  } catch {
    // Fallback to sharp
    return countPagesWithSharp(buffer);
  }
}
