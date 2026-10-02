import { mkdir, readFile, writeFile, unlink } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import type { AppConfig } from '../config/config.js';

export interface Storage {
  put(key: string, data: Buffer, contentType?: string): Promise<void>;
  get(key: string): Promise<Buffer>;
  delete?(key: string): Promise<void>;
}

export type SupportedMime = 'image/jpeg' | 'image/png' | 'image/webp' | 'application/pdf';

/**
 * Valida los primeros bytes (magic numbers) para determinar el tipo MIME real.
 * Nunca confía en el header enviado por el cliente (SOP §34).
 */
export function sniffMime(buf: Buffer): SupportedMime | null {
  if (!buf || buf.length < 4) return null;

  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return 'image/jpeg';
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf.length >= 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  ) {
    return 'image/png';
  }

  // PDF: %PDF (25 50 44 46)
  if (buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46) {
    return 'application/pdf';
  }

  // WebP: RIFF....WEBP (52 49 46 46 .... 57 45 42 50)
  if (
    buf.length >= 12 &&
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf[8] === 0x57 &&
    buf[9] === 0x45 &&
    buf[10] === 0x42 &&
    buf[11] === 0x50
  ) {
    return 'image/webp';
  }

  return null;
}

class LocalStorage implements Storage {
  constructor(private readonly baseDir: string) {}

  private resolvePath(key: string): string {
    const safeKey = key.replace(/^\/+/, '');
    const fullPath = resolve(this.baseDir, safeKey);
    if (!fullPath.startsWith(resolve(this.baseDir))) {
      throw new Error('Path traversal detectado en almacenamiento local');
    }
    return fullPath;
  }

  async put(key: string, data: Buffer): Promise<void> {
    const fullPath = this.resolvePath(key);
    await mkdir(dirname(fullPath), { recursive: true });
    await writeFile(fullPath, data);
  }

  async get(key: string): Promise<Buffer> {
    const fullPath = this.resolvePath(key);
    return readFile(fullPath);
  }

  async delete(key: string): Promise<void> {
    const fullPath = this.resolvePath(key);
    try {
      await unlink(fullPath);
    } catch {
      // Ignorar si no existe
    }
  }
}

class S3Storage implements Storage {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(config: AppConfig) {
    this.bucket = config.S3_BUCKET;
    this.client = new S3Client({
      region: config.S3_REGION,
      endpoint: config.S3_ENDPOINT || undefined,
      forcePathStyle: config.S3_FORCE_PATH_STYLE,
      credentials: {
        accessKeyId: config.S3_ACCESS_KEY_ID,
        secretAccessKey: config.S3_SECRET_ACCESS_KEY,
      },
    });
  }

  async put(key: string, data: Buffer, contentType?: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: data,
        ContentType: contentType,
      }),
    );
  }

  async get(key: string): Promise<Buffer> {
    const res = await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
    if (!res.Body) throw new Error(`Objeto no encontrado en S3: ${key}`);
    const bytes = await res.Body.transformToByteArray();
    return Buffer.from(bytes);
  }

  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
  }
}

export function createStorage(config: AppConfig): Storage {
  if (config.STORAGE_DRIVER === 's3') {
    return new S3Storage(config);
  }
  return new LocalStorage(config.STORAGE_LOCAL_DIR);
}
