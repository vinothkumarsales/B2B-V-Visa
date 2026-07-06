import { createHash, randomUUID } from 'crypto';
import { mkdir, readFile, rm, stat, writeFile } from 'fs/promises';
import { basename, dirname, extname, resolve } from 'path';
import { env } from '@/lib/env';

export type UploadInput = {
  agencyId: string;
  applicationId?: string;
  applicantId?: string;
  documentType: string;
  originalFilename: string;
  mimeType: string;
  bytes: Buffer;
};

export type StoredDocument = {
  storageProvider: string;
  storageKey: string;
  safeFilename: string;
  mimeType: string;
  fileSize: number;
  checksum: string;
};

export interface PrivateDocumentStorage {
  upload(input: UploadInput): Promise<StoredDocument>;
  createSignedDownloadUrl(key: string): Promise<string>;
  exists(key: string): Promise<boolean>;
  delete(key: string): Promise<void>;
}

const allowedMimeTypes = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

export function getPrivateDocumentStorage(): PrivateDocumentStorage {
  if (env.STORAGE_PROVIDER !== 'local') {
    throw new Error(`Private storage provider ${env.STORAGE_PROVIDER} is not implemented`);
  }
  return new LocalPrivateDocumentStorage(env.STORAGE_PRIVATE_ROOT);
}

class LocalPrivateDocumentStorage implements PrivateDocumentStorage {
  constructor(private readonly root: string) {}

  async upload(input: UploadInput): Promise<StoredDocument> {
    validateUpload(input);
    const checksum = createHash('sha256').update(input.bytes).digest('hex');
    const safeFilename = sanitizeFilename(input.originalFilename);
    const extension = extname(safeFilename);
    const storageKey = [
      input.agencyId,
      input.applicationId ?? 'agency',
      input.applicantId ?? 'shared',
      `${Date.now()}-${randomUUID()}${extension}`,
    ].join('/');
    const absolutePath = this.absolutePath(storageKey);
    await mkdir(dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, input.bytes, { flag: 'wx' });

    return {
      storageProvider: 'local',
      storageKey,
      safeFilename,
      mimeType: input.mimeType,
      fileSize: input.bytes.byteLength,
      checksum,
    };
  }

  async createSignedDownloadUrl(key: string): Promise<string> {
    assertSafeStorageKey(key);
    return `local-private://${key}`;
  }

  async exists(key: string): Promise<boolean> {
    try {
      await stat(this.absolutePath(key));
      return true;
    } catch {
      return false;
    }
  }

  async delete(key: string): Promise<void> {
    await rm(this.absolutePath(key), { force: true });
  }

  private absolutePath(key: string) {
    assertSafeStorageKey(key);
    const root = resolve(this.root);
    const absolute = resolve(root, key);
    if (!absolute.startsWith(root)) {
      throw new Error('Invalid storage key');
    }
    return absolute;
  }
}

function validateUpload(input: UploadInput) {
  if (!allowedMimeTypes.has(input.mimeType)) {
    throw new Error('Unsupported document MIME type');
  }
  if (input.bytes.byteLength <= 0 || input.bytes.byteLength > 10 * 1024 * 1024) {
    throw new Error('Document file size is outside the allowed range');
  }
  sanitizeFilename(input.originalFilename);
}

function sanitizeFilename(filename: string) {
  const safe = basename(filename)
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/^_+|_+$/g, '');
  if (!safe || safe === '.' || safe === '..') {
    throw new Error('Invalid document filename');
  }
  return safe.slice(0, 120);
}

function assertSafeStorageKey(key: string) {
  if (!key || key.includes('..') || key.startsWith('/') || /^[a-zA-Z]:/.test(key)) {
    throw new Error('Invalid storage key');
  }
}

export async function readLocalPrivateDocumentForCrm(key: string) {
  if (env.STORAGE_PROVIDER !== 'local') {
    throw new Error('Only local private storage read is implemented');
  }
  return readFile(resolve(env.STORAGE_PRIVATE_ROOT, key));
}
