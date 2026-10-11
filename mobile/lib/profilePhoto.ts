import * as FileSystem from 'expo-file-system';
import { patients } from './api';

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

export interface PickedPhoto {
  uri: string;
  mimeType?: string | null;
  fileSize?: number | null;
}

export function normaliseContentType(mime?: string | null): string {
  const m = (mime ?? '').toLowerCase();
  return ALLOWED.includes(m) ? m : 'image/jpeg';
}

/** presign -> PUT the bytes -> process. Returns the new (signed) photo URL. */
export async function uploadProfilePhoto(photo: PickedPhoto): Promise<string | null> {
  let size = photo.fileSize ?? 0;
  if (!size) {
    const info = await FileSystem.getInfoAsync(photo.uri);
    size = info.exists && 'size' in info ? info.size : 0;
  }
  if (!size) throw new Error('Could not read the selected photo.');
  if (size > MAX_PHOTO_BYTES) throw new Error('That photo is too large. Please choose one under 10 MB.');

  const contentType = normaliseContentType(photo.mimeType);
  const ticket = await patients.getProfilePhotoUploadUrl({ contentType, sizeBytes: size });
  const put = await FileSystem.uploadAsync(ticket.uploadUrl, photo.uri, {
    httpMethod: 'PUT',
    uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    headers: { 'Content-Type': contentType },
  });
  if (put.status < 200 || put.status >= 300) throw new Error('Photo upload failed. Please try again.');
  const done = await patients.processProfilePhoto(ticket.objectKey);
  return done?.profilePhotoUrl ?? null;
}
