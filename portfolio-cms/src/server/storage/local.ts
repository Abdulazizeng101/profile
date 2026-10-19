import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { assertValidKey, type PutOptions, type StorageDriver, type StoredObject } from "./types";

const CONTENT_TYPES: Record<string, string> = {
  ".webp": "image/webp",
  ".pdf": "application/pdf",
};

/**
 * Stores files on the local disk, outside /public. Files are served by the
 * /media/[...key] route handler. Suitable for development and for a VPS with
 * a persistent volume; not for serverless hosts.
 */
export class LocalStorageDriver implements StorageDriver {
  readonly name = "local" as const;
  private readonly root: string;

  constructor(dir: string) {
    this.root = path.resolve(process.cwd(), dir);
  }

  private resolve(key: string): string {
    assertValidKey(key);
    const full = path.resolve(this.root, key);
    if (!full.startsWith(this.root + path.sep)) throw new Error("Storage key escapes the storage root.");
    return full;
  }

  async put(key: string, body: Buffer, _options: PutOptions): Promise<void> {
    const target = this.resolve(key);
    await mkdir(path.dirname(target), { recursive: true });
    const temp = `${target}.${process.pid}.${Date.now()}.tmp`;
    await writeFile(temp, body);
    await rename(temp, target);
  }

  async get(key: string): Promise<StoredObject | null> {
    try {
      const body = await readFile(this.resolve(key));
      return { body, contentType: CONTENT_TYPES[path.extname(key)] ?? "application/octet-stream" };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
  }

  async delete(keys: string[]): Promise<void> {
    await Promise.all(keys.map((key) => rm(this.resolve(key), { force: true })));
  }

  publicUrl(key: string): string {
    return `/media/${key}`;
  }
}
