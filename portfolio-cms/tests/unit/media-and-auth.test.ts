import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { hashPassword, passwordProblem, verifyPassword } from "@/server/auth/password";
import { processDocument, processImage, UploadRejected } from "@/server/media/process";
import { LocalStorageDriver } from "@/server/storage/local";
import { assertValidKey } from "@/server/storage/types";

const FIXTURES = path.join(__dirname, "../e2e/fixtures");

describe("image uploads", () => {
  it("re-encodes to WebP renditions and strips EXIF / GPS metadata", async () => {
    const withGps = await sharp({ create: { width: 1400, height: 900, channels: 3, background: "#336699" } })
      .jpeg()
      .withExif({
        IFD0: { Make: "PhoneCo", Model: "X" },
        IFD3: { GPSLatitudeRef: "N", GPSLatitude: "26/1 18/1 0/1" },
      })
      .toBuffer();
    expect((await sharp(withGps).metadata()).exif).toBeDefined();

    const result = await processImage(withGps);
    expect(result.renditions.map((r) => r.width)).toEqual([320, 640, 960, 1280, 1400]);
    for (const rendition of result.renditions) {
      const meta = await sharp(rendition.body).metadata();
      expect(meta.format).toBe("webp");
      expect(meta.exif).toBeUndefined();
    }
    expect(result.blurDataUrl).toMatch(/^data:image\/webp;base64,/);
  });

  it("never upscales a small image", async () => {
    const small = await sharp({ create: { width: 200, height: 120, channels: 3, background: "#000" } })
      .png()
      .toBuffer();
    const result = await processImage(small);
    expect(result.renditions.map((r) => r.width)).toEqual([200]);
  });

  it("judges files by their bytes, not their name or claimed type", async () => {
    const pdf = await import("node:fs/promises").then((fs) => fs.readFile(path.join(FIXTURES, "cv.pdf")));
    await expect(processImage(pdf)).rejects.toBeInstanceOf(UploadRejected);
    await expect(
      processImage(Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'/>")),
    ).rejects.toBeInstanceOf(UploadRejected);
    const gif = await sharp({ create: { width: 50, height: 50, channels: 3, background: "#fff" } })
      .gif()
      .toBuffer();
    await expect(processImage(gif)).rejects.toThrow(/JPG, PNG or WebP/);
  });

  it("rejects truncated images", async () => {
    const jpeg = await sharp({ create: { width: 300, height: 300, channels: 3, background: "#f00" } })
      .jpeg()
      .toBuffer();
    await expect(processImage(jpeg.subarray(0, 200))).rejects.toBeInstanceOf(UploadRejected);
  });
});

describe("PDF uploads", () => {
  it("accepts a plain PDF", async () => {
    const pdf = await import("node:fs/promises").then((fs) => fs.readFile(path.join(FIXTURES, "cv.pdf")));
    await expect(processDocument(pdf)).resolves.toMatchObject({ mimeType: "application/pdf" });
  });

  it("rejects PDFs with JavaScript or launch actions, and non-PDFs", async () => {
    const pdf = await import("node:fs/promises").then((fs) => fs.readFile(path.join(FIXTURES, "cv.pdf")));
    const withJs = Buffer.concat([
      pdf,
      Buffer.from("\n1 0 obj << /S /JavaScript /JS (app.alert(1)) >> endobj\n"),
    ]);
    await expect(processDocument(withJs)).rejects.toThrow(/scripts/);
    const png = await sharp({ create: { width: 20, height: 20, channels: 3, background: "#fff" } })
      .png()
      .toBuffer();
    await expect(processDocument(png)).rejects.toThrow(/PDF/);
  });
});

describe("passwords", () => {
  it("hashes with Argon2id and verifies", async () => {
    const hash = await hashPassword("correct horse battery staple");
    expect(hash).toMatch(/^\$argon2id\$v=19\$m=19456,t=2,p=1\$/);
    expect(await verifyPassword(hash, "correct horse battery staple")).toBe(true);
    expect(await verifyPassword(hash, "wrong")).toBe(false);
    expect(await verifyPassword("not-a-hash", "x")).toBe(false);
  });

  it("rejects weak passwords", () => {
    expect(passwordProblem("short")).toMatch(/12 characters/);
    expect(passwordProblem("aaaaaaaaaaaaaaaa")).toMatch(/repetitive/);
    expect(passwordProblem("faisal-secure-pass", "faisal@example.com")).toMatch(/email/);
    expect(passwordProblem("a-long-and-varied-passphrase")).toBeNull();
  });
});

describe("local file storage", () => {
  let dir: string;
  let store: LocalStorageDriver;
  const key = "images/123e4567-e89b-12d3-a456-426614174000/w320.webp";

  beforeAll(async () => {
    dir = await mkdtemp(path.join(tmpdir(), "storage-test-"));
    store = new LocalStorageDriver(dir);
  });
  afterAll(() => rm(dir, { recursive: true, force: true }));

  it("stores, reads and deletes files", async () => {
    await store.put(key, Buffer.from("data"), { contentType: "image/webp" });
    expect((await store.get(key))?.body.toString()).toBe("data");
    expect((await store.get(key))?.contentType).toBe("image/webp");
    await store.delete([key]);
    expect(await store.get(key)).toBeNull();
    expect(store.publicUrl(key)).toBe(`/media/${key}`);
  });

  it("refuses keys that could escape the storage folder", async () => {
    for (const bad of [
      "../secret.webp",
      "images/../../etc/passwd",
      "images/123e4567-e89b-12d3-a456-426614174000/../../x.webp",
      "images/x.png",
      "/etc/passwd",
      "documents/123e4567-e89b-12d3-a456-426614174000.exe",
    ]) {
      expect(() => assertValidKey(bad), bad).toThrow();
      await expect(store.get(bad)).rejects.toThrow();
    }
    expect(await readdir(dir)).toEqual(["images"]);
  });
});
