import "server-only";

import { storageConfig } from "@/server/env";

import { LocalStorageDriver } from "./local";
import { S3StorageDriver } from "./s3";
import type { StorageDriver } from "./types";

let driver: StorageDriver | undefined;

/** The configured storage driver (STORAGE_DRIVER=local | s3). */
export function storage(): StorageDriver {
  if (driver) return driver;
  const config = storageConfig();
  driver = config.driver === "s3" ? new S3StorageDriver(config) : new LocalStorageDriver(config.dir);
  return driver;
}

export { IMMUTABLE_CACHE, STORAGE_KEY_PATTERN } from "./types";
export type { StorageDriver } from "./types";
