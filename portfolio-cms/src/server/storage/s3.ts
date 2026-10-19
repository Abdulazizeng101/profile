import {
  DeleteObjectsCommand,
  GetObjectCommand,
  NoSuchKey,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

import { assertValidKey, IMMUTABLE_CACHE, type PutOptions, type StorageDriver, type StoredObject } from "./types";

type S3Options = {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicUrl: string;
};

/**
 * Any S3-compatible bucket: Cloudflare R2, AWS S3, MinIO, Backblaze B2...
 * Objects are read by browsers straight from S3_PUBLIC_URL (an R2 custom
 * domain or public bucket URL), so media never passes through the app server.
 */
export class S3StorageDriver implements StorageDriver {
  readonly name = "s3" as const;
  private readonly client: S3Client;

  constructor(private readonly options: S3Options) {
    this.client = new S3Client({
      region: options.region,
      endpoint: options.endpoint || undefined,
      forcePathStyle: Boolean(options.endpoint),
      credentials: { accessKeyId: options.accessKeyId, secretAccessKey: options.secretAccessKey },
      // Only send checksums when the API requires them; keeps R2/MinIO compatibility.
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
    });
  }

  async put(key: string, body: Buffer, options: PutOptions): Promise<void> {
    assertValidKey(key);
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.options.bucket,
        Key: key,
        Body: body,
        ContentType: options.contentType,
        CacheControl: options.cacheControl ?? IMMUTABLE_CACHE,
        ContentDisposition: options.contentDisposition,
      }),
    );
  }

  async get(key: string): Promise<StoredObject | null> {
    assertValidKey(key);
    try {
      const result = await this.client.send(new GetObjectCommand({ Bucket: this.options.bucket, Key: key }));
      const bytes = await result.Body?.transformToByteArray();
      if (!bytes) return null;
      return { body: Buffer.from(bytes), contentType: result.ContentType ?? "application/octet-stream" };
    } catch (error) {
      if (error instanceof NoSuchKey) return null;
      throw error;
    }
  }

  async delete(keys: string[]): Promise<void> {
    if (keys.length === 0) return;
    keys.forEach(assertValidKey);
    for (let i = 0; i < keys.length; i += 1000) {
      await this.client.send(
        new DeleteObjectsCommand({
          Bucket: this.options.bucket,
          Delete: { Objects: keys.slice(i, i + 1000).map((Key) => ({ Key })), Quiet: true },
        }),
      );
    }
  }

  publicUrl(key: string): string {
    return `${this.options.publicUrl}/${key}`;
  }
}
