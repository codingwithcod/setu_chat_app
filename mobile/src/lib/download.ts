import { File, Paths } from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';

export type SaveResult =
  | { ok: true }
  | { ok: false; reason: 'permission' | 'error' };

/** Strip anything that isn't safe in a file name and guarantee an extension. */
function safeFileName(name: string, url: string): string {
  const fromName = (name || '').split('/').pop()?.trim();
  const fromUrl = url.split('?')[0].split('/').pop()?.trim();
  let base = fromName || fromUrl || 'image.jpg';
  base = base.replace(/[^a-zA-Z0-9._-]/g, '_');
  if (!/\.[a-zA-Z0-9]{2,5}$/.test(base)) base += '.jpg';
  return base;
}

/**
 * Download a remote image to a temp cache file and save it into the device
 * gallery. Best-effort cleanup of the temp file. Returns a result instead of
 * throwing so callers can show the right message.
 */
export async function saveImageToGallery(
  url: string,
  fileName: string,
): Promise<SaveResult> {
  try {
    const perm = await MediaLibrary.requestPermissionsAsync(true);
    if (!perm.granted) return { ok: false, reason: 'permission' };

    const dest = new File(Paths.cache, `setu-${Date.now()}-${safeFileName(fileName, url)}`);
    if (dest.exists) {
      try {
        dest.delete();
      } catch {
        // ignore — will overwrite below
      }
    }

    const downloaded = await File.downloadFileAsync(url, dest);
    await MediaLibrary.saveToLibraryAsync(downloaded.uri);

    try {
      downloaded.delete();
    } catch {
      // temp file cleanup is best-effort
    }
    return { ok: true };
  } catch {
    return { ok: false, reason: 'error' };
  }
}
