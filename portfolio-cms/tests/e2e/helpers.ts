import path from "node:path";

import AxeBuilder from "@axe-core/playwright";
import { expect, type APIRequestContext, type Page } from "@playwright/test";

import { ADMIN } from "./global-setup";

export const FIXTURES = path.join(__dirname, "fixtures");

export async function login(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(ADMIN.email);
  await page.getByLabel("Password").fill(ADMIN.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
}

/** Waits for the success toast an admin save produces. */
export async function expectToast(page: Page, text: string | RegExp) {
  await expect(page.locator("[data-sonner-toast]").filter({ hasText: text }).first()).toBeVisible();
}

/** Fails on serious or critical WCAG 2.1 AA violations. */
export async function expectAccessible(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(
    serious.map(
      (v) =>
        `${v.id}: ${v.help} (${v.nodes
          .map((n) => n.target.join(" "))
          .slice(0, 3)
          .join(", ")})`,
    ),
  ).toEqual([]);
}

/**
 * An anonymous visitor gets the not-found page for `url`, with none of `hidden`.
 * Pages stream, so when the 404 is decided after the response has started
 * (an unpublished or unknown project), Next.js can't change the 200 status;
 * it renders the not-found page with a noindex tag instead. What matters is
 * that the unpublished content is absent.
 */
export async function expectNotPublic(request: APIRequestContext, url: string, hidden: string) {
  const response = await request.get(url);
  const body = await response.text();
  expect([200, 404]).toContain(response.status());
  expect(body).toContain("Page not found");
  expect(body).toMatch(/name="robots" content="noindex/);
  expect(body).not.toContain(hidden);
}
