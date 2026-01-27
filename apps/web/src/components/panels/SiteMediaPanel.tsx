'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { SiteMedia, SiteMediaCategory } from '@/lib/supabase/types';

/**
 * Generate a thumbnail from a video file
 * Returns a Blob of the thumbnail image (JPEG)
 */
async function generateVideoThumbnail(videoFile: File, seekTime = 1): Promise<Blob | null> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    const cleanup = () => {
      URL.revokeObjectURL(video.src);
      video.remove();
      canvas.remove();
    };

    video.onloadedmetadata = () => {
      // Seek to specified time or 10% of duration, whichever is less
      video.currentTime = Math.min(seekTime, video.duration * 0.1);
    };

    video.onseeked = () => {
      // Set canvas dimensions (max 400px width for thumbnail)
      const scale = Math.min(1, 400 / video.videoWidth);
      canvas.width = video.videoWidth * scale;
      canvas.height = video.videoHeight * scale;

      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (blob) => {
            cleanup();
            resolve(blob);
          },
          'image/jpeg',
          0.8
        );
      } else {
        cleanup();
        resolve(null);
      }
    };

    video.onerror = () => {
      cleanup();
      resolve(null);
    };

    // Set timeout for slow videos
    setTimeout(() => {
      if (!video.paused) {
        cleanup();
        resolve(null);
      }
    }, 10000);

    video.src = URL.createObjectURL(videoFile);
  });
}

interface SiteMediaWithUrls extends SiteMedia {
  mediaUrl: string | null;
  thumbnailUrl: string | null;
}

interface SiteMediaPanelProps {
  siteId: string;
}

const CATEGORIES: { value: SiteMediaCategory; label: string }[] = [
  { value: 'overview', label: 'Overview' },
  { value: 'existing-condition', label: 'Existing Condition' },
  { value: 'damage', label: 'Damage' },
  { value: 'measurement-reference', label: 'Measurement Ref' },
  { value: 'before', label: 'Before' },
  { value: 'after', label: 'After' },
  { value: 'progress', label: 'Progress' },
  { value: 'completion', label: 'Completion' },
  { value: 'other', label: 'Other' },
];

export function SiteMediaPanel({ siteId }: SiteMediaPanelProps) {
  const [media, setMedia] = useState<SiteMediaWithUrls[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<SiteMediaCategory>('existing-condition');
  const [viewingMedia, setViewingMedia] = useState<SiteMediaWithUrls | null>(null);
  const [filterCategory, setFilterCategory] = useState<SiteMediaCategory | 'all'>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch media on mount
  useEffect(() => {
    async function fetchMedia() {
      try {
        const response = await fetch(`/api/site-media?siteId=${siteId}`);
        const data = await response.json();
        if (data.success) {
          setMedia(data.media);
        }
      } catch (error) {
        console.error('Failed to fetch media:', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchMedia();
  }, [siteId]);

  const handleUpload = useCallback(async (files: FileList) => {
    setIsUploading(true);
    setUploadProgress(0);

    const totalFiles = files.length;
    let completed = 0;

    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('siteId', siteId);
      formData.append('category', selectedCategory);

      // Generate thumbnail for videos
      const isVideo = file.type.startsWith('video/');
      if (isVideo) {
        const thumbnail = await generateVideoThumbnail(file);
        if (thumbnail) {
          formData.append('thumbnail', thumbnail, `${file.name}-thumb.jpg`);
        }
      }

      try {
        const response = await fetch('/api/site-media', {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();
        if (data.success) {
          setMedia((prev) => [data.media, ...prev]);
        }
      } catch (error) {
        console.error('Upload failed:', error);
      }

      completed++;
      setUploadProgress(Math.round((completed / totalFiles) * 100));
    }

    setIsUploading(false);
    setUploadProgress(0);
  }, [siteId, selectedCategory]);

  const handleDelete = useCallback(async (mediaId: string) => {
    if (!confirm('Delete this media?')) return;

    try {
      const response = await fetch(`/api/site-media/${mediaId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setMedia((prev) => prev.filter((m) => m.id !== mediaId));
        if (viewingMedia?.id === mediaId) {
          setViewingMedia(null);
        }
      }
    } catch (error) {
      console.error('Delete failed:', error);
    }
  }, [viewingMedia]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleUpload(e.target.files);
    }
  }, [handleUpload]);

  const filteredMedia = filterCategory === 'all'
    ? media
    : media.filter((m) => m.category === filterCategory);

  return (
    <div className="site-media-panel">
      <div className="site-media-header">
        <h3>Site Photos & Videos</h3>
        <span className="media-count">{media.length} items</span>
      </div>

      {/* Upload Section */}
      <div className="upload-section">
        <div className="upload-category">
          <label>Category:</label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as SiteMediaCategory)}
          >
            {CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
            ))}
          </select>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />

        <button
          className="upload-btn"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          {isUploading ? (
            <>Uploading... {uploadProgress}%</>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Photos/Videos
            </>
          )}
        </button>
      </div>

      {/* Filter */}
      <div className="filter-section">
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value as SiteMediaCategory | 'all')}
        >
          <option value="all">All Categories</option>
          {CATEGORIES.map((cat) => (
            <option key={cat.value} value={cat.value}>{cat.label}</option>
          ))}
        </select>
      </div>

      {/* Media Grid */}
      <div className="media-grid">
        {isLoading ? (
          <div className="loading-state">Loading media...</div>
        ) : filteredMedia.length === 0 ? (
          <div className="empty-state">
            <svg className="empty-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p>No photos or videos yet</p>
            <p className="empty-hint">Add site documentation to support your estimate</p>
          </div>
        ) : (
          filteredMedia.map((item) => (
            <div
              key={item.id}
              className="media-item"
              onClick={() => setViewingMedia(item)}
            >
              {item.media_type === 'video' ? (
                <div className="video-thumbnail">
                  {item.thumbnailUrl ? (
                    <img
                      src={item.thumbnailUrl}
                      alt={item.caption || 'Video thumbnail'}
                      loading="lazy"
                    />
                  ) : null}
                  <svg className="play-icon" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              ) : (
                <img
                  src={item.thumbnailUrl || item.mediaUrl || ''}
                  alt={item.caption || 'Site photo'}
                  loading="lazy"
                />
              )}
              <div className="media-item-overlay">
                <span className="media-category-badge">{item.category}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Lightbox */}
      {viewingMedia && (
        <div className="media-lightbox" onClick={() => setViewingMedia(null)}>
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <button className="lightbox-close" onClick={() => setViewingMedia(null)}>
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {viewingMedia.media_type === 'video' ? (
              <video
                src={viewingMedia.mediaUrl || ''}
                controls
                autoPlay
                className="lightbox-media"
              />
            ) : (
              <img
                src={viewingMedia.mediaUrl || ''}
                alt={viewingMedia.caption || 'Site photo'}
                className="lightbox-media"
              />
            )}

            <div className="lightbox-info">
              <div className="lightbox-caption">
                {viewingMedia.caption || viewingMedia.file_name}
              </div>
              <div className="lightbox-meta">
                <span className="media-category-badge">{viewingMedia.category}</span>
                <span>{new Date(viewingMedia.created_at).toLocaleDateString()}</span>
              </div>
              <button
                className="lightbox-delete"
                onClick={() => handleDelete(viewingMedia.id)}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SiteMediaPanel;
