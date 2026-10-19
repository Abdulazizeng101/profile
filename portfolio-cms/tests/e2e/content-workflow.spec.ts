/**
 * The main workflow: an admin fills in the portfolio from the dashboard and
 * the public site reflects every change without a redeploy. Content here is
 * fictional test data used only by this test database.
 */
import path from "node:path";

import { expect, test, type BrowserContext, type Page } from "@playwright/test";

import { expectAccessible, expectNotPublic, expectToast, FIXTURES, login } from "./helpers";

test.describe.configure({ mode: "serial" });

let context: BrowserContext;
let page: Page;

test.beforeAll(async ({ browser }) => {
  // One page shared by the serial steps. axe-core needs a page from an explicit context.
  context = await browser.newContext();
  page = await context.newPage();
});

test.afterAll(async () => {
  await context.close();
});

const future = new Date(Date.now() + 90 * 864e5).toISOString().slice(0, 10);
const past = (days: number) => new Date(Date.now() - days * 864e5).toISOString().slice(0, 10);

test("the dashboard requires signing in", async () => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login$/);
  await page.getByLabel("Email").fill("e2e-admin@example.com");
  await page.getByLabel("Password").fill("wrong-password-123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.locator("#login-error")).toContainText("don't match");
  await login(page);
});

test("profile: validation errors, then a successful save", async () => {
  await page.goto("/admin/profile");
  await page.getByLabel("Short introduction").fill("Draft introduction.");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expectToast(page, /fields? need/);
  await expect(page.getByText("Your full name is required.")).toBeVisible();

  await page.getByLabel("Full name").fill("Faisal Al-Example");
  await page.getByLabel("Professional title").fill("Software Engineer");
  await page
    .getByLabel("Short introduction")
    .fill(
      "Software engineering graduate who builds reliable web systems, from database design to the interface.",
    );
  await page.getByLabel("Location").first().fill("Dhahran, Saudi Arabia");
  await page.getByLabel("Languages").first().fill("Arabic (native), English (professional)");
  await page.getByLabel("Professional email").fill("faisal@example.com");
  await page.getByLabel("Publish email address").click();
  await page.getByLabel("Publish location").click();
  await page
    .getByRole("tab", { name: /العربية/ })
    .first()
    .click();
  await page.locator('[id="translations.ar.fullName"]').fill("فيصل المثال");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expectToast(page, "Profile saved.");
});

test("photo upload with preview before saving", async () => {
  await page.goto("/admin/media");
  await page.getByLabel("No photo yet").setInputFiles(path.join(FIXTURES, "portrait.jpg"));
  await expect(page.getByText("Not saved yet")).toBeVisible();
  await page.getByLabel("Alt text (English)").fill("Portrait placeholder");
  await page.getByRole("button", { name: "Upload and save" }).click();
  await expectToast(page, "Profile photo updated.");
  await expect(page.getByText("Used 1×")).toBeVisible();
});

test("about section", async () => {
  await page.goto("/admin/about");
  await page
    .getByLabel("Personal statement")
    .first()
    .fill("I like turning messy requirements into simple, well-tested systems.");
  await page
    .locator('[id="translations.en.bio"]')
    .fill("I studied **Software Engineering** at KFUPM.\n\nThis is test content.");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expectToast(page, "About section saved.");
});

test("skills: add two skills with an icon", async () => {
  await page.goto("/admin/skills");
  for (const [name, icon] of [
    ["TypeScript", "typescript"],
    ["PostgreSQL", "postgresql"],
  ]) {
    await page.getByRole("button", { name: "Add skill" }).first().click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("textbox", { name: "Name", exact: true }).fill(name!);
    await dialog.getByLabel("Icon (optional)").fill(icon!);
    await dialog.getByRole("button", { name: "Save skill" }).click();
    await expectToast(page, "Skill added.");
  }
  await page.getByRole("button", { name: "Add skill" }).first().click();
  await page.getByRole("dialog").getByRole("textbox", { name: "Name", exact: true }).fill("Docker");
  await page.getByRole("dialog").getByLabel("Icon (optional)").fill("not-an-icon");
  await page.getByRole("dialog").getByRole("button", { name: "Save skill" }).click();
  await expect(page.getByRole("dialog").getByText(/No icon has this slug|Use the icon/)).toBeVisible();
  await page.keyboard.press("Escape");
});

test("projects: create, add images, publish", async ({ request }) => {
  await page.goto("/admin/projects/new");
  await page.getByLabel("Project name").first().fill("Campus Navigator");
  await expect(page.getByLabel("URL slug")).toHaveValue("campus-navigator");
  await page.getByLabel("Short description").first().fill("A test project used by the end-to-end suite.");
  await page.getByLabel("Category").selectOption({ label: "Web application" });
  const picker = page.getByLabel("Technologies and tools");
  await picker.fill("TypeScript");
  await picker.press("Enter");
  await picker.fill("Next.js");
  await picker.press("Enter");
  await expectToast(page, /Added “?"?Next.js/);
  await page.locator('[id="translations.en.overview"]').fill("An overview paragraph.");
  await page.locator('[id="translations.en.features"]').fill("- Search\n- Offline maps");
  await page.getByRole("button", { name: "Save draft" }).click();
  await expectToast(page, "Draft saved.");
  await expect(page).toHaveURL(/\/admin\/projects\/[0-9a-f-]{36}$/);

  // Draft projects are not public.
  await expectNotPublic(request, "/en/projects/campus-navigator", "Campus Navigator");

  const images = page.getByRole("list", { name: "Project images" }).getByRole("listitem");
  const upload = async (file: string, count: number) => {
    await page.getByLabel(/^New (screenshot|diagram)$/).setInputFiles(path.join(FIXTURES, file));
    await page.getByRole("button", { name: "Upload and save" }).click();
    await expect(images).toHaveCount(count);
    await expect(page.getByText("Not saved yet")).toHaveCount(0);
  };
  await upload("shot1.png", 1);
  await upload("shot2.png", 2);
  await page.getByLabel("Add as").selectOption("diagram");
  await upload("diagram.png", 3);
  await expect(page.getByText("Cover", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Save and publish" }).click();
  await expectToast(page, "Project saved and published.");
});

test("projects: the sample project can't be published", async () => {
  await page.goto("/admin/projects");
  const row = page.getByRole("listitem").filter({ hasText: "[Sample] Replace this project" });
  await row.getByRole("button", { name: /^Publish/ }).click();
  await expectToast(page, /Sample content can't be published/);
});

test("experience: planned roles can't have a past start date", async () => {
  await page.goto("/admin/experience/new");
  await page.getByLabel("Position or role").first().fill("Software Engineering Intern");
  await page.getByLabel("Company or organization").first().fill("Example Company");
  await page.getByLabel(/^Planned/).check();
  await page.getByLabel("Start date", { exact: true }).fill(past(10));
  await page.getByRole("button", { name: "Save and publish" }).click();
  await expect(page.getByText("This start date has passed")).toBeVisible();
  await page.getByLabel("Start date", { exact: true }).fill(future);
  await page.getByRole("button", { name: "Save and publish" }).click();
  await expectToast(page, "Saved and published.");

  await page.goto("/admin/experience/new");
  await page.getByLabel("Position or role").first().fill("Teaching Assistant");
  await page.getByLabel("Company or organization").first().fill("Test University");
  await page.getByLabel("Employment type").selectOption("teaching");
  await page.getByLabel(/^Completed/).check();
  await page.getByLabel("Start date", { exact: true }).fill(past(400));
  await page.getByLabel("End date", { exact: true }).fill(past(100));
  await page.getByRole("button", { name: "Save and publish" }).click();
  await expectToast(page, "Saved and published.");
});

test("education: publish the seeded KFUPM entry", async () => {
  await page.goto("/admin/education");
  await page
    .getByRole("link", { name: /Bachelor of Science/ })
    .first()
    .click();
  await page.getByLabel("Start date", { exact: true }).fill("2021-09-01");
  await page.getByLabel("Graduation date").fill(past(60));
  await page.getByRole("button", { name: "Save and publish" }).click();
  await expectToast(page, "Saved and published.");
});

test("CV upload and social links", async () => {
  await page.goto("/admin/files");
  await page.getByLabel("English CV").setInputFiles(path.join(FIXTURES, "cv.pdf"));
  await page.getByRole("button", { name: "Upload", exact: true }).click();
  await expectToast(page, "English CV updated.");

  await page.goto("/admin/contact");
  await page.getByRole("button", { name: "Add link" }).click();
  await page
    .getByRole("dialog")
    .getByRole("textbox", { name: "URL", exact: true })
    .fill("https://github.com/example");
  await page.getByRole("dialog").getByRole("button", { name: "Save link" }).click();
  await expectToast(page, "Link added.");
});

test("public site shows published content, in both languages", async () => {
  await page.goto("/en");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Faisal Al-Example");
  await expect(page.getByRole("heading", { name: "Campus Navigator" })).toBeVisible();
  await expect(page.getByText("[Sample] Replace this project")).toHaveCount(0);
  await expect(page.getByText("Upcoming", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Download CV" })).toBeVisible();
  await expect(page.getByText("Arabic (native), English (professional)")).toBeVisible();
  await expectAccessible(page);

  const cv = await page.request.get("/cv", { maxRedirects: 0 });
  expect(cv.status()).toBe(302);
  const file = await page.request.get(cv.headers()["location"]!);
  expect(file.headers()["content-type"]).toBe("application/pdf");

  await page.goto("/en/projects/campus-navigator");
  await expect(page.getByRole("heading", { level: 1, name: "Campus Navigator" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Architecture" })).toBeVisible();
  await expectAccessible(page);

  await page.goto("/ar");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("فيصل المثال");
  // Untranslated content falls back to English and is marked as English.
  await expect(page.locator('[lang="en"]').filter({ hasText: "Campus Navigator" }).first()).toBeVisible();
  await expectAccessible(page);
});

test("filters on the projects page", async () => {
  await page.goto("/en/projects?tech=Next.js");
  await expect(page.getByRole("heading", { name: "Campus Navigator" })).toBeVisible();
});

test("contact form delivers to the dashboard inbox", async () => {
  await page.goto("/en#contact");
  await page.getByLabel("Your name", { exact: true }).fill("Recruiter Test");
  await page.getByLabel("Email address", { exact: true }).fill("recruiter@example.com");
  await page.getByLabel("Message", { exact: true }).fill("Hello, we'd like to talk about a role.");
  await page.waitForTimeout(3_500); // the timing check rejects instant submissions
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByText("your message was sent")).toBeVisible();

  await page.goto("/admin/messages");
  await expect(page.getByText("Recruiter Test")).toBeVisible();
});

test("unpublishing removes a project from the public site immediately", async ({ request }) => {
  await page.goto("/admin/projects");
  const row = page.getByRole("listitem").filter({ hasText: "Campus Navigator" });
  await row.getByRole("button", { name: /^Unpublish/ }).click();
  await expectToast(page, /Project unpublished/);
  await expectNotPublic(request, "/en/projects/campus-navigator", "Campus Navigator");
  // ...and from the projects index.
  expect(await (await request.get("/en/projects")).text()).not.toContain("Campus Navigator");
  await row.getByRole("button", { name: /^Publish/ }).click();
  await expectToast(page, "Project published.");
});

test("backup: export downloads and the public cache can be refreshed", async () => {
  await page.goto("/admin/backup");
  const response = await page.request.get("/api/admin/export");
  expect(response.status()).toBe(200);
  const data = await response.json();
  expect(data.format).toBe("portfolio-cms-export");
  expect(JSON.stringify(data)).not.toContain("passwordHash");
  await page.getByRole("button", { name: "Refresh public site" }).click();
  await expectToast(page, "Public site refreshed");
});
