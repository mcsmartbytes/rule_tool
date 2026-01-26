/**
 * Site Media API Route
 * POST /api/site-media - Upload photo/video
 * GET /api/site-media?siteId=xxx - List media for a site
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { SiteMediaType, SiteMediaCategory } from '@/lib/supabase/types';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo'];

function getMediaType(mimeType: string): SiteMediaType {
  if (ALLOWED_IMAGE_TYPES.includes(mimeType)) return 'photo';
  if (ALLOWED_VIDEO_TYPES.includes(mimeType)) return 'video';
  return 'photo';
}

// GET - List media for a site
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const siteId = searchParams.get('siteId');

  if (!siteId) {
    return NextResponse.json(
      { success: false, error: 'siteId is required' },
      { status: 400 }
    );
  }

  try {
    const { data: media, error } = await supabase
      .from('site_media')
      .select('*')
      .eq('site_id', siteId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch site media:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch media' },
        { status: 500 }
      );
    }

    // Generate signed URLs for each media item
    const mediaWithUrls = await Promise.all(
      (media || []).map(async (item) => {
        let mediaUrl = null;
        let thumbnailUrl = null;

        if (item.storage_path) {
          const { data: urlData } = await supabase.storage
            .from('site-media')
            .createSignedUrl(item.storage_path, 3600);
          mediaUrl = urlData?.signedUrl;
        }

        if (item.thumbnail_path) {
          const { data: thumbData } = await supabase.storage
            .from('site-media')
            .createSignedUrl(item.thumbnail_path, 3600);
          thumbnailUrl = thumbData?.signedUrl;
        }

        return {
          ...item,
          mediaUrl,
          thumbnailUrl,
        };
      })
    );

    return NextResponse.json({
      success: true,
      media: mediaWithUrls,
    });
  } catch (error) {
    console.error('Error fetching site media:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch media' },
      { status: 500 }
    );
  }
}

// POST - Upload new media
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const thumbnail = formData.get('thumbnail') as File | null;
    const siteId = formData.get('siteId') as string | null;
    const category = (formData.get('category') as SiteMediaCategory) || 'other';
    const caption = formData.get('caption') as string | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!siteId) {
      return NextResponse.json(
        { success: false, error: 'siteId is required' },
        { status: 400 }
      );
    }

    // Validate file type
    const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);
    const isVideo = ALLOWED_VIDEO_TYPES.includes(file.type);

    if (!isImage && !isVideo) {
      return NextResponse.json(
        { success: false, error: 'File type not supported. Please upload an image or video.' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: 'File too large. Maximum size is 100MB.' },
        { status: 400 }
      );
    }

    // Generate unique file path
    const timestamp = Date.now();
    const uniqueId = Math.random().toString(36).slice(2);
    const ext = file.name.split('.').pop() || (isImage ? 'jpg' : 'mp4');
    const storagePath = `${siteId}/${timestamp}-${uniqueId}.${ext}`;

    // Upload to storage
    const arrayBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from('site-media')
      .upload(storagePath, arrayBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json(
        { success: false, error: 'Failed to upload file' },
        { status: 500 }
      );
    }

    // Upload thumbnail if provided (for videos)
    let thumbnailPath: string | null = null;
    if (thumbnail && isVideo) {
      thumbnailPath = `${siteId}/thumbs/${timestamp}-${uniqueId}.jpg`;
      const thumbArrayBuffer = await thumbnail.arrayBuffer();
      const { error: thumbError } = await supabase.storage
        .from('site-media')
        .upload(thumbnailPath, thumbArrayBuffer, {
          contentType: 'image/jpeg',
          upsert: false,
        });

      if (thumbError) {
        console.error('Thumbnail upload error:', thumbError);
        // Continue without thumbnail - not critical
        thumbnailPath = null;
      }
    }

    // Create database record
    const mediaRecord = {
      site_id: siteId,
      uploaded_by: null,
      media_type: getMediaType(file.type),
      category,
      storage_path: storagePath,
      thumbnail_path: thumbnailPath,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type,
      width: null,
      height: null,
      duration: null,
      caption,
      location: null,
      taken_at: null,
      metadata: {},
    };

    const { data: insertedMedia, error: insertError } = await supabase
      .from('site_media')
      .insert(mediaRecord)
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      // Try to clean up uploaded file
      await supabase.storage.from('site-media').remove([storagePath]);
      return NextResponse.json(
        { success: false, error: 'Failed to save media record' },
        { status: 500 }
      );
    }

    // Generate signed URL for the response
    const { data: urlData } = await supabase.storage
      .from('site-media')
      .createSignedUrl(storagePath, 3600);

    return NextResponse.json({
      success: true,
      media: {
        ...insertedMedia,
        mediaUrl: urlData?.signedUrl,
      },
    });
  } catch (error) {
    console.error('Error uploading media:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to upload media' },
      { status: 500 }
    );
  }
}
