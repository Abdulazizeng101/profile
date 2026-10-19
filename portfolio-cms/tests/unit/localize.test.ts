import { describe, expect, it } from "vitest";

import { getDictionary, locales } from "@/lib/i18n";
import { hasOwnTranslation, pick, pickLabel } from "@/server/content/localize";

const rows = [
  { locale: "en" as const, title: "Campus Navigator", summary: "Finds rooms." },
  { locale: "ar" as const, title: "دليل الحرم", summary: "   " },
];

describe("localisation never invents translations", () => {
  it("returns the requested language when present", () => {
    expect(pick(rows, "ar", "title", "english")).toEqual({ text: "دليل الحرم", lang: "ar" });
  });

  it("falls back to English, marked as English, when Arabic is blank", () => {
    expect(pick(rows, "ar", "summary", "english")).toEqual({ text: "Finds rooms.", lang: "en" });
  });

  it("returns nothing in hide mode instead of falling back", () => {
    expect(pick(rows, "ar", "summary", "hide")).toEqual({ text: "", lang: "ar" });
  });

  it("never falls back from English to Arabic", () => {
    const arOnly = [{ locale: "ar" as const, title: "عنوان" }];
    expect(pick(arOnly, "en", "title", "english")).toEqual({ text: "", lang: "en" });
  });

  it("picks short paired labels", () => {
    expect(pickLabel("Web", "ويب", "ar")).toEqual({ text: "ويب", lang: "ar" });
    expect(pickLabel("Web", " ", "ar")).toEqual({ text: "Web", lang: "en" });
    expect(pickLabel("Web", "ويب", "en")).toEqual({ text: "Web", lang: "en" });
  });

  it("detects whether an entry has its own translation", () => {
    expect(hasOwnTranslation(rows, "ar", "title")).toBe(true);
    expect(hasOwnTranslation(rows, "ar", "summary")).toBe(false);
  });
});

describe("interface dictionaries", () => {
  const leaves = (value: unknown, prefix = ""): [string, unknown][] =>
    value && typeof value === "object"
      ? Object.entries(value).flatMap(([k, v]) => leaves(v, prefix ? `${prefix}.${k}` : k))
      : [[prefix, value]];

  it("has the same keys and no empty strings in every language", () => {
    const [en, ...others] = locales.map((locale) => leaves(getDictionary(locale)));
    for (const other of others) expect(other.map(([k]) => k)).toEqual(en!.map(([k]) => k));
    for (const locale of locales) {
      const empty = leaves(getDictionary(locale)).filter(([, v]) => typeof v === "string" && !v.trim());
      expect(empty, `${locale} has empty strings`).toEqual([]);
    }
  });
});
