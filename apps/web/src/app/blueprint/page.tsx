'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useBlueprintStore } from '@/lib/blueprint/store';
import type { PDFDocument } from '@/lib/supabase/types';

// Document card with delete button
function DocumentCard({
  doc,
  onSelect,
  onDelete,
  isDeleting,
}: {
  doc: PDFDocument;
  onSelect: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowConfirm(true);
  };

  const handleConfirmDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete();
    setShowConfirm(false);
  };

  const handleCancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowConfirm(false);
  };

  return (
    <div
      onClick={onSelect}
      style={{
        background: 'white',
        borderRadius: '8px',
        border: '1px solid #e5e7eb',
        padding: '16px',
        cursor: 'pointer',
        transition: 'all 0.2s',
        opacity: isDeleting ? 0.5 : 1,
        pointerEvents: isDeleting ? 'none' : 'auto',
        position: 'relative',
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.borderColor = '#93c5fd';
        e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.1)';
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.borderColor = '#e5e7eb';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* Delete confirmation overlay */}
      {showConfirm && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(255,255,255,0.95)',
            borderRadius: '8px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            zIndex: 10,
          }}
        >
          <p style={{ color: '#374151', fontSize: '14px', textAlign: 'center', margin: 0 }}>
            Delete this document?
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleConfirmDelete}
              style={{
                padding: '6px 16px',
                background: '#dc2626',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Delete
            </button>
            <button
              onClick={handleCancelDelete}
              style={{
                padding: '6px 16px',
                background: '#e5e7eb',
                color: '#374151',
                border: 'none',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <div style={{ padding: '8px', background: '#fee2e2', borderRadius: '8px' }}>
          <svg style={{ width: '32px', height: '32px', color: '#dc2626' }} fill="currentColor" viewBox="0 0 24 24">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2l5 5h-5V4zm-3 9h4v2h-4v-2zm0 4h4v2h-4v-2zm-2-4h.01v2H8v-2zm0 4h.01v2H8v-2z"/>
          </svg>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ fontWeight: 500, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>{doc.name}</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
            <span style={{ fontSize: '14px', color: '#6b7280' }}>
              {doc.page_count ? `${doc.page_count} pages` : 'Processing...'}
            </span>
            {doc.status === 'processing' && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#2563eb' }}>
                Processing
              </span>
            )}
            {doc.status === 'ready' && (
              <span style={{ fontSize: '12px', color: '#16a34a' }}>Ready</span>
            )}
            {doc.status === 'error' && (
              <span style={{ fontSize: '12px', color: '#dc2626' }}>Error</span>
            )}
          </div>
          <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
            {new Date(doc.created_at).toLocaleDateString()}
          </p>
        </div>

        {/* Delete button */}
        <button
          onClick={handleDeleteClick}
          title="Delete document"
          style={{
            padding: '8px',
            background: 'transparent',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            color: '#9ca3af',
            transition: 'all 0.2s',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = '#fee2e2';
            e.currentTarget.style.color = '#dc2626';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = '#9ca3af';
          }}
        >
          <svg style={{ width: '20px', height: '20px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// Upload dropzone
function UploadDropzone({ onUpload, isUploading, progress }: {
  onUpload: (file: File) => void;
  isUploading: boolean;
  progress: number;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/pdf') {
      onUpload(file);
    }
  }, [onUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file);
    }
  }, [onUpload]);

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={() => inputRef.current?.click()}
      style={{
        border: `2px dashed ${isDragging ? '#3b82f6' : '#d1d5db'}`,
        borderRadius: '12px',
        padding: '32px',
        textAlign: 'center',
        cursor: 'pointer',
        background: isDragging ? '#eff6ff' : 'white',
        transition: 'all 0.2s',
        opacity: isUploading ? 0.5 : 1,
        pointerEvents: isUploading ? 'none' : 'auto',
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />

      {isUploading ? (
        <div>
          <div style={{
            width: '48px',
            height: '48px',
            margin: '0 auto 12px',
            border: '4px solid #3b82f6',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }} />
          <p style={{ color: '#4b5563' }}>Uploading... {progress}%</p>
          <div style={{ width: '200px', margin: '12px auto 0', height: '8px', background: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ height: '100%', background: '#3b82f6', width: `${progress}%`, transition: 'width 0.2s' }} />
          </div>
        </div>
      ) : (
        <>
          <svg style={{ width: '48px', height: '48px', margin: '0 auto 16px', color: '#9ca3af' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <p style={{ color: '#4b5563', marginBottom: '8px' }}>
            <span style={{ fontWeight: 500, color: '#2563eb' }}>Click to upload</span> or drag and drop
          </p>
          <p style={{ fontSize: '14px', color: '#9ca3af' }}>PDF files up to 100MB</p>
        </>
      )}
    </div>
  );
}

export default function BlueprintPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const router = useRouter();

  const documents = useBlueprintStore((s) => s.documents);
  const setDocuments = useBlueprintStore((s) => s.setDocuments);
  const addDocument = useBlueprintStore((s) => s.addDocument);
  const removeDocument = useBlueprintStore((s) => s.removeDocument);
  const setActiveDocument = useBlueprintStore((s) => s.setActiveDocument);
  const isUploading = useBlueprintStore((s) => s.isUploading);
  const uploadProgress = useBlueprintStore((s) => s.uploadProgress);
  const setUploading = useBlueprintStore((s) => s.setUploading);

  // Fetch documents on mount
  useEffect(() => {
    async function fetchDocuments() {
      try {
        const response = await fetch('/api/pdf/upload');
        const data = await response.json();
        if (data.success) {
          setDocuments(data.documents);
        }
      } catch (error) {
        console.error('Failed to fetch documents:', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchDocuments();
  }, [setDocuments]);

  const handleUpload = useCallback(async (file: File) => {
    setUploading(true, 0);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const progressInterval = setInterval(() => {
        setUploading(true, Math.min(uploadProgress + 10, 90));
      }, 200);

      const response = await fetch('/api/pdf/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setUploading(true, 100);

      const data = await response.json();
      if (data.success) {
        addDocument({
          id: data.document.id,
          name: data.document.name,
          status: data.document.status,
          file_size: data.document.fileSize,
          organization_id: null,
          uploaded_by: null,
          storage_path: '',
          page_count: null,
          error_message: null,
          metadata: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false, 0);
    }
  }, [addDocument, setUploading, uploadProgress]);

  const handleSelectDocument = useCallback((doc: PDFDocument) => {
    setActiveDocument(doc.id);
    router.push(`/blueprint/${doc.id}`);
  }, [setActiveDocument, router]);

  const handleDeleteDocument = useCallback(async (doc: PDFDocument) => {
    setDeletingIds((prev) => new Set(prev).add(doc.id));

    try {
      const response = await fetch(`/api/pdf/${doc.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (data.success) {
        removeDocument(doc.id);
      } else {
        console.error('Delete failed:', data.error);
        alert('Failed to delete document: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Delete failed:', error);
      alert('Failed to delete document');
    } finally {
      setDeletingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(doc.id);
        return newSet;
      });
    }
  }, [removeDocument]);

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb' }}>
        <div style={{ color: '#4b5563' }}>Loading blueprints...</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
      {/* Header */}
      <header style={{ background: 'white', borderBottom: '1px solid #e5e7eb', padding: '16px 24px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#111827', margin: 0 }}>Blueprints</h1>
            <p style={{ fontSize: '14px', color: '#6b7280', margin: '4px 0 0' }}>Upload and analyze PDF plans</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Link
              href="/dashboard"
              style={{
                padding: '8px 16px',
                border: '1px solid #d1d5db',
                color: '#374151',
                borderRadius: '8px',
                textDecoration: 'none',
                fontSize: '14px',
              }}
            >
              Dashboard
            </Link>
            <Link
              href="/site"
              style={{
                padding: '8px 16px',
                border: '1px solid #d1d5db',
                color: '#374151',
                borderRadius: '8px',
                textDecoration: 'none',
                fontSize: '14px',
              }}
            >
              Site Estimator
            </Link>
          </div>
        </div>
      </header>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px' }}>
        {/* Upload Section */}
        <div style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 500, color: '#111827', marginBottom: '16px' }}>Upload New Blueprint</h2>
          <UploadDropzone
            onUpload={handleUpload}
            isUploading={isUploading}
            progress={uploadProgress}
          />
        </div>

        {/* Documents Grid */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 500, color: '#111827', margin: 0 }}>
              Your Documents ({documents.length})
            </h2>
          </div>

          {documents.length === 0 ? (
            <div style={{ background: 'white', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '48px', textAlign: 'center' }}>
              <svg style={{ width: '64px', height: '64px', margin: '0 auto 16px', color: '#d1d5db' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 style={{ fontSize: '18px', fontWeight: 500, color: '#111827', marginBottom: '8px' }}>No documents yet</h3>
              <p style={{ color: '#6b7280' }}>Upload a PDF blueprint to get started</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
              {documents.map((doc) => (
                <DocumentCard
                  key={doc.id}
                  doc={doc}
                  onSelect={() => handleSelectDocument(doc)}
                  onDelete={() => handleDeleteDocument(doc)}
                  isDeleting={deletingIds.has(doc.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
