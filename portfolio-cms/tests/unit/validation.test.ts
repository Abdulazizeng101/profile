import { describe, expect, it } from "vitest";

import { isHttpUrl, optionalDate, slug } from "@/lib/validation/common";
import {
  accomplishmentSchema,
  appearanceSchema,
  educationSchema,
  experienceSchema,
  profileSchema,
  projectSchema,
  skillSchema,
} from "@/lib/validation/content";
import { contactMessageSchema } from "@/lib/validation/public";

const day = 864e5;
const iso = (offsetDays: number) => new Date(Date.now() + offsetDays * day).toISOString().slice(0, 10);
const errorsOf = (result: {
  success: boolean;
  error?: { issues: { path: PropertyKey[]; message: string }[] };
}) => Object.fromEntries((result.error?.issues ?? []).map((i) => [i.path.join("."), i.message]));

const experience = (overrides: Record<string, unknown>) => ({
  translations: { en: { organization: "Org", role: "Engineer" }, ar: {} },
  ...overrides,
});

describe("experience status must agree with the dates", () => {
  it("rejects a planned role whose start date has passed", () => {
    const result = experienceSchema.safeParse(experience({ state: "planned", startDate: iso(-1) }));
    expect(errorsOf(result).startDate).toMatch(/has passed/);
  });

  it("rejects a planned role starting today", () => {
    expect(experienceSchema.safeParse(experience({ state: "planned", startDate: iso(0) })).success).toBe(
      false,
    );
  });

  it("accepts a planned role in the future", () => {
    expect(experienceSchema.safeParse(experience({ state: "planned", startDate: iso(30) })).success).toBe(
      true,
    );
  });

  it("requires both dates for completed experience, in the past", () => {
    expect(errorsOf(experienceSchema.safeParse(experience({ state: "completed" })))).toMatchObject({
      startDate: expect.any(String),
      endDate: expect.any(String),
    });
    const future = experienceSchema.safeParse(
      experience({ state: "completed", startDate: iso(-100), endDate: iso(10) }),
    );
    expect(errorsOf(future).endDate).toMatch(/Current/);
    expect(
      experienceSchema.safeParse(experience({ state: "completed", startDate: iso(-100), endDate: iso(-10) }))
        .success,
    ).toBe(true);
  });

  it("rejects a current role that hasn't started or has already ended", () => {
    expect(
      errorsOf(experienceSchema.safeParse(experience({ state: "current", startDate: iso(5) }))).startDate,
    ).toMatch(/Planned/);
    expect(
      errorsOf(
        experienceSchema.safeParse(experience({ state: "current", startDate: iso(-50), endDate: iso(-1) })),
      ).endDate,
    ).toMatch(/Completed/);
    expect(experienceSchema.safeParse(experience({ state: "current", startDate: iso(-50) })).success).toBe(
      true,
    );
  });

  it("rejects an end date before the start date", () => {
    const result = experienceSchema.safeParse(
      experience({ state: "completed", startDate: iso(-10), endDate: iso(-20) }),
    );
    expect(errorsOf(result).endDate).toMatch(/before the start/);
  });

  it("requires the English organization and role but not the Arabic ones", () => {
    const result = experienceSchema.safeParse({
      state: "current",
      startDate: iso(-5),
      translations: { en: {}, ar: {} },
    });
    expect(Object.keys(errorsOf(result))).toEqual(
      expect.arrayContaining(["translations.en.organization", "translations.en.role"]),
    );
  });
});

describe("projects", () => {
  const base = { slug: "my-project", translations: { en: { title: "My project" }, ar: {} } };

  it("saves a draft with only a name and slug", () => {
    expect(projectSchema.safeParse(base).success).toBe(true);
  });

  it("refuses to publish sample content or a project without a summary", () => {
    const sample = projectSchema.safeParse({ ...base, status: "published", isSample: true });
    expect(errorsOf(sample)).toMatchObject({
      isSample: expect.stringMatching(/Sample content/),
      "translations.en.summary": expect.any(String),
    });
  });

  it("only accepts video links from known hosts", () => {
    expect(projectSchema.safeParse({ ...base, videoUrl: "https://evil.example/video" }).success).toBe(false);
    expect(projectSchema.safeParse({ ...base, videoUrl: "https://youtu.be/dQw4w9WgXcQ" }).success).toBe(true);
  });

  it("rejects non-http URLs such as javascript:", () => {
    expect(projectSchema.safeParse({ ...base, repoUrl: "javascript:alert(1)" }).success).toBe(false);
    expect(projectSchema.safeParse({ ...base, liveUrl: "ftp://example.com" }).success).toBe(false);
  });

  it("normalises Markdown line endings and trims", () => {
    const parsed = projectSchema.parse({
      ...base,
      translations: { en: { title: "X", overview: "  a\r\nb  " }, ar: {} },
    });
    expect(parsed.translations.en.overview).toBe("a\nb");
  });
});

describe("education never accepts invented facts by accident", () => {
  const base = { translations: { en: { institution: "KFUPM", degree: "BSc" }, ar: {} } };

  it("does not default a grade", () => {
    expect(educationSchema.parse(base).grade).toBe("");
  });

  it("rejects a future graduation date for a completed degree", () => {
    const result = educationSchema.safeParse({ ...base, educationStatus: "graduated", endDate: iso(40) });
    expect(errorsOf(result).endDate).toMatch(/in progress/);
    expect(
      educationSchema.safeParse({ ...base, educationStatus: "in_progress", endDate: iso(40) }).success,
    ).toBe(true);
  });
});

describe("other schemas", () => {
  it("requires a name and title in English only", () => {
    const result = profileSchema.safeParse({ translations: { en: { fullName: "", headline: "" }, ar: {} } });
    expect(Object.keys(errorsOf(result))).toEqual(["translations.en.fullName", "translations.en.headline"]);
  });

  it("validates phone numbers and email", () => {
    const bad = profileSchema.safeParse({
      email: "not-an-email",
      phone: "call me",
      translations: { en: { fullName: "A", headline: "B" }, ar: {} },
    });
    expect(Object.keys(errorsOf(bad))).toEqual(["email", "phone"]);
  });

  it("has no proficiency percentages, only labels", () => {
    expect(skillSchema.safeParse({ name: "Go", proficiency: "expert" }).success).toBe(false);
    expect(skillSchema.safeParse({ name: "Go", proficiency: 90 }).success).toBe(false);
    expect(skillSchema.parse({ name: "Go" }).proficiency).toBeNull();
  });

  it("rejects icon slugs with path characters", () => {
    expect(skillSchema.safeParse({ name: "Go", iconSlug: "../etc" }).success).toBe(false);
  });

  it("rejects future issue dates and expiry before issue", () => {
    const base = { kind: "certification", translations: { en: { title: "Cert" }, ar: {} } };
    expect(accomplishmentSchema.safeParse({ ...base, issuedOn: iso(3) }).success).toBe(false);
    expect(accomplishmentSchema.safeParse({ ...base, issuedOn: iso(-30), expiresOn: iso(-60) }).success).toBe(
      false,
    );
    expect(accomplishmentSchema.safeParse({ ...base, issuedOn: iso(-30), expiresOn: iso(300) }).success).toBe(
      true,
    );
  });

  it("requires every home-page section exactly once", () => {
    const keys = ["about", "projects", "skills", "experience", "education", "accomplishments", "contact"];
    const sections = keys.map((key) => ({ key, visible: true }));
    const base = {
      defaultTheme: "dark",
      accent: "brass",
      showProjectsButton: true,
      showCvButton: true,
      showContactButton: true,
    };
    expect(appearanceSchema.safeParse({ ...base, sections }).success).toBe(true);
    expect(
      appearanceSchema.safeParse({ ...base, sections: [...sections.slice(1), sections[1]] }).success,
    ).toBe(false);
  });

  it("validates slugs, dates and URLs", () => {
    expect(slug.safeParse("Campus-Navigator").data).toBe("campus-navigator");
    expect(slug.safeParse("bad slug").success).toBe(false);
    expect(slug.safeParse("double--hyphen").success).toBe(false);
    expect(optionalDate.parse("")).toBeNull();
    expect(optionalDate.safeParse("2024-02-30").success).toBe(true); // Date.parse rolls over; stored as a calendar date
    expect(optionalDate.safeParse("2024-13-01").success).toBe(false);
    expect(isHttpUrl("https://example.com")).toBe(true);
    expect(isHttpUrl("data:text/html,hi")).toBe(false);
  });

  it("validates the public contact form", () => {
    expect(
      contactMessageSchema.safeParse({
        name: "R",
        email: "r@example.com",
        message: "Hello there, let's talk.",
      }).success,
    ).toBe(true);
    const short = contactMessageSchema.safeParse({ name: "", email: "x", message: "hi" });
    expect(Object.values(errorsOf(short)).sort()).toEqual([
      "email_invalid",
      "message_short",
      "name_required",
    ]);
  });
});
