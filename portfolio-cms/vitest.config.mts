import path from "node:path";

import nextEnv from "@next/env";
import { defineConfig } from "vitest/config";

// Loads .env files the way Next.js does in test mode: .env, .env.test, .env.test.local (not .env.local).
nextEnv.loadEnvConfig(process.cwd(), true, { info: () => {}, error: console.error });

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      // `server-only` throws outside the Next.js server bundle; tests are server-side code.
      "server-only": path.resolve(import.meta.dirname, "tests/support/empty.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts"],
    // Integration tests share one database; run files one after another.
    fileParallelism: false,
    testTimeout: 20_000,
  },
});
