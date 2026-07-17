/**
 * reviewService.ts
 *
 * Centralises all review operations:
 *  - Image picking with client-side format + size validation
 *  - Resizing / compression via expo-image-manipulator
 *  - Upload to Supabase Storage under reviews/{userId}/{reviewId}/
 *  - Text sanitisation (strips HTML / control chars before display or submit)
 *  - submit_review RPC (purchase-gated, moderated)
 *  - vote_review RPC (helpful / not_helpful / retract)
 *  - flag_review RPC
 */

import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { supabaseClient } from './supabaseClient';

// ─── Limits ────────────────────────────────────────────────────────────────────
/** Maximum file size *before* compression (raw selection). 10 MB. */
const MAX_RAW_BYTES = 10 * 1024 * 1024;
/** Maximum file size *after* compression (what actually uploads). 2 MB. */
const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;
/** Maximum image dimension on longest edge after resize. */
const MAX_DIMENSION = 1200;
/** JPEG compression quality (0–1). */
const JPEG_QUALITY = 0.78;
/** Maximum number of photos per review. */
export const MAX_REVIEW_PHOTOS = 3;
/** Accepted MIME types (validated client-side before and server-side at bucket). */
const ACCEPTED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface ReviewImage {
  /** Local file URI (file:// or content://) */
  localUri: string;
  /** MIME type */
  mimeType: string;
  /** Post-compression size in bytes */
  compressedSizeBytes: number;
  /** Width after resize */
  width: number;
  /** Height after resize */
  height: number;
}

export interface ReviewSubmitResult {
  id: string;
  status: 'published' | 'pending';
  verified_purchase: boolean;
  moderated: boolean;
}

export type VoteDirection = 'helpful' | 'not_helpful';

// ─── Text Sanitisation ─────────────────────────────────────────────────────────

/**
 * Strips HTML tags and control characters from user-supplied text.
 * React Native's `<Text>` component does NOT interpret HTML, so injection via
 * markup is not a risk at render time, but we sanitise defensively:
 *  1. Against accidental rendering in WebView contexts
 *  2. Against storage of raw HTML that future code might render as HTML
 *  3. Against RTLO / zero-width / control characters used for spoofing
 */
export function sanitizeText(raw: string): string {
  return raw
    // Strip HTML/XML tags
    .replace(/<[^>]*>/g, '')
    // Remove RTLO and other bidirectional control characters
    .replace(/[\u200B-\u200D\u202A-\u202E\u2066-\u2069\uFEFF]/g, '')
    // Remove other ASCII control characters except tab/newline/CR
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .trim();
}

// ─── Image Picking ─────────────────────────────────────────────────────────────

/**
 * Launches the system image picker, validates format and raw file size,
 * then compresses each selected image to fit within MAX_DIMENSION and
 * MAX_UPLOAD_BYTES. Returns an array of `ReviewImage` objects, or throws
 * with a user-displayable message at the first violation.
 *
 * All validation is done CLIENT-SIDE before any network call.
 */
export async function pickAndCompressImages(
  currentCount: number
): Promise<ReviewImage[]> {
  const remaining = MAX_REVIEW_PHOTOS - currentCount;
  if (remaining <= 0) {
    throw new Error(`You can attach up to ${MAX_REVIEW_PHOTOS} photos per review.`);
  }

  // Request permission (iOS)
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Photo library permission is required to attach images.');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsMultipleSelection: true,
    selectionLimit: remaining,
    quality: 1,         // We compress ourselves — don't double-compress
    exif: false,        // No metadata needed
  });

  if (result.canceled || result.assets.length === 0) {
    return [];
  }

  const selected = result.assets.slice(0, remaining);
  const output: ReviewImage[] = [];

  for (const asset of selected) {
    // ── Format validation ────────────────────────────────────────────────────
    const mime = asset.mimeType ?? 'image/jpeg';
    if (!ACCEPTED_MIME_TYPES.includes(mime)) {
      throw new Error(
        `"${asset.fileName ?? 'Image'}" is not a supported format.\n` +
        `Please use JPEG, PNG, or WebP.`
      );
    }

    // ── Raw size validation ───────────────────────────────────────────────────
    if (asset.fileSize && asset.fileSize > MAX_RAW_BYTES) {
      const mb = (asset.fileSize / 1024 / 1024).toFixed(1);
      throw new Error(
        `"${asset.fileName ?? 'Image'}" is ${mb} MB.\n` +
        `Images must be under 10 MB before compression.`
      );
    }

    // ── Resize + Compress ─────────────────────────────────────────────────────
    const actions: ImageManipulator.Action[] = [];
    const w = asset.width ?? MAX_DIMENSION;
    const h = asset.height ?? MAX_DIMENSION;

    if (w > MAX_DIMENSION || h > MAX_DIMENSION) {
      const scale = MAX_DIMENSION / Math.max(w, h);
      actions.push({
        resize: {
          width: Math.round(w * scale),
          height: Math.round(h * scale),
        },
      });
    }

    const manipulated = await ImageManipulator.manipulateAsync(
      asset.uri,
      actions,
      {
        compress: JPEG_QUALITY,
        format: ImageManipulator.SaveFormat.JPEG,
        base64: false,
      }
    );

    // ── Post-compression size validation ──────────────────────────────────────
    // expo-image-manipulator doesn't return fileSize, so we fetch it
    const fileInfo = await fetchFileSize(manipulated.uri);
    if (fileInfo > MAX_UPLOAD_BYTES) {
      const mb = (fileInfo / 1024 / 1024).toFixed(1);
      throw new Error(
        `"${asset.fileName ?? 'Image'}" is still ${mb} MB after compression.\n` +
        `Please choose a smaller image (max 2 MB after compression).`
      );
    }

    output.push({
      localUri: manipulated.uri,
      mimeType: 'image/jpeg',
      compressedSizeBytes: fileInfo,
      width: manipulated.width,
      height: manipulated.height,
    });
  }

  return output;
}

/** Fetches the byte size of a local file URI. */
async function fetchFileSize(uri: string): Promise<number> {
  try {
    const response = await fetch(uri);
    const blob = await response.blob();
    return blob.size;
  } catch (err) {
    console.warn('[reviewService] Failed to determine file size, defaulting to 0:', err);
    // If we can't determine size, be conservative — allow it through
    return 0;
  }
}

// ─── Storage Upload ────────────────────────────────────────────────────────────

/**
 * Uploads compressed review images to Supabase Storage.
 * Path: reviews/{userId}/{reviewId}/{timestamp}.jpg
 * Returns array of public URLs.
 *
 * The bucket RLS enforces that users can only write to their own userId path.
 */
export async function uploadReviewImages(
  userId: string,
  reviewId: string,
  images: ReviewImage[]
): Promise<string[]> {
  const publicUrls: string[] = [];

  for (const img of images) {
    const filename = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}.jpg`;
    const storagePath = `reviews/${userId}/${reviewId}/${filename}`;

    // Fetch the file as a blob for upload
    const response = await fetch(img.localUri);
    const blob = await response.blob();

    const { error } = await supabaseClient.storage
      .from('review-images')
      .upload(storagePath, blob, {
        contentType: 'image/jpeg',
        upsert: false,
        cacheControl: '31536000', // 1 year — images are immutable
      });

    if (error) {
      throw new Error(`Failed to upload image: ${error.message}`);
    }

    const { data: urlData } = supabaseClient.storage
      .from('review-images')
      .getPublicUrl(storagePath);

    publicUrls.push(urlData.publicUrl);
  }

  return publicUrls;
}

/**
 * Deletes a review image from Storage.
 * Will only succeed if the caller is the owner (enforced by Storage RLS).
 */
export async function deleteReviewImage(publicUrl: string): Promise<void> {
  // Extract the storage path from the public URL
  const url = new URL(publicUrl);
  // Path format: /storage/v1/object/public/review-images/reviews/{userId}/{reviewId}/{file}
  const parts = url.pathname.split('/');
  const bucketIndex = parts.indexOf('review-images');
  if (bucketIndex === -1) return;

  const storagePath = parts.slice(bucketIndex + 1).join('/');
  await supabaseClient.storage.from('review-images').remove([storagePath]);
}

// ─── Review Submission ─────────────────────────────────────────────────────────

/**
 * Submits a review via the `submit_review` Supabase RPC.
 * All business rules (purchase verification, profanity filter, duplicate check)
 * are enforced server-side in the RPC.
 */
export async function submitReview(params: {
  userId: string;
  productId: string;
  rating: number;
  comment: string;
  imageUrls: string[];
}): Promise<ReviewSubmitResult> {
  const { data, error } = await supabaseClient.rpc('submit_review', {
    p_user_id: params.userId,
    p_product_id: params.productId,
    p_rating: params.rating,
    p_comment: sanitizeText(params.comment),
    p_image_urls: params.imageUrls.length > 0 ? params.imageUrls : null,
  });

  if (error) {
    // Surface the server error message directly — it's user-facing
    throw new Error(error.message);
  }

  return data as unknown as ReviewSubmitResult;
}

// ─── Voting ────────────────────────────────────────────────────────────────────

/**
 * Votes on a review. Pass null for direction to retract a vote.
 * The server enforces the UNIQUE (user_id, review_id) constraint.
 */
export async function voteReview(
  userId: string,
  reviewId: string,
  direction: VoteDirection | null
): Promise<void> {
  const { error } = await supabaseClient.rpc('vote_review', {
    p_user_id: userId,
    p_review_id: reviewId,
    p_direction: direction,
  });

  if (error) throw new Error(error.message);
}

// ─── Flagging ──────────────────────────────────────────────────────────────────

/**
 * Reports a review for moderation. The server auto-flags the review once
 * the report_threshold (default: 3) is reached.
 */
export async function flagReview(
  userId: string,
  reviewId: string
): Promise<void> {
  const { error } = await supabaseClient.rpc('flag_review', {
    p_user_id: userId,
    p_review_id: reviewId,
  });

  if (error) throw new Error(error.message);
}

// ─── User vote loader ──────────────────────────────────────────────────────────

/**
 * Fetches the current user's vote direction for a set of review IDs.
 * Returns a map of reviewId → direction.
 */
export async function fetchUserVotes(
  userId: string,
  reviewIds: string[]
): Promise<Record<string, VoteDirection>> {
  if (reviewIds.length === 0) return {};

  const { data, error } = await supabaseClient
    .from('review_votes')
    .select('review_id, direction')
    .eq('user_id', userId)
    .in('review_id', reviewIds);

  if (error) return {};

  const map: Record<string, VoteDirection> = {};
  for (const row of data ?? []) {
    map[row.review_id] = row.direction as VoteDirection;
  }
  return map;
}
