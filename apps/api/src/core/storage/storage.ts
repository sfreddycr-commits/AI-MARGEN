import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import type { AppConfig } from '../config/config.js';

/**
 * Almacenamiento de archivos subidos (facturas). Las claves siempre empiezan con el uuid del
 * tenant para aislar archivos por negocio (riesgo R7). Nunca hay URLs públicas: la descarga
 * pasa por la API autenticada.
 */
export interface Storage {
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<Buffer>;
}

export function createStorage(config: AppConfig): Storage {
  if (config.STORAGE_DRIVER === 's3') {
    const client = new S3Client({
      region: config.S3_REGION,
      endpoint: config.S3_ENDPOINT || undefined,
      forcePathStyle: config.S3_FORCE_PATH_STYLE,
      credentials: { accessKeyId: config.S3_ACCESS_KEY_ID, secretAccessKey: config.S3_SECRET_ACCESS_KEY },
    });
    return {
      async put(key, body, contentType) {
        await client.send(
          new PutObjectCommand({
            Bucket: config.S3_BUCKET,
            Key: key,
            Body: body,
            ContentType: contentType,
            ServerSideEncryption: config.S3_ENDPOINT ? undefined : 'AES256',
          }),
        );
      },
      async get(key) {
        const res = await client.send(new GetObjectCommand({ Bucket: config.S3_BUCKET, Key: key }));
        const bytes = await res.Body?.transformToByteArray();
        if (!bytes) throw new Error('Archivo vacío');
        return Buffer.from(bytes);
      },
    };
  }

  const root = resolve(config.STORAGE_LOCAL_DIR);
  const pathFor = (key: string) => {
    const full = resolve(root, key);
    if (!full.startsWith(root + sep)) throw new Error('Clave de almacenamiento inválida');
    return full;
  };
  return {
    async put(key, body) {
      const full = pathFor(key);
      await mkdir(dirname(full), { recursive: true });
      await writeFile(full, body, { mode: 0o600 });
    },
    async get(key) {
      return readFile(pathFor(key));
    },
  };
}

/** Detecta el tipo real por firma (no por extensión ni por el Content-Type del cliente). */
export function sniffMime(buf: Buffer): 'image/jpeg' | 'image/png' | 'image/webp' | 'application/pdf' | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])))
    return 'image/png';
  if (buf.length >= 12 && buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP')
    return 'image/webp';
  if (buf.length >= 5 && buf.subarray(0, 5).toString('ascii') === '%PDF-') return 'application/pdf';
  return null;
}
