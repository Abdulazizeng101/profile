import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

/** Origins that serve uploaded media when the S3/R2 storage driver is used. */
function mediaOrigin(): string {
  const url = process.env.S3_PUBLIC_URL;
  if (!url) return "";
  try {
    return new URL(url).origin;
  } catch {
    return "";
  }
}

const turnstile = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ? " https://challenges.cloudflare.com" : "";

/**
 * Content Security Policy.
 * Next.js inlines small scripts for hydration; a nonce-based policy would force
 * every page to render dynamically and give up static prerendering, so scripts
 * allow 'unsafe-inline' while everything else stays locked to this origin.
 * Markdown is rendered without raw HTML, so user content cannot inject scripts.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}${turnstile}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${mediaOrigin()}`.trim(),
  "font-src 'self'",
  `connect-src 'self'${turnstile}${isDev ? " ws:" : ""}`,
  `frame-src https://www.youtube-nocookie.com https://player.vimeo.com https://www.loom.com${turnstile}`,
  `media-src 'self' ${mediaOrigin()}`.trim(),
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
  ...(isDev
    ? []
    : [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]),
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  serverExternalPackages: ["sharp", "@node-rs/argon2"],
  experimental: {
    globalNotFound: true,
    // Instant-navigation checks (development only) run for the public pages,
    // which opt in with `export const instant = true`. The dashboard renders
    // per request by design, so it isn't validated.
    instantInsights: { validationLevel: "manual-warning" },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        source: "/admin/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          { key: "Cache-Control", value: "private, no-store" },
        ],
      },
    ];
  },
};

export default nextConfig;
