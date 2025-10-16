import { Platform } from 'react-native';
import * as Crypto from 'expo-crypto';
import { CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_FOLDER } from '@env';

const DEFAULT_FOLDER = (CLOUDINARY_UPLOAD_FOLDER || 'siet-bus/profiles').replace(/\/+$/u, '');

const ensureConfig = () => {
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    throw new Error('Cloudinary environment variables are not configured.');
  }
};

const buildSignatureString = (params) => {
  const sortedKeys = Object.keys(params).sort();
  const joined = sortedKeys
    .map((key) => `${key}=${params[key]}`)
    .join('&');
  return `${joined}${CLOUDINARY_API_SECRET}`;
};

const sanitizePublicId = (value) => {
  if (!value) return undefined;
  const sanitized = value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\-_]+/g, '-');
  return sanitized || undefined;
};

const guessFileName = (uri) => {
  const fallback = `profile_${Date.now()}.jpg`;
  if (!uri) return fallback;
  const segments = uri.split('/');
  const lastSegment = segments.pop();
  if (!lastSegment) return fallback;
  if (lastSegment.includes('?')) {
    return lastSegment.split('?')[0];
  }
  return lastSegment;
};

const guessMimeType = (fileName = '') => {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.heic')) return 'image/heic';
  if (lower.endsWith('.jpeg')) return 'image/jpeg';
  return 'image/jpg';
};

export const uploadImageToCloudinary = async (uri, options = {}) => {
  if (!uri) {
    throw new Error('No image selected');
  }

  ensureConfig();

  const baseFolder = options.folder || DEFAULT_FOLDER;
  const folder = baseFolder ? baseFolder.replace(/\/+$/u, '') : undefined;
  const publicId = sanitizePublicId(options.publicId);
  const timestamp = Math.floor(Date.now() / 1000);

  const signatureParams = {
    timestamp,
  };

  if (folder) {
    signatureParams.folder = folder;
  }

  if (publicId) {
    signatureParams.public_id = publicId;
  }

  const signatureBase = buildSignatureString(signatureParams);
  const signature = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA1, signatureBase);

  const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

  const fileName = guessFileName(uri);
  const mimeType = guessMimeType(fileName);

  const formData = new FormData();

  formData.append('file', {
    uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
    type: mimeType,
    name: fileName,
  });

  formData.append('api_key', CLOUDINARY_API_KEY);
  formData.append('timestamp', String(timestamp));
  formData.append('signature', signature);

  if (folder) {
    formData.append('folder', folder);
  }

  if (publicId) {
    formData.append('public_id', publicId);
  }

  const response = await fetch(uploadUrl, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Cloudinary upload failed: ${errorText}`);
  }

  const payload = await response.json();

  return {
    secureUrl: payload.secure_url,
    publicId: payload.public_id,
    raw: payload,
  };
};
