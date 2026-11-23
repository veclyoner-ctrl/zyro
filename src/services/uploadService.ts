import { apiRequest } from './api';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

export type StorageBucket = 'product-images' | 'banners' | 'store-assets' | 'payment-proofs';

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Could not read selected file.'));
      }
    };
    reader.onerror = () => reject(new Error('Could not read selected file.'));
    reader.readAsDataURL(file);
  });
}

export function extractStoragePathFromUrl(
  url: string | null | undefined,
  bucket: StorageBucket
): string | null {
  if (!url) return null;
  const publicMarker = `/storage/v1/object/public/${bucket}/`;
  const signedMarker = `/storage/v1/object/sign/${bucket}/`;

  const marker = url.includes(publicMarker)
    ? publicMarker
    : url.includes(signedMarker)
      ? signedMarker
      : null;

  if (!marker) return null;
  const idx = url.indexOf(marker);
  const rawPath = url.slice(idx + marker.length).split('?')[0];
  if (!rawPath) return null;
  try {
    return decodeURIComponent(rawPath);
  } catch {
    return rawPath;
  }
}

function buildObjectPath(fileName: string): string {
  const safeExt = (fileName.split('.').pop() || 'png')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
  const randomId =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `${new Date().toISOString().slice(0, 10)}/${randomId}.${safeExt || 'png'}`;
}

export async function uploadAsset(file: File, bucket: StorageBucket): Promise<string> {
  if (isSupabaseConfigured) {
    const objectPath = buildObjectPath(file.name);
    const { error: uploadErr } = await supabase.storage
      .from(bucket)
      .upload(objectPath, file, {
        contentType: file.type || 'image/png',
        upsert: true,
      });

    if (uploadErr) {
      throw new Error(`Storage upload failed: ${uploadErr.message}`);
    }

    if (bucket === 'payment-proofs') {
      const { data: signedData, error: signErr } = await supabase.storage
        .from(bucket)
        .createSignedUrl(objectPath, 60 * 60 * 24 * 365);
      if (!signErr && signedData?.signedUrl) {
        return signedData.signedUrl;
      }
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(objectPath);
    if (data?.publicUrl) {
      return data.publicUrl;
    }
  }

  const dataUrl = await readFileAsDataUrl(file);
  try {
    const res = await apiRequest<{ url: string }>('/api/uploads', {
      method: 'POST',
      body: JSON.stringify({
        bucket,
        fileName: file.name,
        contentType: file.type || 'image/png',
        dataUrl,
      }),
    });
    return res.url || dataUrl;
  } catch {
    return dataUrl;
  }
}

export async function deleteAsset(
  url: string | null | undefined,
  bucket: StorageBucket = 'product-images'
): Promise<boolean> {
  const objectPath = extractStoragePathFromUrl(url, bucket);
  if (!objectPath) return false;

  if (isSupabaseConfigured) {
    const { error } = await supabase.storage.from(bucket).remove([objectPath]);
    return !error;
  }

  try {
    await apiRequest<{ ok: boolean }>('/api/uploads', {
      method: 'DELETE',
      body: JSON.stringify({ url, bucket }),
    });
    return true;
  } catch {
    return false;
  }
}
