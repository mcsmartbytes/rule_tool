'use client';

import { useEffect, useMemo, useState } from 'react';

type PDFDocument = {
  id: string;
  name: string;
  status: 'processing' | 'ready' | 'error';
  page_count: number | null;
};

type PageWithUrls = {
  id: string;
  page_number: number;
  category: string | null;
  thumbnail_url: string | null;
  image_url: string | null;
};

export function BlueprintOverlayModal({
  open,
  onClose,
  onSelectPage,
}: {
  open: boolean;
  onClose: () => void;
  onSelectPage: (page: { pageId: string; imageUrl: string; label: string }) => void;
}) {
  const [docs, setDocs] = useState<PDFDocument[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [pages, setPages] = useState<PageWithUrls[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedDoc = useMemo(() => docs.find((d) => d.id === selectedDocId) || null, [docs, selectedDocId]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    async function loadDocs() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/pdf/upload', { cache: 'no-store' });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Failed to load documents');
        if (!cancelled) {
          setDocs(data.documents || []);
          if (!selectedDocId && data.documents?.length) {
            setSelectedDocId(data.documents[0].id);
          }
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to load documents';
        if (!cancelled) setError(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadDocs();
    return () => {
      cancelled = true;
    };
  }, [open, selectedDocId]);

  useEffect(() => {
    if (!open) return;
    if (!selectedDocId) return;
    let cancelled = false;
    async function loadPages() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/pdf/documents/${selectedDocId}`, { cache: 'no-store' });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Failed to load pages');
        if (!cancelled) setPages(data.pages || []);
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to load pages';
        if (!cancelled) setError(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadPages();
    return () => {
      cancelled = true;
    };
  }, [open, selectedDocId]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[2000] bg-black/40 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-white rounded-xl shadow-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-gray-900">Blueprint overlay</div>
            <div className="text-xs text-gray-500">Choose a page to place onto the map</div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-sm">
            Close
          </button>
        </div>

        <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-1">
            <div className="text-xs font-medium text-gray-700 mb-2">Document</div>
            <select
              className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm"
              value={selectedDocId || ''}
              onChange={(e) => setSelectedDocId(e.target.value)}
            >
              {docs.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} {d.page_count ? `(${d.page_count}p)` : ''}
                </option>
              ))}
            </select>

            <div className="mt-3 text-xs text-gray-500">
              {selectedDoc ? (
                <>
                  Status: <span className="font-medium text-gray-700">{selectedDoc.status}</span>
                </>
              ) : (
                'No document selected'
              )}
            </div>

            {error && (
              <div className="mt-3 bg-red-50 border border-red-200 text-red-700 rounded-lg p-2 text-xs">
                {error}
              </div>
            )}
            {loading && <div className="mt-3 text-xs text-gray-500">Loading…</div>}
          </div>

          <div className="md:col-span-2">
            <div className="text-xs font-medium text-gray-700 mb-2">Pages</div>
            {pages.length === 0 ? (
              <div className="border border-gray-200 rounded-lg p-6 text-sm text-gray-600">
                No pages yet. In the document page, click “Process PDF” until pages appear.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[60vh] overflow-y-auto">
                {pages.map((p) => (
                  <button
                    key={p.id}
                    className="border border-gray-200 rounded-lg overflow-hidden hover:border-blue-400 transition-colors text-left"
                    onClick={() => {
                      if (!p.image_url) return;
                      onSelectPage({
                        pageId: p.id,
                        imageUrl: p.image_url,
                        label: `Page ${p.page_number}${p.category ? ` (${p.category})` : ''}`,
                      });
                      onClose();
                    }}
                    title={p.image_url ? 'Place this page on the map' : 'No image URL for this page'}
                    disabled={!p.image_url}
                  >
                    <div className="bg-gray-50">
                      {p.thumbnail_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.thumbnail_url} alt={`Page ${p.page_number}`} className="w-full h-auto block" />
                      ) : (
                        <div className="aspect-[3/4] flex items-center justify-center text-xs text-gray-400">
                          No preview
                        </div>
                      )}
                    </div>
                    <div className="px-2 py-1 text-xs text-gray-700 flex items-center justify-between gap-2">
                      <span>Page {p.page_number}</span>
                      {p.category && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                          {p.category}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="px-4 py-3 border-t border-gray-200 text-xs text-gray-600">
          After selecting a page, you’ll click 4 corners on the map (top-left → top-right → bottom-right → bottom-left).
        </div>
      </div>
    </div>
  );
}

