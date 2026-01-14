'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useBlueprintStore } from '@/lib/blueprint/store';
import type { PDFDocument, PDFPageCategory } from '@/lib/supabase/types';

// Category badge component
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

// Document card
function DocumentCard({ doc, onSelect }: { doc: PDFDocument; onSelect: () => void }) {
  return (
    <div
      onClick={onSelect}
      className="bg-white rounded-lg border border-gray-200 p-4 cursor-pointer hover:border-blue-300 hover:shadow-md transition-all"
    >
      <div className="flex items-start gap-3">
        <div className="p-2 bg-red-100 rounded-lg">
          <svg className="w-8 h-8 text-red-600" fill="currentColor" viewBox="0 0 24 24">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2l5 5h-5V4zm-3 9h4v2h-4v-2zm0 4h4v2h-4v-2zm-2-4h.01v2H8v-2zm0 4h.01v2H8v-2z"/>
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 truncate">{doc.name}</h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-gray-500">
              {doc.page_count ? `${doc.page_count} pages` : 'Processing...'}
            </span>
            {doc.status === 'processing' && (
              <span className="flex items-center gap-1 text-xs text-blue-600">
                <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Processing
              </span>
            )}
            {doc.status === 'ready' && (
              <span className="text-xs text-green-600">Ready</span>
            )}
            {doc.status === 'error' && (
              <span className="text-xs text-red-600">Error</span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-1">
            {new Date(doc.created_at).toLocaleDateString()}
          </p>
        </div>
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
      className={`
        border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors
        ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
        ${isUploading ? 'pointer-events-none opacity-50' : ''}
      `}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf"
        onChange={handleFileSelect}
        className="hidden"
      />

      {isUploading ? (
        <div className="space-y-3">
          <div className="w-12 h-12 mx-auto border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-600">Uploading... {progress}%</p>
          <div className="w-48 mx-auto h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      ) : (
        <>
          <svg className="w-12 h-12 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <p className="text-gray-600 mb-2">
            <span className="font-medium text-blue-600">Click to upload</span> or drag and drop
          </p>
          <p className="text-sm text-gray-400">PDF files up to 100MB</p>
        </>
      )}
    </div>
  );
}

export default function BlueprintPage() {
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const documents = useBlueprintStore((s) => s.documents);
  const setDocuments = useBlueprintStore((s) => s.setDocuments);
  const addDocument = useBlueprintStore((s) => s.addDocument);
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

      // Simulate progress (real progress would need XMLHttpRequest)
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

  if (isLoading) {
    return (
      <div className="light-theme min-h-screen flex items-center justify-center">
        <div style={{ color: '#4b5563' }}>Loading blueprints...</div>
      </div>
    );
  }

  return (
    <div className="light-theme min-h-screen">
      {/* Header */}
      <header style={{ background: 'white', borderBottom: '1px solid #e5e7eb', padding: '16px 24px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Blueprints</h1>
            <p className="text-sm text-gray-500">Upload and analyze PDF plans</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Dashboard
            </Link>
            <Link
              href="/site"
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Site Estimator
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Upload Section */}
        <div className="mb-8">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Upload New Blueprint</h2>
          <UploadDropzone
            onUpload={handleUpload}
            isUploading={isUploading}
            progress={uploadProgress}
          />
        </div>

        {/* Documents Grid */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-900">
              Your Documents ({documents.length})
            </h2>
            {documents.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Sort by:</span>
                <select className="text-sm border border-gray-300 rounded px-2 py-1">
                  <option>Newest first</option>
                  <option>Oldest first</option>
                  <option>Name A-Z</option>
                </select>
              </div>
            )}
          </div>

          {documents.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No documents yet</h3>
              <p className="text-gray-500 mb-4">Upload a PDF blueprint to get started</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {documents.map((doc) => (
                <DocumentCard
                  key={doc.id}
                  doc={doc}
                  onSelect={() => handleSelectDocument(doc)}
                />
              ))}
            </div>
          )}
        </div>

        {/* How it works */}
        <div className="mt-12 bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">How it works</h3>
          <div className="grid md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold mb-3">1</div>
              <h4 className="font-medium text-gray-900 mb-1">Upload PDF</h4>
              <p className="text-sm text-gray-500">Upload your blueprint or construction drawings</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 mx-auto bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold mb-3">2</div>
              <h4 className="font-medium text-gray-900 mb-1">AI Categorizes</h4>
              <p className="text-sm text-gray-500">AI identifies page types: site plans, floor plans, details</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 mx-auto bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold mb-3">3</div>
              <h4 className="font-medium text-gray-900 mb-1">Select & Analyze</h4>
              <p className="text-sm text-gray-500">Choose pages for detailed feature extraction</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 mx-auto bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold mb-3">4</div>
              <h4 className="font-medium text-gray-900 mb-1">Generate Estimates</h4>
              <p className="text-sm text-gray-500">Approve features and create site estimates</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
