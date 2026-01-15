/**
 * Site Media Item API Route
 * DELETE /api/site-media/[mediaId] - Delete a media item
 * PATCH /api/site-media/[mediaId] - Update media metadata
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface RouteParams {
  params: Promise<{ mediaId: string }>;
}

// DELETE - Remove a media item
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { mediaId } = await params;

  try {
    // Get the media record first
    const { data: media, error: fetchError } = await supabase
      .from('site_media')
      .select('storage_path, thumbnail_path')
      .eq('id', mediaId)
      .single();

    if (fetchError || !media) {
      return NextResponse.json(
        { success: false, error: 'Media not found' },
        { status: 404 }
      );
    }

    // Delete from storage
    const pathsToDelete = [media.storage_path];
    if (media.thumbnail_path) {
      pathsToDelete.push(media.thumbnail_path);
    }

    const { error: storageError } = await supabase.storage
      .from('site-media')
      .remove(pathsToDelete);

    if (storageError) {
      console.error('Storage delete error:', storageError);
      // Continue to delete DB record even if storage fails
    }

    // Delete database record
    const { error: deleteError } = await supabase
      .from('site_media')
      .delete()
      .eq('id', mediaId);

    if (deleteError) {
      console.error('Database delete error:', deleteError);
      return NextResponse.json(
        { success: false, error: 'Failed to delete media record' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting media:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete media' },
      { status: 500 }
    );
  }
}

// PATCH - Update media metadata
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { mediaId } = await params;

  try {
    const body = await request.json();
    const { caption, category } = body;

    const updates: Record<string, unknown> = {};
    if (caption !== undefined) updates.caption = caption;
    if (category !== undefined) updates.category = category;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No updates provided' },
        { status: 400 }
      );
    }

    const { data: media, error } = await supabase
      .from('site_media')
      .update(updates)
      .eq('id', mediaId)
      .select()
      .single();

    if (error) {
      console.error('Update error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to update media' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      media,
    });
  } catch (error) {
    console.error('Error updating media:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update media' },
      { status: 500 }
    );
  }
}
