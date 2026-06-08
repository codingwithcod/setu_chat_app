import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

import { api } from './api';
import type { UploadedFileData } from '@/types';

export type FileCategory = 'image' | 'video' | 'audio' | 'file';

/** A locally-picked asset, before upload. */
export interface PickedAsset {
  uri: string;
  name: string;
  mimeType: string;
  size: number;
  file_type: FileCategory;
}

/** Max chat attachment size (MB). Matches the `chat-files` storage bucket cap. */
export const MAX_FILE_MB = Number(
  process.env.EXPO_PUBLIC_MAX_CHAT_FILE_SIZE_MB ?? 10
);

export function mimeToFileType(mime?: string | null): FileCategory {
  if (!mime) return 'file';
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  return 'file';
}

function tooBig(size: number): boolean {
  return size > MAX_FILE_MB * 1024 * 1024;
}

function fromImagePickerAsset(a: ImagePicker.ImagePickerAsset): PickedAsset {
  const mimeType =
    a.mimeType ?? (a.type === 'video' ? 'video/mp4' : 'image/jpeg');
  return {
    uri: a.uri,
    name: a.fileName ?? a.uri.split('/').pop() ?? `upload-${a.assetId ?? ''}`,
    mimeType,
    size: a.fileSize ?? 0,
    file_type: mimeToFileType(mimeType),
  };
}

interface PickResult {
  assets: PickedAsset[];
  /** Names of files skipped for exceeding the size limit. */
  tooLarge: string[];
}

function partition(assets: PickedAsset[]): PickResult {
  const ok: PickedAsset[] = [];
  const tooLarge: string[] = [];
  for (const a of assets) {
    if (a.size && tooBig(a.size)) tooLarge.push(a.name);
    else ok.push(a);
  }
  return { assets: ok, tooLarge };
}

/** Pick images/videos from the library (multi-select for images). */
export async function pickFromLibrary(): Promise<PickResult> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return { assets: [], tooLarge: [] };
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images', 'videos'],
    allowsMultipleSelection: true,
    selectionLimit: 10,
    quality: 0.8,
  });
  if (res.canceled) return { assets: [], tooLarge: [] };
  return partition(res.assets.map(fromImagePickerAsset));
}

/** Capture a photo or video with the camera. */
export async function captureWithCamera(): Promise<PickResult> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) return { assets: [], tooLarge: [] };
  const res = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images', 'videos'],
    quality: 0.8,
  });
  if (res.canceled) return { assets: [], tooLarge: [] };
  return partition(res.assets.map(fromImagePickerAsset));
}

/** Pick a generic document / file (incl. audio files). */
export async function pickDocument(): Promise<PickResult> {
  const res = await DocumentPicker.getDocumentAsync({
    type: '*/*',
    multiple: false,
    copyToCacheDirectory: true,
  });
  if (res.canceled) return { assets: [], tooLarge: [] };
  const assets = res.assets.map<PickedAsset>((a) => ({
    uri: a.uri,
    name: a.name,
    mimeType: a.mimeType ?? 'application/octet-stream',
    size: a.size ?? 0,
    file_type: mimeToFileType(a.mimeType),
  }));
  return partition(assets);
}

/** Upload one picked asset to /api/upload and return the message file payload. */
export async function uploadAsset(asset: PickedAsset): Promise<UploadedFileData> {
  const form = new FormData();
  form.append('file', {
    uri: asset.uri,
    name: asset.name,
    type: asset.mimeType,
    // RN's FormData file shape isn't in the DOM lib types.
  } as unknown as Blob);

  const data = await api.upload<{
    url: string;
    name: string;
    size: number;
    mime_type: string;
  }>('/api/upload', form);

  return {
    url: data.url,
    name: data.name,
    size: data.size,
    mime_type: data.mime_type,
    // The upload endpoint doesn't return file_type — derive it like the web does.
    file_type: mimeToFileType(data.mime_type ?? asset.mimeType),
  };
}
