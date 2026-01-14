'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

type PDFDocumentStatus = 'processing' | 'ready' | 'error';

type PageWithUrls = {
  id: string;
  page_number: number;
  category: string | null;
  category_confidence: number | null;
  ai_analyzed: boolean;
  analyzed_at: string | null;
  image_path: string;
  thumbnail_path: string | null;
  thumbnail_url: string | null;
  image_url: string | null;
  scale_info: any | null;
};

type DocumentResponse = {
  success: boolean;
  error?: string;
  document?: {
    id: string;
    name: string;
    status: PDFDocumentStatus;
    page_count: number | null;
    error_message: string | null;
    created_at: string;
    metadata: any;
  };
  pages?: PageWithUrls[];
};

export default function BlueprintDocumentPage() {
  const params = useParams<{ documentId: string }>();
  const documentId = params.documentId;

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [doc, setDoc] = useState<DocumentResponse['document'] | null>(null);
  const [pages, setPages] = useState<PageWithUrls[]>([]);
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCategorizing, setIsCategorizing] = useState(false);

  const activePage = useMemo(
    () => pages.find((p) => p.id === activePageId) || pages[0] || null,
    [activePageId, pages]
  );

  const fetchDoc = useCallback(async () => {
    setError(null);
    const res = await fetch(`/api/pdf/documents/${documentId}`, { cache: 'no-store' });
    const data: DocumentResponse = await res.json();

    if (!data.success) {
      setError(data.error || 'Failed to load document');
      return;
    }

    setDoc(data.document || null);
    setPages(data.pages || []);
    if (!activePageId && data.pages?.length) {
      setActivePageId(data.pages[0].id);
    }
  }, [activePageId, documentId]);

  const startProcessing = useCallback(async () => {
    setIsProcessing(true);
    setError(null);
    try {
      const res = await fetch('/api/pdf/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId }),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to start processing');
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to start processing';
      setError(msg);
    } finally {
      setIsProcessing(false);
      // Trigger an immediate refresh
      fetchDoc();
    }
  }, [documentId, fetchDoc]);

  const categorizePages = useCallback(async () => {
    setIsCategorizing(true);
    setError(null);
    try {
      const res = await fetch('/api/pdf/categorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId }),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to categorize pages');
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to categorize pages';
      setError(msg);
    } finally {
      setIsCategorizing(false);
      fetchDoc();
    }
  }, [documentId, fetchDoc]);

  // Initial load + polling while processing
  useEffect(() => {
    let cancelled = false;
    let interval: number | null = null;

    async function load() {
      try {
        await fetchDoc();
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();

    interval = window.setInterval(async () => {
      if (cancelled) return;
      // Poll if we have a doc and it is processing
      if (doc?.status === 'processing' || (pages.length === 0 && doc?.status !== 'error')) {
        await fetchDoc();
      }
    }, 3000);

    return () => {
      cancelled = true;
      if (interval) window.clearInterval(interval);
    };
  }, [doc?.status, fetchDoc, pages.length]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-500">Loading document…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <Link href="/blueprint" className="text-sm text-gray-600 hover:text-gray-900">
                ← Back
              </Link>
              <span className="text-gray-300">/</span>
              <h1 className="text-xl font-semibold text-gray-900 truncate">
                {doc?.name || 'Blueprint Document'}
              </h1>
            </div>
            <div className="mt-1 text-sm text-gray-500">
              Status: <span className="font-medium text-gray-700">{doc?.status || 'unknown'}</span>
              {doc?.page_count ? ` • ${doc.page_count} pages` : ''}
              {doc?.status === 'error' && doc?.error_message ? ` • ${doc.error_message}` : ''}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchDoc()}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
            >
              Refresh
            </button>
            <button
              onClick={categorizePages}
              disabled={isCategorizing || pages.length === 0}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50"
              title="Auto-categorize pages (site plan, detail, schedule, etc.)"
            >
              {isCategorizing ? 'Categorizing…' : 'Categorize pages'}
            </button>
            <button
              onClick={startProcessing}
              disabled={isProcessing || doc?.status === 'processing'}
              className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50"
              title="Render pages and generate thumbnails"
            >
              {doc?.status === 'processing' ? 'Processing…' : 'Process PDF'}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
            {error}
          </div>
        )}

        {pages.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg p-10 text-center text-gray-600">
            {doc?.status === 'processing'
              ? 'Rendering pages… this can take a minute for large PDFs.'
              : 'No pages yet. Click “Process PDF” to render pages.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="border-b border-gray-200 px-4 py-3 flex items-center justify-between">
                <div className="text-sm font-medium text-gray-900">
                  Page {activePage?.page_number ?? '—'}
                </div>
                {activePage?.category && (
                  <div className="text-xs text-gray-600">
                    Category: <span className="font-medium">{activePage.category}</span>
                    {typeof activePage.category_confidence === 'number'
                      ? ` (${Math.round(activePage.category_confidence * 100)}%)`
                      : ''}
                  </div>
                )}
              </div>

              <div className="bg-gray-50">
                {activePage?.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={activePage.image_url}
                    alt={`Page ${activePage.page_number}`}
                    className="w-full h-auto block"
                  />
                ) : (
                  <div className="p-10 text-center text-gray-500">No image available for this page.</div>
                )}
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="border-b border-gray-200 px-4 py-3 text-sm font-medium text-gray-900">
                Pages
              </div>
              <div className="max-h-[75vh] overflow-y-auto p-3 grid grid-cols-2 gap-3">
                {pages.map((p) => {
                  const isActive = activePage?.id === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => setActivePageId(p.id)}
                      className={`border rounded-lg overflow-hidden text-left hover:border-blue-400 transition-colors ${
                        isActive ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'
                      }`}
                      title={`Page ${p.page_number}`}
                    >
                      <div className="bg-gray-50">
                        {p.thumbnail_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={p.thumbnail_url}
                            alt={`Thumbnail ${p.page_number}`}
                            className="w-full h-auto block"
                          />
                        ) : (
                          <div className="aspect-[3/4] flex items-center justify-center text-xs text-gray-400">
                            No preview
                          </div>
                        )}
                      </div>
                      <div className="px-2 py-1 text-xs text-gray-700">
                        <div className="flex items-center justify-between gap-2">
                          <span>Page {p.page_number}</span>
                          {p.category && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                              {p.category}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

