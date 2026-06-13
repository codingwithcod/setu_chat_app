import AsyncStorage from '@react-native-async-storage/async-storage';
import { File, Paths } from 'expo-file-system';
import { StorageAccessFramework } from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

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

/** Remembered Android Storage-Access-Framework download folder grant. */
const SAF_DIR_KEY = 'download.safDirectoryUri';

const MIME_BY_EXT: Record<string, string> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  zip: 'application/zip',
  rar: 'application/vnd.rar',
  '7z': 'application/x-7z-compressed',
  txt: 'text/plain',
  csv: 'text/csv',
  json: 'application/json',
  xml: 'application/xml',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  m4a: 'audio/mp4',
  ogg: 'audio/ogg',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  webm: 'video/webm',
};

/** Pick a SAF display name + mime: prefer a real mime so SAF restores the
 * extension; keep the extension in the name when the mime is unknown. */
function resolveNameAndMime(fileName: string, url: string, mimeType?: string | null) {
  const full = safeFileName(fileName, url);
  const dot = full.lastIndexOf('.');
  const ext = dot > 0 ? full.slice(dot + 1).toLowerCase() : '';
  const nameNoExt = dot > 0 ? full.slice(0, dot) : full;
  const mime = mimeType || MIME_BY_EXT[ext] || '';
  if (mime) return { displayName: nameNoExt, mime };
  return { displayName: full, mime: 'application/octet-stream' };
}

/**
 * Download any attachment to the device without opening it. On Android the file
 * is written into a user-picked folder via the Storage Access Framework (the
 * folder is chosen once and remembered); on iOS we hand off to the share sheet.
 */
export async function downloadFile(
  url: string,
  fileName: string,
  mimeType?: string | null,
): Promise<SaveResult> {
  let downloaded: Awaited<ReturnType<typeof File.downloadFileAsync>>;
  try {
    const tmp = new File(Paths.cache, `setu-${Date.now()}-${safeFileName(fileName, url)}`);
    if (tmp.exists) {
      try {
        tmp.delete();
      } catch {
        // ignore — overwrite below
      }
    }
    downloaded = await File.downloadFileAsync(url, tmp);
  } catch {
    return { ok: false, reason: 'error' };
  }

  try {
    if (Platform.OS !== 'android') {
      // iOS / web: no SAF — let the user save via the share sheet.
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(downloaded.uri, { mimeType: mimeType ?? undefined });
        return { ok: true };
      }
      return { ok: false, reason: 'error' };
    }

    const { displayName, mime } = resolveNameAndMime(fileName, url, mimeType);
    const base64 = await downloaded.base64();

    const writeInto = async (dirUri: string) => {
      const target = await StorageAccessFramework.createFileAsync(dirUri, displayName, mime);
      await StorageAccessFramework.writeAsStringAsync(target, base64, { encoding: 'base64' });
    };

    // Reuse the previously-granted folder when we still have it.
    const savedDir = await AsyncStorage.getItem(SAF_DIR_KEY);
    if (savedDir) {
      try {
        await writeInto(savedDir);
        return { ok: true };
      } catch {
        await AsyncStorage.removeItem(SAF_DIR_KEY); // grant gone — ask again
      }
    }

    const perm = await StorageAccessFramework.requestDirectoryPermissionsAsync();
    if (!perm.granted) return { ok: false, reason: 'permission' };
    await AsyncStorage.setItem(SAF_DIR_KEY, perm.directoryUri);
    await writeInto(perm.directoryUri);
    return { ok: true };
  } catch {
    return { ok: false, reason: 'error' };
  } finally {
    try {
      downloaded.delete();
    } catch {
      // best-effort
    }
  }
}
