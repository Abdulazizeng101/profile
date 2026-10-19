import { loadEnvConfig } from "@next/env";

/** Load .env, .env.local etc. with the same precedence Next.js uses. */
export function loadEnv() {
  const dev = process.env.NODE_ENV !== "production";
  loadEnvConfig(process.cwd(), dev, { info: () => {}, error: console.error });
}
