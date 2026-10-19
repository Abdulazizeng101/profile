import { describe, expect, it } from "vitest";

import { formatMonthYear, formatRange, toDateTime } from "@/lib/dates";
import { videoEmbedUrl } from "@/lib/video";
import {
  hmacHex,
  randomToken,
  safeEqual,
  sha256Hex,
  signValue,
  verifySignedValue,
} from "@/server/security/crypto";

describe("signed values (contact-form timing token)", () => {
  const secret = "test-secret-that-is-at-least-32-characters";

  it("round-trips and rejects tampering", () => {
    const signed = signValue(secret, "1700000000000");
    expect(verifySignedValue(secret, signed)).toBe("1700000000000");
    expect(verifySignedValue(secret, signed.replace("17", "18"))).toBeNull();
    expect(verifySignedValue("another-secret-that-is-at-least-32-chars", signed)).toBeNull();
    expect(verifySignedValue(secret, "no-signature")).toBeNull();
    expect(verifySignedValue(secret, ".abc")).toBeNull();
  });

  it("produces unguessable tokens and stable hashes", () => {
    const tokens = new Set(Array.from({ length: 100 }, () => randomToken()));
    expect(tokens.size).toBe(100);
    expect(randomToken()).toMatch(/^[\w-]{43}$/);
    expect(sha256Hex("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    expect(hmacHex("k", "v")).toHaveLength(64);
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
    expect(safeEqual("abc", "abcd")).toBe(false);
  });
});

describe("dates are calendar dates and never shift", () => {
  it("formats month and year in both languages", () => {
    expect(formatMonthYear("2024-09-01", "en")).toBe("Sep 2024");
    expect(formatMonthYear("2024-09-01", "ar")).toMatch(/سبتمبر 2024/);
    expect(formatMonthYear("2024-01-01", "en")).toBe("Jan 2024"); // no slip into Dec 2023
    expect(formatMonthYear("", "en")).toBe("");
    expect(formatMonthYear("garbage", "en")).toBe("");
  });

  it("formats ranges", () => {
    expect(formatRange("2022-09-01", "2026-06-15", "en")).toBe("Sep 2022 – Jun 2026");
    expect(formatRange("2022-09-01", null, "en", "Present")).toBe("Sep 2022 – Present");
    expect(formatRange(null, null, "en")).toBe("");
    expect(toDateTime("2024-09-01")).toBe("2024-09");
  });
});

describe("video embeds", () => {
  it("converts known hosts to privacy-friendly embeds", () => {
    expect(videoEmbedUrl("https://youtu.be/dQw4w9WgXcQ")).toBe(
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
    );
    expect(videoEmbedUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10")).toBe(
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
    );
    expect(videoEmbedUrl("https://vimeo.com/123456")).toBe("https://player.vimeo.com/video/123456?dnt=1");
    expect(videoEmbedUrl("https://www.loom.com/share/abc123def")).toBe(
      "https://www.loom.com/embed/abc123def",
    );
  });

  it("rejects everything else", () => {
    expect(videoEmbedUrl("https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ")).toBeNull();
    expect(videoEmbedUrl("https://www.youtube.com/watch?v=<script>")).toBeNull();
    expect(videoEmbedUrl("javascript:alert(1)")).toBeNull();
    expect(videoEmbedUrl("not a url")).toBeNull();
  });
});
