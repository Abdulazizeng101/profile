import { expect, test } from "@playwright/test";

import { login } from "./helpers";

test("admin APIs reject anonymous requests", async ({ request, baseURL }) => {
  const exported = await request.get("/api/admin/export");
  expect(exported.status()).toBe(401);

  const upload = await request.post("/api/admin/upload", {
    headers: { origin: baseURL! },
    multipart: { kind: "image", file: { name: "x.png", mimeType: "image/png", buffer: Buffer.from("x") } },
  });
  expect(upload.status()).toBe(401);
});

test("uploads from another origin are rejected even when signed in", async ({ page }) => {
  await login(page);
  const response = await page.request.post("/api/admin/upload", {
    headers: { origin: "https://evil.example" },
    multipart: { kind: "image", file: { name: "x.png", mimeType: "image/png", buffer: Buffer.from("x") } },
  });
  expect(response.status()).toBe(403);
});

test("uploads are checked by content, not by name", async ({ page, baseURL }) => {
  await login(page);
  const response = await page.request.post("/api/admin/upload", {
    headers: { origin: baseURL! },
    multipart: {
      kind: "image",
      file: { name: "photo.jpg", mimeType: "image/jpeg", buffer: Buffer.from("<script>alert(1)</script>") },
    },
  });
  expect(response.status()).toBe(422);
  expect((await response.json()).error).toContain("JPG, PNG or WebP");
});

test("media paths can't escape the storage folder", async ({ request }) => {
  for (const path of [
    "/media/../.env.local",
    "/media/images/..%2F..%2Fpackage.json",
    "/media/documents/x.pdf",
  ]) {
    const response = await request.get(path);
    expect(response.status()).toBe(404);
  }
});

test("security headers are set", async ({ request }) => {
  const response = await request.get("/en");
  const headers = response.headers();
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(headers["x-powered-by"]).toBeUndefined();
});

test("repeated wrong passwords lock the account temporarily", async ({ page }) => {
  for (let i = 0; i < 6; i++) {
    await page.goto("/admin/login");
    await page.getByLabel("Email").fill("lockout-test@example.com");
    await page.getByLabel("Password").fill(`wrong-password-${i}`);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.locator("#login-error")).toBeVisible();
  }
  await expect(page.locator("#login-error")).toContainText("Too many sign-in attempts");
});
