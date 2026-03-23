import { Platform } from 'react-native';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { storage } from './firebase';

const WEB_UPLOAD_TIMEOUT_MS = 30000; // Increased to 30s for web

function getFileExtension(
  uri: string,
  mimeType?: string | null,
  fallbackExtension = 'bin'
) {
  if (mimeType === 'image/png') {
    return 'png';
  }

  if (mimeType === 'image/webp') {
    return 'webp';
  }

  if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
    return 'jpg';
  }

  const match = uri.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
  if (match?.[1]) {
    return match[1].toLowerCase();
  }

  if (mimeType === 'audio/m4a' || mimeType === 'audio/mp4') {
    return 'm4a';
  }

  if (mimeType === 'audio/mpeg') {
    return 'mp3';
  }

  if (mimeType === 'audio/wav' || mimeType === 'audio/x-wav') {
    return 'wav';
  }

  if (mimeType === 'audio/webm') {
    return 'webm';
  }

  return fallbackExtension;
}

async function uploadFileAsync(params: {
  uri: string;
  path: string;
  mimeType?: string | null;
  fallbackExtension: string;
  defaultContentType: string;
}) {
  let blob: Blob | null = null;
  try {
    const response = await fetch(params.uri);
    blob = await response.blob();
    
    const extension = getFileExtension(
      params.uri,
      params.mimeType,
      params.fallbackExtension
    );
    const storageRef = ref(storage, `${params.path}.${extension}`);
    const metadata = {
      contentType: params.mimeType ?? blob.type ?? params.defaultContentType,
    };

    if (Platform.OS === 'web') {
      await Promise.race([
        uploadBytes(storageRef, blob, metadata),
        new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(
              new Error(
                'Web yuklemesi zaman asimina ugradi. Firebase Storage CORS ayari eksik olabilir.'
              )
            );
          }, WEB_UPLOAD_TIMEOUT_MS);
        }),
      ]);
    } else {
      // Mobile: No aggressive timeout, let Firebase handle retries
      await uploadBytes(storageRef, blob, metadata);
    }

    const downloadUrl = await getDownloadURL(storageRef);
    return downloadUrl;
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    const isWeb = Platform.OS === 'web';
    const looksLikeCors =
      isWeb &&
      (message.toLowerCase().includes('cors') ||
        message.toLowerCase().includes('network request failed') ||
        message.toLowerCase().includes('zaman asimina ugradi'));

    if (looksLikeCors) {
      throw new Error(
        "Firebase Storage web yuklemesi engellendi. Bucket icin CORS ayari yapip 'http://localhost:8081' origin'ini izinli hale getirmen gerekiyor."
      );
    }

    throw error;
  } finally {
    // In React Native, it's good practice to close blobs to free memory
    if (blob && typeof blob.close === 'function') {
      try {
        blob.close();
      } catch (e) {
        // Ignore blob closing errors
      }
    }
  }
}

export async function uploadImageAsync(params: {
  uri: string;
  path: string;
  mimeType?: string | null;
}) {
  return uploadFileAsync({
    ...params,
    fallbackExtension: 'jpg',
    defaultContentType: 'image/jpeg',
  });
}

export async function uploadAudioAsync(params: {
  uri: string;
  path: string;
  mimeType?: string | null;
}) {
  return uploadFileAsync({
    ...params,
    fallbackExtension: 'm4a',
    defaultContentType: 'audio/mp4',
  });
}
