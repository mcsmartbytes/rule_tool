'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useBlueprintStore } from '@/lib/blueprint/store';
import type { PDFDocument, PDFPage, PDFPageCategory } from '@/lib/supabase/types';

interface PageWithUrls extends PDFPage {
  imageUrl: string | null;
  thumbnailUrl: string | null;
}

interface DocumentData {
  document: PDFDocument;
  pages: PageWithUrls[];
}

// Category badge
function CategoryBadge({ category }: { category: PDFPageCategory | null }) {
  if (!category) return null;

  const colors: Record<PDFPageCategory, string> = {
    'site-plan': 'bg-green-100 text-green-700',
    'floor-plan': 'bg-blue-100 text-blue-700',
    'electrical': 'bg-yellow-100 text-yellow-700',
    'mechanical': 'bg-orange-100 text-orange-700',
    'plumbing': 'bg-cyan-100 text-cyan-700',
    'structural': 'bg-purple-100 text-purple-700',
    'landscape': 'bg-emerald-100 text-emerald-700',
    'civil': 'bg-gray-100 text-gray-700',
    'detail': 'bg-pink-100 text-pink-700',
    'schedule': 'bg-indigo-100 text-indigo-700',
    'cover': 'bg-slate-100 text-slate-700',
    'other': 'bg-gray-100 text-gray-500',
  };

  const labels: Record<PDFPageCategory, string> = {
    'site-plan': 'Site Plan',
    'floor-plan': 'Floor Plan',
    'electrical': 'Electrical',
    'mechanical': 'Mechanical',
    'plumbing': 'Plumbing',
    'structural': 'Structural',
    'landscape': 'Landscape',
    'civil': 'Civil',
    'detail': 'Detail',
    'schedule': 'Schedule',
    'cover': 'Cover',
    'other': 'Other',
  };

  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded ${colors[category]}`}>
      {labels[category]}
    </span>
  );
}

// Page thumbnail card
function PageCard({
  page,
  isSelected,
  onSelect,
  onView,
  onExportToMap,
}: {
  page: PageWithUrls;
  isSelected: boolean;
  onSelect: () => void;
  onView: () => void;
  onExportToMap: () => void;
}) {
  return (
    <div
      className={`
        bg-white rounded-lg border-2 overflow-hidden transition-all cursor-pointer
        ${isSelected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200 hover:border-gray-300'}
      `}
      onClick={onSelect}
    >
      {/* Thumbnail */}
      <div className="aspect-[8.5/11] bg-gray-100 relative">
        {page.thumbnailUrl ? (
          <img
            src={page.thumbnailUrl}
            alt={`Page ${page.page_number}`}
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
        )}

        {/* Page number badge */}
        <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
          Page {page.page_number}
        </div>

        {/* Selection checkbox */}
        <div className="absolute top-2 right-2">
          <div
            className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
              isSelected
                ? 'bg-blue-500 border-blue-500'
                : 'bg-white/90 border-gray-300 hover:border-gray-400'
            }`}
          >
            {isSelected && (
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
        </div>
      </div>

      {/* Info and actions */}
      <div className="p-3">
        <div className="flex items-center justify-between mb-2">
          <CategoryBadge category={page.category} />
          {page.scale_info && (
            <span className="text-xs text-gray-500">
              {page.scale_info.ratio}
            </span>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onView();
            }}
            className="flex-1 px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
          >
            View
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onExportToMap();
            }}
            className="flex-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            To Map
          </button>
        </div>
      </div>
    </div>
  );
}

// Full-size page viewer modal
function PageViewer({
  page,
  onClose,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
  onExportToMap,
}: {
  page: PageWithUrls;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
  onExportToMap: () => void;
}) {
  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && hasPrev) onPrev();
      if (e.key === 'ArrowRight' && hasNext) onNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, onPrev, onNext, hasPrev, hasNext]);

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/50">
        <div className="flex items-center gap-4">
          <span className="text-white font-medium">Page {page.page_number}</span>
          <CategoryBadge category={page.category} />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onExportToMap}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            Export to Map
          </button>
          <button
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Image */}
      <div className="flex-1 flex items-center justify-center p-4 relative">
        {/* Previous button */}
        {hasPrev && (
          <button
            onClick={onPrev}
            className="absolute left-4 p-3 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}

        {page.imageUrl ? (
          <img
            src={page.imageUrl}
            alt={`Page ${page.page_number}`}
            className="max-h-full max-w-full object-contain"
          />
        ) : (
          <div className="text-white/50 text-xl">Image not available</div>
        )}

        {/* Next button */}
        {hasNext && (
          <button
            onClick={onNext}
            className="absolute right-4 p-3 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>

      {/* Footer with keyboard hints */}
      <div className="px-4 py-2 bg-black/50 text-center text-white/50 text-sm">
        Use arrow keys to navigate, Escape to close
      </div>
    </div>
  );
}

export default function BlueprintDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DocumentData | null>(null);
  const [viewingPageIndex, setViewingPageIndex] = useState<number | null>(null);
  const router = useRouter();

  const selectedPageIds = useBlueprintStore((s) => s.selectedPageIds);
  const togglePageSelection = useBlueprintStore((s) => s.togglePageSelection);
  const selectPages = useBlueprintStore((s) => s.selectPages);
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
        setPages(result.pages);
      } catch (err) {
        console.error('Fetch error:', err);
        setError('Failed to load document');
      } finally {
        setIsLoading(false);
      }
    }

    fetchDocument();
  }, [documentId, setPages]);

  const handleExportToMap = useCallback((page: PageWithUrls) => {
    // Store the page info and navigate to site page with overlay mode
    const exportData = {
      pageId: page.id,
      documentId: page.document_id,
      imageUrl: page.imageUrl,
      pageNumber: page.page_number,
      category: page.category,
    };

    // Store in sessionStorage for the site page to pick up
    sessionStorage.setItem('blueprintOverlay', JSON.stringify(exportData));

    // Navigate to site page with overlay mode
    router.push('/site?mode=overlay');
  }, [router]);

  const handleExportSelected = useCallback(() => {
    if (!data) return;

    const selectedPages = data.pages.filter((p) => selectedPageIds.has(p.id));
    if (selectedPages.length === 0) return;

    // For now, export the first selected page
    // Could be extended to support multiple overlays
    handleExportToMap(selectedPages[0]);
  }, [data, selectedPageIds, handleExportToMap]);

  const handleSelectAll = useCallback(() => {
    if (!data) return;
    selectPages(data.pages.map((p) => p.id));
  }, [data, selectPages]);

  const handleDeselectAll = useCallback(() => {
    selectPages([]);
  }, [selectPages]);

  if (isLoading) {
    return (
      <div className="light-theme min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
          <div style={{ color: '#4b5563' }}>Loading document...</div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="light-theme min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div style={{ color: '#ef4444', fontSize: '1.25rem', marginBottom: '1rem' }}>{error || 'Document not found'}</div>
          <Link href="/blueprint" style={{ color: '#2563eb' }}>
            Back to Blueprints
          </Link>
        </div>
      </div>
    );
  }

  const { document, pages } = data;
  const selectedCount = [...selectedPageIds].filter((id) => pages.some((p) => p.id === id)).length;

  return (
    <div className="light-theme min-h-screen">
      {/* Header */}
      <header style={{ background: 'white', borderBottom: '1px solid #e5e7eb', padding: '16px 24px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', position: 'sticky', top: 0, zIndex: 10 }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/blueprint"
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{document.name}</h1>
              <p className="text-sm text-gray-500">
                {pages.length} pages
                {document.status === 'processing' && ' (processing...)'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {selectedCount > 0 && (
              <>
                <span className="text-sm text-gray-600">
                  {selectedCount} selected
                </span>
                <button
                  onClick={handleExportSelected}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                  Export to Map
                </button>
              </>
            )}
            <button
              onClick={selectedCount === pages.length ? handleDeselectAll : handleSelectAll}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {selectedCount === pages.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>
        </div>
      </header>

      {/* Pages Grid */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {pages.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {document.status === 'processing' ? 'Processing pages...' : 'No pages found'}
            </h3>
            <p className="text-gray-500">
              {document.status === 'processing'
                ? 'Pages are being extracted from the PDF. Please wait...'
                : 'This document may not have been processed yet.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {pages.map((page, index) => (
              <PageCard
                key={page.id}
                page={page}
                isSelected={selectedPageIds.has(page.id)}
                onSelect={() => togglePageSelection(page.id)}
                onView={() => setViewingPageIndex(index)}
                onExportToMap={() => handleExportToMap(page)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Page Viewer Modal */}
      {viewingPageIndex !== null && pages[viewingPageIndex] && (
        <PageViewer
          page={pages[viewingPageIndex]}
          onClose={() => setViewingPageIndex(null)}
          onPrev={() => setViewingPageIndex((i) => (i !== null && i > 0 ? i - 1 : i))}
          onNext={() => setViewingPageIndex((i) => (i !== null && i < pages.length - 1 ? i + 1 : i))}
          hasPrev={viewingPageIndex > 0}
          hasNext={viewingPageIndex < pages.length - 1}
          onExportToMap={() => handleExportToMap(pages[viewingPageIndex])}
        />
      )}
    </div>
  );
}
