import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests run against a separate database (E2E_DATABASE_URL), which
 * global-setup wipes, migrates and seeds before every run. Never point it at a
 * database you care about.
 *
 *   pnpm test:e2e                 # starts `next dev` on port 3100
 *   E2E_PROD=1 pnpm test:e2e      # builds and runs `next start` instead
 */
const PORT = Number(process.env.E2E_PORT ?? 3100);
const baseURL = `http://localhost:${PORT}`;
export const E2E_DATABASE_URL =
  process.env.E2E_DATABASE_URL ?? "postgres://portfolio:portfolio@127.0.0.1:5432/portfolio_e2e";

const serverEnv = {
  DATABASE_URL: E2E_DATABASE_URL,
  SITE_URL: baseURL,
  APP_SECRET: "e2e-only-secret-value-that-is-long-enough-123",
  STORAGE_DRIVER: "local",
  LOCAL_STORAGE_DIR: "./storage-e2e",
  MAX_UPLOAD_MB: "4",
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: "",
  TURNSTILE_SECRET_KEY: "",
  SMTP_HOST: "",
};

export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [["list"]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH, args: ["--no-sandbox"] }
      : undefined,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: process.env.E2E_PROD ? `pnpm build && pnpm start --port ${PORT}` : `pnpm dev --port ${PORT}`,
    url: `${baseURL}/admin/login`,
    reuseExistingServer: false,
    timeout: 300_000,
    env: serverEnv,
    stdout: "ignore",
    stderr: "pipe",
  },
});
