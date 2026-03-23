import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { storage } from './firebase';

function getFileExtension(uri: string, mimeType?: string | null) {
  if (mimeType === 'image/png') {
    return 'png';
  }

  if (mimeType === 'image/webp') {
    return 'webp';
  }

  const match = uri.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
  if (match?.[1]) {
    return match[1].toLowerCase();
  }

  return 'jpg';
}

export async function uploadImageAsync(params: {
  uri: string;
  path: string;
  mimeType?: string | null;
}) {
  const response = await fetch(params.uri);
  const blob = await response.blob();
  const extension = getFileExtension(params.uri, params.mimeType);
  const storageRef = ref(storage, `${params.path}.${extension}`);

  await uploadBytes(storageRef, blob, {
    contentType: params.mimeType ?? blob.type ?? 'image/jpeg',
  });

  return getDownloadURL(storageRef);
}
