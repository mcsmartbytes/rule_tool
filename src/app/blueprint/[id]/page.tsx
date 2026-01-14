'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useBlueprintStore } from '@/lib/blueprint/store';
import type { PDFDocument, PDFPage } from '@/lib/supabase/types';

interface PageWithUrls extends PDFPage {
  imageUrl: string | null;
  thumbnailUrl: string | null;
}

interface DocumentData {
  document: PDFDocument;
  pages: PageWithUrls[];
}

// Page card component
function PageCard({
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
      {/* Thumbnail area */}
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
        {page.thumbnailUrl ? (
          <img
            src={page.thumbnailUrl}
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

      {/* Actions */}
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

export default function BlueprintDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DocumentData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
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

  const handleExportToMap = useCallback((page: PageWithUrls) => {
    const exportData = {
      pageId: page.id,
      documentId: page.document_id,
      imageUrl: page.imageUrl,
      pageNumber: page.page_number,
      category: page.category,
    };

    sessionStorage.setItem('blueprintOverlay', JSON.stringify(exportData));
    router.push('/site?mode=overlay');
  }, [router]);

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

  const { document, pages } = data;

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
      {/* Header */}
      <header style={{
        background: 'white',
        borderBottom: '1px solid #e5e7eb',
        padding: '16px 24px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
        position: 'sticky',
        top: 0,
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
                {document.page_count ? `${document.page_count} pages` : 'Processing...'}
                {document.status === 'error' && ' - Error'}
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
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px' }}>
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
            {pages.map((page) => (
              <PageCard
                key={page.id}
                page={page}
                pageNumber={page.page_number}
                onExportToMap={() => handleExportToMap(page)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
