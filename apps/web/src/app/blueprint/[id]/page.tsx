'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useBlueprintStore } from '@/lib/blueprint/store';
import type { PDFDocument, PDFPage } from '@/lib/supabase/types';
import * as pdfjsLib from 'pdfjs-dist';
import type {
  BlueprintAnalysisResult,
  DetectedArea,
  DetectedDimension,
  DetectedMaterial,
} from '@/lib/blueprint/analysis-types';

// Set worker path for pdf.js v5.x - use jsdelivr which has proper CORS headers
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
}

interface PageWithUrls extends PDFPage {
  imageUrl: string | null;
  thumbnailUrl: string | null;
}

interface DocumentData {
  document: PDFDocument;
  pages: PageWithUrls[];
  pdfUrl?: string;
  imageUrl?: string;
  renderMode?: 'client-side' | 'server-side' | 'direct-image';
  fileCategory?: 'pdf' | 'image';
}

// Client-side PDF page renderer
function ClientRenderedPage({
  pdfUrl,
  pageNumber,
  documentId,
  onExportToMap,
  onAnalyze,
  onViewResults,
  analysisResult,
  isAnalyzing,
}: {
  pdfUrl: string;
  pageNumber: number;
  documentId: string;
  onExportToMap: (imageDataUrl: string) => void;
  onAnalyze: (imageDataUrl: string, pageNumber: number) => void;
  onViewResults?: () => void;
  analysisResult?: BlueprintAnalysisResult | null;
  isAnalyzing?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isRendering, setIsRendering] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function renderPage() {
      if (!canvasRef.current) return;

      try {
        setIsRendering(true);
        setError(null);

        // Check if pdfUrl is valid
        if (!pdfUrl) {
          throw new Error('No PDF URL available');
        }

        console.log(`Loading PDF from: ${pdfUrl.substring(0, 100)}...`);

        // Load the PDF with CORS settings
        const loadingTask = pdfjsLib.getDocument({
          url: pdfUrl,
          withCredentials: false,
        });
        const pdf = await loadingTask.promise;

        if (cancelled) return;

        console.log(`PDF loaded, getting page ${pageNumber} of ${pdf.numPages}`);

        // Get the page
        const page = await pdf.getPage(pageNumber);

        if (cancelled) return;

        // Calculate scale for thumbnail (300px width)
        const viewport = page.getViewport({ scale: 1 });
        const scale = 300 / viewport.width;
        const scaledViewport = page.getViewport({ scale });

        // Set canvas dimensions
        const canvas = canvasRef.current;
        canvas.width = scaledViewport.width;
        canvas.height = scaledViewport.height;

        // Render the page
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Failed to get canvas context');

        await page.render({
          canvasContext: context,
          viewport: scaledViewport,
          canvas: canvas,
        }).promise;

        if (cancelled) return;

        // Store the data URL for export
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setImageDataUrl(dataUrl);
        setIsRendering(false);
        console.log(`Page ${pageNumber} rendered successfully`);
      } catch (err) {
        if (!cancelled) {
          const errorMsg = err instanceof Error ? err.message : 'Unknown error';
          console.error(`Failed to render page ${pageNumber}:`, err);
          setError(`Render failed: ${errorMsg}`);
          setIsRendering(false);
        }
      }
    }

    renderPage();

    return () => {
      cancelled = true;
    };
  }, [pdfUrl, pageNumber]);

  return (
    <div
      style={{
        background: 'white',
        borderRadius: '8px',
        border: '1px solid #e5e7eb',
        overflow: 'hidden',
      }}
    >
      {/* Thumbnail area */}
      <div
        style={{
          aspectRatio: '8.5/11',
          background: '#f3f4f6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {isRendering ? (
          <div style={{ textAlign: 'center', color: '#9ca3af' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                margin: '0 auto 8px',
                border: '3px solid #3b82f6',
                borderTopColor: 'transparent',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }}
            />
            <p style={{ fontSize: '12px' }}>Rendering...</p>
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', color: '#ef4444' }}>
            <p style={{ fontSize: '12px' }}>{error}</p>
          </div>
        ) : null}

        <canvas
          ref={canvasRef}
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain',
            display: isRendering || error ? 'none' : 'block',
          }}
        />

        {/* Page number badge */}
        <div
          style={{
            position: 'absolute',
            top: '8px',
            left: '8px',
            background: 'rgba(0,0,0,0.7)',
            color: 'white',
            fontSize: '12px',
            padding: '4px 8px',
            borderRadius: '4px',
          }}
        >
          Page {pageNumber}
        </div>
      </div>

      {/* Analysis Results Badge */}
      {analysisResult?.success && (
        <div style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          background: '#10b981',
          color: 'white',
          fontSize: '10px',
          padding: '4px 8px',
          borderRadius: '4px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
        }}>
          <svg style={{ width: '12px', height: '12px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          AI Analyzed
        </div>
      )}

      {/* Actions */}
      <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => imageDataUrl && onExportToMap(imageDataUrl)}
            disabled={!imageDataUrl}
            style={{
              flex: 1,
              padding: '8px 12px',
              background: imageDataUrl ? '#3b82f6' : '#9ca3af',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 500,
              cursor: imageDataUrl ? 'pointer' : 'not-allowed',
            }}
          >
            Export to Map
          </button>
        </div>
        {analysisResult?.success ? (
          <button
            onClick={onViewResults}
            style={{
              width: '100%',
              padding: '8px 12px',
              background: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <svg style={{ width: '14px', height: '14px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            View Results ({analysisResult.areas?.length || 0} areas)
          </button>
        ) : (
          <button
            onClick={() => imageDataUrl && onAnalyze(imageDataUrl, pageNumber)}
            disabled={!imageDataUrl || isAnalyzing}
            style={{
              width: '100%',
              padding: '8px 12px',
              background: isAnalyzing ? '#f59e0b' : (imageDataUrl ? '#8b5cf6' : '#9ca3af'),
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 500,
              cursor: (!imageDataUrl || isAnalyzing) ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            {isAnalyzing ? (
              <>
                <div style={{
                  width: '14px',
                  height: '14px',
                  border: '2px solid white',
                  borderTopColor: 'transparent',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                }} />
                Analyzing...
              </>
            ) : (
              <>
                <svg style={{ width: '14px', height: '14px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                Analyze with AI
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

// Server-rendered page card (for pre-rendered images)
function ServerRenderedPage({
  page,
  pageNumber,
  onExportToMap,
}: {
  page: PageWithUrls;
  pageNumber: number;
  onExportToMap: () => void;
}) {
  return (
    <div
      style={{
        background: 'white',
        borderRadius: '8px',
        border: '1px solid #e5e7eb',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          aspectRatio: '8.5/11',
          background: '#f3f4f6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        {page.thumbnailUrl || page.imageUrl ? (
          <img
            src={page.thumbnailUrl || page.imageUrl || ''}
            alt={`Page ${pageNumber}`}
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
        ) : (
          <div style={{ textAlign: 'center', color: '#9ca3af' }}>
            <svg style={{ width: '48px', height: '48px', margin: '0 auto' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p style={{ fontSize: '12px', marginTop: '8px' }}>Page {pageNumber}</p>
          </div>
        )}

        <div
          style={{
            position: 'absolute',
            top: '8px',
            left: '8px',
            background: 'rgba(0,0,0,0.7)',
            color: 'white',
            fontSize: '12px',
            padding: '4px 8px',
            borderRadius: '4px',
          }}
        >
          Page {pageNumber}
        </div>
      </div>

      <div style={{ padding: '12px', display: 'flex', gap: '8px' }}>
        <button
          onClick={onExportToMap}
          style={{
            flex: 1,
            padding: '8px 12px',
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Export to Map
        </button>
      </div>
    </div>
  );
}

// Direct image renderer (for PNG, JPG, TIFF uploads)
function DirectImagePage({
  imageUrl,
  documentName,
  onExportToMap,
  onAnalyze,
  onViewResults,
  analysisResult,
  isAnalyzing,
}: {
  imageUrl: string;
  documentName: string;
  onExportToMap: (imageDataUrl: string) => void;
  onAnalyze: (imageDataUrl: string, pageNumber: number) => void;
  onViewResults?: () => void;
  analysisResult?: BlueprintAnalysisResult | null;
  isAnalyzing?: boolean;
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Convert loaded image to data URL for export
  const handleImageLoad = useCallback(() => {
    setIsLoading(false);
    if (imgRef.current) {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = imgRef.current.naturalWidth;
        canvas.height = imgRef.current.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(imgRef.current, 0, 0);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
          setImageDataUrl(dataUrl);
        }
      } catch (err) {
        console.error('Failed to convert image to data URL:', err);
      }
    }
  }, []);

  const handleImageError = useCallback(() => {
    setIsLoading(false);
    setError('Failed to load image');
  }, []);

  return (
    <div
      style={{
        background: 'white',
        borderRadius: '8px',
        border: '1px solid #e5e7eb',
        overflow: 'hidden',
      }}
    >
      {/* Image area */}
      <div
        style={{
          aspectRatio: '8.5/11',
          background: '#f3f4f6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {isLoading && (
          <div style={{ textAlign: 'center', color: '#9ca3af' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                margin: '0 auto 8px',
                border: '3px solid #3b82f6',
                borderTopColor: 'transparent',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }}
            />
            <p style={{ fontSize: '12px' }}>Loading...</p>
          </div>
        )}

        {error && (
          <div style={{ textAlign: 'center', color: '#ef4444' }}>
            <p style={{ fontSize: '12px' }}>{error}</p>
          </div>
        )}

        <img
          ref={imgRef}
          src={imageUrl}
          alt={documentName}
          crossOrigin="anonymous"
          onLoad={handleImageLoad}
          onError={handleImageError}
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain',
            display: isLoading || error ? 'none' : 'block',
          }}
        />

        {/* Image badge */}
        <div
          style={{
            position: 'absolute',
            top: '8px',
            left: '8px',
            background: 'rgba(0,0,0,0.7)',
            color: 'white',
            fontSize: '12px',
            padding: '4px 8px',
            borderRadius: '4px',
          }}
        >
          Image
        </div>

        {/* Analysis Results Badge */}
        {analysisResult?.success && (
          <div style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            background: '#10b981',
            color: 'white',
            fontSize: '10px',
            padding: '4px 8px',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}>
            <svg style={{ width: '12px', height: '12px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            AI Analyzed
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => imageDataUrl && onExportToMap(imageDataUrl)}
            disabled={!imageDataUrl}
            style={{
              flex: 1,
              padding: '8px 12px',
              background: imageDataUrl ? '#3b82f6' : '#9ca3af',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 500,
              cursor: imageDataUrl ? 'pointer' : 'not-allowed',
            }}
          >
            Export to Map
          </button>
        </div>
        {analysisResult?.success ? (
          <button
            onClick={onViewResults}
            style={{
              width: '100%',
              padding: '8px 12px',
              background: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <svg style={{ width: '14px', height: '14px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            View Results ({analysisResult.areas?.length || 0} areas)
          </button>
        ) : (
          <button
            onClick={() => imageDataUrl && onAnalyze(imageDataUrl, 1)}
            disabled={!imageDataUrl || isAnalyzing}
            style={{
              width: '100%',
              padding: '8px 12px',
              background: isAnalyzing ? '#f59e0b' : (imageDataUrl ? '#8b5cf6' : '#9ca3af'),
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 500,
              cursor: (!imageDataUrl || isAnalyzing) ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            {isAnalyzing ? (
              <>
                <div style={{
                  width: '14px',
                  height: '14px',
                  border: '2px solid white',
                  borderTopColor: 'transparent',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                }} />
                Analyzing...
              </>
            ) : (
              <>
                <svg style={{ width: '14px', height: '14px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                Analyze with AI
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

// Expandable item component for showing breakdown
function ExpandableItem({
  id,
  title,
  subtitle,
  confidence,
  isSelected,
  onToggleSelect,
  children,
  bgColor = '#f9fafb',
  selectedBgColor = '#eff6ff',
  borderColor = '#e5e7eb',
  selectedBorderColor = '#93c5fd',
}: {
  id: string;
  title: string;
  subtitle?: string;
  confidence: number;
  isSelected: boolean;
  onToggleSelect: () => void;
  children?: React.ReactNode;
  bgColor?: string;
  selectedBgColor?: string;
  borderColor?: string;
  selectedBorderColor?: string;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div style={{
      background: isSelected ? selectedBgColor : bgColor,
      border: `1px solid ${isSelected ? selectedBorderColor : borderColor}`,
      borderRadius: '8px',
      overflow: 'hidden',
    }}>
      <label style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '10px',
        padding: '12px',
        cursor: 'pointer',
      }}>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelect}
          style={{ marginTop: '3px' }}
        />
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>{title}</div>
              {subtitle && (
                <div style={{ fontSize: '12px', color: '#374151', marginTop: '2px' }}>{subtitle}</div>
              )}
            </div>
            <div style={{
              fontSize: '11px',
              fontWeight: 600,
              color: confidence >= 0.8 ? '#059669' : confidence >= 0.6 ? '#d97706' : '#dc2626',
              padding: '2px 6px',
              background: confidence >= 0.8 ? '#ecfdf5' : confidence >= 0.6 ? '#fffbeb' : '#fef2f2',
              borderRadius: '4px',
            }}>
              {Math.round(confidence * 100)}%
            </div>
          </div>
        </div>
        {children && (
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsExpanded(!isExpanded); }}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              color: '#6b7280',
              transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s',
            }}
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        )}
      </label>
      {isExpanded && children && (
        <div style={{
          padding: '12px',
          paddingTop: '0',
          borderTop: '1px solid #e5e7eb',
          marginTop: '0',
          background: 'rgba(0,0,0,0.02)',
        }}>
          <div style={{ paddingTop: '12px' }}>
            {children}
          </div>
        </div>
      )}
    </div>
  );
}

// Analysis Results Panel Component
function AnalysisResultsPanel({
  result,
  onClose,
  onApplyToEstimate,
}: {
  result: BlueprintAnalysisResult;
  onClose: () => void;
  onApplyToEstimate: (items: { areas: DetectedArea[]; dimensions: DetectedDimension[]; materials: DetectedMaterial[] }) => void;
}) {
  const [selectedAreas, setSelectedAreas] = useState<Set<string>>(new Set(result.areas?.map(a => a.id) || []));
  const [selectedDimensions, setSelectedDimensions] = useState<Set<string>>(new Set(result.dimensions?.map(d => d.id) || []));
  const [selectedMaterials, setSelectedMaterials] = useState<Set<string>>(new Set(result.materials?.map(m => m.id) || []));

  const toggleSelection = (id: string, set: Set<string>, setter: React.Dispatch<React.SetStateAction<Set<string>>>) => {
    const newSet = new Set(set);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setter(newSet);
  };

  const handleApply = () => {
    onApplyToEstimate({
      areas: result.areas?.filter(a => selectedAreas.has(a.id)) || [],
      dimensions: result.dimensions?.filter(d => selectedDimensions.has(d.id)) || [],
      materials: result.materials?.filter(m => selectedMaterials.has(m.id)) || [],
    });
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      right: 0,
      width: '400px',
      height: '100vh',
      background: 'white',
      borderLeft: '1px solid #e5e7eb',
      boxShadow: '-4px 0 6px -1px rgba(0, 0, 0, 0.1)',
      zIndex: 50,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: '#f9fafb',
      }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#111827' }}>AI Analysis Results</h3>
          <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#6b7280' }}>
            Page {result.pageNumber} - {result.processingTimeMs}ms
          </p>
        </div>
        <button
          onClick={onClose}
          style={{
            padding: '8px',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: '#6b7280',
          }}
        >
          <svg style={{ width: '20px', height: '20px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px' }}>
        {/* Summary */}
        {result.summary && (
          <div style={{
            padding: '12px',
            background: '#eff6ff',
            borderRadius: '8px',
            marginBottom: '16px',
          }}>
            <div style={{ fontSize: '12px', fontWeight: 500, color: '#1d4ed8', marginBottom: '4px' }}>Summary</div>
            <div style={{ fontSize: '13px', color: '#1e40af' }}>{result.summary}</div>
          </div>
        )}

        {/* Scale Info */}
        {result.scale?.detected && (
          <div style={{
            padding: '12px',
            background: '#f0fdf4',
            borderRadius: '8px',
            marginBottom: '16px',
          }}>
            <div style={{ fontSize: '12px', fontWeight: 500, color: '#166534', marginBottom: '4px' }}>Scale Detected</div>
            <div style={{ fontSize: '13px', color: '#15803d' }}>
              {result.scale.scaleText} ({result.scale.pixelsPerFoot} px/ft)
              <span style={{ marginLeft: '8px', opacity: 0.7 }}>
                {Math.round((result.scale.confidence || 0) * 100)}% confidence
              </span>
            </div>
          </div>
        )}

        {/* Areas */}
        {result.areas && result.areas.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '8px',
            }}>
              <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#111827' }}>
                Areas ({result.areas.length})
              </h4>
              <button
                onClick={() => setSelectedAreas(selectedAreas.size === result.areas!.length ? new Set() : new Set(result.areas!.map(a => a.id)))}
                style={{
                  fontSize: '11px',
                  color: '#3b82f6',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                {selectedAreas.size === result.areas.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {result.areas.map((area) => (
                <ExpandableItem
                  key={area.id}
                  id={area.id}
                  title={area.label || area.subType || area.type}
                  subtitle={area.areaSqFt ? `${area.areaSqFt.toLocaleString()} SF` : 'Area TBD'}
                  confidence={area.confidence || 0}
                  isSelected={selectedAreas.has(area.id)}
                  onToggleSelect={() => toggleSelection(area.id, selectedAreas, setSelectedAreas)}
                >
                  <div style={{ fontSize: '12px', color: '#374151' }}>
                    <div style={{ fontWeight: 600, marginBottom: '8px', color: '#111827' }}>How this was calculated:</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: '#f3f4f6', borderRadius: '4px' }}>
                        <span style={{ color: '#6b7280' }}>Type:</span>
                        <span style={{ fontWeight: 500 }}>{area.type}</span>
                      </div>
                      {area.subType && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: '#f3f4f6', borderRadius: '4px' }}>
                          <span style={{ color: '#6b7280' }}>Sub-type:</span>
                          <span style={{ fontWeight: 500 }}>{area.subType}</span>
                        </div>
                      )}
                      {area.areaSqFt && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: '#f3f4f6', borderRadius: '4px' }}>
                          <span style={{ color: '#6b7280' }}>Area:</span>
                          <span style={{ fontWeight: 500 }}>{area.areaSqFt.toLocaleString()} sq ft</span>
                        </div>
                      )}
                      {area.polygon && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: '#f3f4f6', borderRadius: '4px' }}>
                          <span style={{ color: '#6b7280' }}>Vertices:</span>
                          <span style={{ fontWeight: 500 }}>{area.polygon.length} points detected</span>
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: '#f3f4f6', borderRadius: '4px' }}>
                        <span style={{ color: '#6b7280' }}>AI Confidence:</span>
                        <span style={{ fontWeight: 500, color: area.confidence >= 0.8 ? '#059669' : area.confidence >= 0.6 ? '#d97706' : '#dc2626' }}>
                          {Math.round((area.confidence || 0) * 100)}%
                        </span>
                      </div>
                    </div>
                    <p style={{ marginTop: '10px', fontSize: '11px', color: '#6b7280', fontStyle: 'italic' }}>
                      Area calculated from polygon boundary detected in blueprint using AI vision analysis.
                      {result.scale?.detected && ` Scale: ${result.scale.scaleText || 'detected'}`}
                    </p>
                  </div>
                </ExpandableItem>
              ))}
            </div>
          </div>
        )}

        {/* Dimensions */}
        {result.dimensions && result.dimensions.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '8px',
            }}>
              <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#111827' }}>
                Dimensions ({result.dimensions.length})
              </h4>
              <button
                onClick={() => setSelectedDimensions(selectedDimensions.size === result.dimensions!.length ? new Set() : new Set(result.dimensions!.map(d => d.id)))}
                style={{
                  fontSize: '11px',
                  color: '#3b82f6',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                {selectedDimensions.size === result.dimensions.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {result.dimensions.map((dim) => (
                <ExpandableItem
                  key={dim.id}
                  id={dim.id}
                  title={`${dim.text}`}
                  subtitle={`${dim.value} ${dim.unit}${dim.measures ? ` - ${dim.measures}` : ''}`}
                  confidence={dim.confidence || 0}
                  isSelected={selectedDimensions.has(dim.id)}
                  onToggleSelect={() => toggleSelection(dim.id, selectedDimensions, setSelectedDimensions)}
                  bgColor="#fffbeb"
                  selectedBgColor="#fef3c7"
                  borderColor="#fde68a"
                  selectedBorderColor="#fcd34d"
                >
                  <div style={{ fontSize: '12px', color: '#374151' }}>
                    <div style={{ fontWeight: 600, marginBottom: '8px', color: '#111827' }}>Dimension Details:</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: '#fef9e7', borderRadius: '4px' }}>
                        <span style={{ color: '#92400e' }}>Raw Text:</span>
                        <span style={{ fontWeight: 500 }}>{dim.text}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: '#fef9e7', borderRadius: '4px' }}>
                        <span style={{ color: '#92400e' }}>Value:</span>
                        <span style={{ fontWeight: 500 }}>{dim.value} {dim.unit}</span>
                      </div>
                      {dim.measures && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: '#fef9e7', borderRadius: '4px' }}>
                          <span style={{ color: '#92400e' }}>Applies to:</span>
                          <span style={{ fontWeight: 500 }}>{dim.measures}</span>
                        </div>
                      )}
                      {dim.position && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: '#fef9e7', borderRadius: '4px' }}>
                          <span style={{ color: '#92400e' }}>Position:</span>
                          <span style={{ fontWeight: 500 }}>X: {Math.round(dim.position[0])}, Y: {Math.round(dim.position[1])}</span>
                        </div>
                      )}
                    </div>
                    <p style={{ marginTop: '10px', fontSize: '11px', color: '#92400e', fontStyle: 'italic' }}>
                      Dimension text extracted from blueprint using OCR and pattern matching.
                    </p>
                  </div>
                </ExpandableItem>
              ))}
            </div>
          </div>
        )}

        {/* Materials */}
        {result.materials && result.materials.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '8px',
            }}>
              <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#111827' }}>
                Materials ({result.materials.length})
              </h4>
              <button
                onClick={() => setSelectedMaterials(selectedMaterials.size === result.materials!.length ? new Set() : new Set(result.materials!.map(m => m.id)))}
                style={{
                  fontSize: '11px',
                  color: '#3b82f6',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                {selectedMaterials.size === result.materials.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {result.materials.map((mat) => (
                <ExpandableItem
                  key={mat.id}
                  id={mat.id}
                  title={mat.material}
                  subtitle={mat.appliesTo ? `Applies to: ${mat.appliesTo}` : mat.category}
                  confidence={mat.confidence || 0}
                  isSelected={selectedMaterials.has(mat.id)}
                  onToggleSelect={() => toggleSelection(mat.id, selectedMaterials, setSelectedMaterials)}
                  bgColor="#fdf2f8"
                  selectedBgColor="#fce7f3"
                  borderColor="#fbcfe8"
                  selectedBorderColor="#f9a8d4"
                >
                  <div style={{ fontSize: '12px', color: '#374151' }}>
                    <div style={{ fontWeight: 600, marginBottom: '8px', color: '#111827' }}>Material Details:</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: '#fdf2f8', borderRadius: '4px' }}>
                        <span style={{ color: '#9d174d' }}>Material:</span>
                        <span style={{ fontWeight: 500 }}>{mat.material}</span>
                      </div>
                      {mat.category && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: '#fdf2f8', borderRadius: '4px' }}>
                          <span style={{ color: '#9d174d' }}>Category:</span>
                          <span style={{ fontWeight: 500 }}>{mat.category}</span>
                        </div>
                      )}
                      {mat.appliesTo && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: '#fdf2f8', borderRadius: '4px' }}>
                          <span style={{ color: '#9d174d' }}>Applies to:</span>
                          <span style={{ fontWeight: 500 }}>{mat.appliesTo}</span>
                        </div>
                      )}
                      {mat.quantity && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: '#fdf2f8', borderRadius: '4px' }}>
                          <span style={{ color: '#9d174d' }}>Quantity:</span>
                          <span style={{ fontWeight: 500 }}>{mat.quantity}</span>
                        </div>
                      )}
                    </div>
                    <p style={{ marginTop: '10px', fontSize: '11px', color: '#9d174d', fontStyle: 'italic' }}>
                      Material identified from blueprint annotations, legend, or specifications.
                    </p>
                  </div>
                </ExpandableItem>
              ))}
            </div>
          </div>
        )}

        {/* Footprint Info */}
        {result.footprint && (
          <div style={{
            padding: '12px',
            background: '#faf5ff',
            borderRadius: '8px',
            marginBottom: '16px',
          }}>
            <div style={{ fontSize: '12px', fontWeight: 500, color: '#7c3aed', marginBottom: '4px' }}>Building Footprint</div>
            <div style={{ fontSize: '13px', color: '#6d28d9' }}>
              {result.footprint.widthFt && result.footprint.depthFt
                ? `${result.footprint.widthFt}' x ${result.footprint.depthFt}'`
                : 'Footprint detected'}
              <span style={{ marginLeft: '8px', opacity: 0.7 }}>
                {Math.round((result.footprint.confidence || 0) * 100)}% confidence
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{
        padding: '16px 20px',
        borderTop: '1px solid #e5e7eb',
        background: '#f9fafb',
        display: 'flex',
        gap: '12px',
      }}>
        <button
          onClick={onClose}
          style={{
            flex: 1,
            padding: '10px 16px',
            background: 'white',
            color: '#374151',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Cancel
        </button>
        <button
          onClick={handleApply}
          style={{
            flex: 1,
            padding: '10px 16px',
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Apply to Estimate
        </button>
      </div>
    </div>
  );
}

export default function BlueprintDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DocumentData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<Map<number, BlueprintAnalysisResult>>(new Map());
  const [analyzingPage, setAnalyzingPage] = useState<number | null>(null);
  const [showResultsPanel, setShowResultsPanel] = useState<number | null>(null);
  const router = useRouter();

  const setPages = useBlueprintStore((s) => s.setPages);

  // Unwrap params
  useEffect(() => {
    params.then((p) => setDocumentId(p.id));
  }, [params]);

  // Fetch document data
  useEffect(() => {
    if (!documentId) return;

    async function fetchDocument() {
      try {
        const response = await fetch(`/api/pdf/${documentId}`);
        const result = await response.json();

        if (!response.ok || !result.success) {
          setError(result.error || 'Failed to load document');
          return;
        }

        setData(result);
        if (result.pages) {
          setPages(result.pages);
        }
      } catch (err) {
        console.error('Fetch error:', err);
        setError('Failed to load document');
      } finally {
        setIsLoading(false);
      }
    }

    fetchDocument();
  }, [documentId, setPages]);

  const handleProcessPages = useCallback(async () => {
    if (!documentId) return;

    setIsProcessing(true);
    try {
      const response = await fetch(`/api/pdf/${documentId}/process`, {
        method: 'POST',
      });
      const result = await response.json();

      if (result.success) {
        // Refresh document data
        const refreshResponse = await fetch(`/api/pdf/${documentId}`);
        const refreshResult = await refreshResponse.json();
        if (refreshResult.success) {
          setData(refreshResult);
        }
      } else {
        setError(result.error || 'Failed to process document');
      }
    } catch (err) {
      console.error('Process error:', err);
      setError('Failed to process document');
    } finally {
      setIsProcessing(false);
    }
  }, [documentId]);

  const handleExportToMap = useCallback((pageData: { imageUrl?: string; imageDataUrl?: string; pageNumber: number; pageId?: string }) => {
    const exportData = {
      pageId: pageData.pageId,
      documentId: documentId,
      imageUrl: pageData.imageUrl || pageData.imageDataUrl,
      pageNumber: pageData.pageNumber,
    };

    sessionStorage.setItem('blueprintOverlay', JSON.stringify(exportData));
    router.push('/site?mode=overlay');
  }, [documentId, router]);

  const handleAnalyze = useCallback(async (imageDataUrl: string, pageNumber: number) => {
    if (!documentId) return;

    setAnalyzingPage(pageNumber);

    try {
      const response = await fetch('/api/blueprint/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId,
          pageNumber,
          imageDataUrl,
          analysisType: 'full',
        }),
      });

      const result: BlueprintAnalysisResult = await response.json();

      if (result.success) {
        setAnalysisResults((prev) => {
          const newMap = new Map(prev);
          newMap.set(pageNumber, result);
          return newMap;
        });
        setShowResultsPanel(pageNumber);
      } else {
        console.error('Analysis failed:', result.error);
        alert(`Analysis failed: ${result.error}`);
      }
    } catch (err) {
      console.error('Analysis request failed:', err);
      alert('Failed to analyze blueprint. Please try again.');
    } finally {
      setAnalyzingPage(null);
    }
  }, [documentId]);

  const handleApplyToEstimate = useCallback((items: {
    areas: DetectedArea[];
    dimensions: DetectedDimension[];
    materials: DetectedMaterial[];
  }) => {
    // Store the selected items for use in the site page
    const exportData = {
      documentId,
      areas: items.areas,
      dimensions: items.dimensions,
      materials: items.materials,
      timestamp: Date.now(),
    };

    sessionStorage.setItem('blueprintAnalysis', JSON.stringify(exportData));
    setShowResultsPanel(null);

    // Navigate to the estimate page to show breakdown
    router.push('/estimate');
  }, [documentId, router]);

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '48px',
            height: '48px',
            margin: '0 auto 16px',
            border: '4px solid #3b82f6',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }} />
          <div style={{ color: '#4b5563' }}>Loading document...</div>
        </div>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: '#ef4444', fontSize: '18px', marginBottom: '16px' }}>{error}</div>
          <Link href="/blueprint" style={{ color: '#3b82f6', textDecoration: 'underline' }}>
            Back to Blueprints
          </Link>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: '#6b7280', fontSize: '18px', marginBottom: '16px' }}>Document not found</div>
          <Link href="/blueprint" style={{ color: '#3b82f6', textDecoration: 'underline' }}>
            Back to Blueprints
          </Link>
        </div>
      </div>
    );
  }

  const { document, pages, pdfUrl, imageUrl, renderMode } = data;
  const useClientRendering = renderMode === 'client-side' && pdfUrl;
  const useDirectImage = renderMode === 'direct-image' && (imageUrl || pdfUrl);

  return (
    <div style={{
      height: '100vh',
      background: '#f9fafb',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <header style={{
        background: 'white',
        borderBottom: '1px solid #e5e7eb',
        padding: '16px 24px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
        flexShrink: 0,
        zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <Link
              href="/blueprint"
              style={{
                padding: '8px',
                color: '#6b7280',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                textDecoration: 'none',
              }}
            >
              <svg style={{ width: '20px', height: '20px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <div>
              <h1 style={{ fontSize: '18px', fontWeight: 600, color: '#111827', margin: 0 }}>{document.name}</h1>
              <p style={{ fontSize: '14px', color: '#6b7280', margin: '4px 0 0' }}>
                {useDirectImage
                  ? 'Image file'
                  : document.page_count
                    ? `${document.page_count} pages`
                    : 'Processing...'}
                {document.status === 'error' && ' - Error'}
                {useClientRendering && ' (rendering in browser)'}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {document.status !== 'ready' && (
              <button
                onClick={handleProcessPages}
                disabled={isProcessing}
                style={{
                  padding: '8px 16px',
                  background: isProcessing ? '#9ca3af' : '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: isProcessing ? 'not-allowed' : 'pointer',
                }}
              >
                {isProcessing ? 'Processing...' : 'Process Pages'}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '32px 24px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {pages.length === 0 ? (
          <div style={{
            background: 'white',
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
            padding: '48px',
            textAlign: 'center',
          }}>
            <svg style={{ width: '64px', height: '64px', margin: '0 auto 16px', color: '#d1d5db' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 style={{ fontSize: '18px', fontWeight: 500, color: '#111827', marginBottom: '8px' }}>
              {document.status === 'processing' ? 'Processing pages...' : 'No pages found'}
            </h3>
            <p style={{ color: '#6b7280', marginBottom: '16px' }}>
              {document.status === 'processing'
                ? 'Pages are being extracted. This may take a moment.'
                : 'Click "Process Pages" to extract pages from this PDF.'}
            </p>
            {document.status !== 'processing' && document.status !== 'ready' && (
              <button
                onClick={handleProcessPages}
                disabled={isProcessing}
                style={{
                  padding: '10px 20px',
                  background: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                {isProcessing ? 'Processing...' : 'Process Pages'}
              </button>
            )}
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '16px',
          }}>
            {useDirectImage ? (
              // Direct image rendering (PNG, JPG, TIFF)
              <DirectImagePage
                imageUrl={imageUrl || pdfUrl || ''}
                documentName={document.name}
                onExportToMap={(imageDataUrl) => handleExportToMap({
                  imageDataUrl,
                  pageNumber: 1,
                })}
                onAnalyze={handleAnalyze}
                onViewResults={() => setShowResultsPanel(1)}
                analysisResult={analysisResults.get(1)}
                isAnalyzing={analyzingPage === 1}
              />
            ) : useClientRendering ? (
              // Client-side rendering with pdf.js
              pages.map((page) => (
                <ClientRenderedPage
                  key={page.id}
                  pdfUrl={pdfUrl}
                  pageNumber={page.page_number}
                  documentId={documentId || ''}
                  onExportToMap={(imageDataUrl) => handleExportToMap({
                    imageDataUrl,
                    pageNumber: page.page_number,
                    pageId: page.id,
                  })}
                  onAnalyze={handleAnalyze}
                  onViewResults={() => setShowResultsPanel(page.page_number)}
                  analysisResult={analysisResults.get(page.page_number)}
                  isAnalyzing={analyzingPage === page.page_number}
                />
              ))
            ) : (
              // Server-rendered images
              pages.map((page) => (
                <ServerRenderedPage
                  key={page.id}
                  page={page}
                  pageNumber={page.page_number}
                  onExportToMap={() => handleExportToMap({
                    imageUrl: page.imageUrl || undefined,
                    pageNumber: page.page_number,
                    pageId: page.id,
                  })}
                />
              ))
            )}
          </div>
        )}
      </div>
      </div>

      {/* Analysis Results Panel */}
      {showResultsPanel !== null && analysisResults.has(showResultsPanel) && (
        <AnalysisResultsPanel
          result={analysisResults.get(showResultsPanel)!}
          onClose={() => setShowResultsPanel(null)}
          onApplyToEstimate={handleApplyToEstimate}
        />
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
