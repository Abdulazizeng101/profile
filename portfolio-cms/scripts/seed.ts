/**
 * Seeds the database with the minimum the site needs to run.
 *
 *   pnpm db:seed
 *
 * Safe to run more than once: it only inserts rows that don't exist yet.
 * It never invents facts about you. Everything personal is left empty or
 * saved as a draft, and the one example project is flagged as sample content
 * that the server refuses to publish.
 */
import { count } from "drizzle-orm";

import { loadEnv } from "./lib/env";

loadEnv();

async function main() {
  const { db, closeDb } = await import("../src/server/db");
  const s = await import("../src/server/db/schema");

  await db.transaction(async (tx) => {
    /* Singletons ------------------------------------------------------------ */
    await tx.insert(s.profile).values({ id: 1 }).onConflictDoNothing();
    await tx
      .insert(s.profileTranslations)
      .values([
        {
          profileId: 1,
          locale: "en",
          headline: "Software Engineer",
          location: "Saudi Arabia",
        },
        {
          profileId: 1,
          locale: "ar",
          headline: "مهندس برمجيات",
          location: "المملكة العربية السعودية",
        },
      ])
      .onConflictDoNothing();

    await tx.insert(s.siteSettings).values({ id: 1 }).onConflictDoNothing();
    await tx
      .insert(s.siteSettingsTranslations)
      .values([
        {
          settingsId: 1,
          locale: "en",
          contactHeading: "Let’s talk",
          contactText:
            "I’m open to software engineering roles and interesting projects. Recruiters and teams are welcome to get in touch.",
        },
        {
          settingsId: 1,
          locale: "ar",
          contactHeading: "لنتحدث",
          contactText:
            "أرحّب بفرص العمل في هندسة البرمجيات والمشاريع المميزة. يسعدني تواصل مسؤولي التوظيف والفرق التقنية.",
        },
      ])
      .onConflictDoNothing();

    /* Skill categories (no skills: those are yours to add) -------------------- */
    const [{ value: categoryCount }] = await tx.select({ value: count() }).from(s.skillCategories);
    if (categoryCount === 0) {
      const categories: [string, string][] = [
        ["Programming Languages", "لغات البرمجة"],
        ["Frontend Development", "تطوير الواجهات الأمامية"],
        ["Backend Development", "تطوير الأنظمة الخلفية"],
        ["Databases", "قواعد البيانات"],
        ["Cloud Computing", "الحوسبة السحابية"],
        ["DevOps and Infrastructure", "DevOps والبنية التحتية"],
        ["Tools and Platforms", "الأدوات والمنصات"],
        ["Software Engineering Fundamentals", "أساسيات هندسة البرمجيات"],
      ];
      await tx
        .insert(s.skillCategories)
        .values(categories.map(([nameEn, nameAr], sortOrder) => ({ nameEn, nameAr, sortOrder })));
    }

    /* Project categories ---------------------------------------------------- */
    const [{ value: projectCategoryCount }] = await tx.select({ value: count() }).from(s.projectCategories);
    if (projectCategoryCount === 0) {
      const categories: [string, string, string][] = [
        ["web", "Web application", "تطبيق ويب"],
        ["mobile", "Mobile application", "تطبيق جوال"],
        ["backend", "Backend & APIs", "الأنظمة الخلفية وواجهات البرمجة"],
        ["data", "Data & machine learning", "البيانات وتعلّم الآلة"],
        ["tools", "Tools & systems", "الأدوات والأنظمة"],
        ["academic", "Academic project", "مشروع أكاديمي"],
      ];
      await tx
        .insert(s.projectCategories)
        .values(categories.map(([slug, nameEn, nameAr], sortOrder) => ({ slug, nameEn, nameAr, sortOrder })));
    }

    /* Education: KFUPM, saved as a draft until you confirm the details -------- */
    const [{ value: educationCount }] = await tx.select({ value: count() }).from(s.education);
    if (educationCount === 0) {
      const [kfupm] = await tx
        .insert(s.education)
        .values({ status: "draft", educationStatus: "graduated", url: "https://www.kfupm.edu.sa" })
        .returning({ id: s.education.id });
      await tx.insert(s.educationTranslations).values([
        {
          educationId: kfupm!.id,
          locale: "en",
          institution: "King Fahd University of Petroleum & Minerals (KFUPM)",
          degree: "Bachelor of Science",
          field: "Software Engineering",
          location: "Dhahran, Saudi Arabia",
        },
        {
          educationId: kfupm!.id,
          locale: "ar",
          institution: "جامعة الملك فهد للبترول والمعادن",
          degree: "بكالوريوس العلوم",
          field: "هندسة البرمجيات",
          location: "الظهران، المملكة العربية السعودية",
        },
      ]);
    }

    /* One sample project that shows what each field is for ------------------- */
    const [{ value: projectCount }] = await tx.select({ value: count() }).from(s.projects);
    if (projectCount === 0) {
      const [sample] = await tx
        .insert(s.projects)
        .values({ slug: "sample-project", status: "draft", isSample: true, stage: "completed" })
        .returning({ id: s.projects.id });
      await tx.insert(s.projectTranslations).values({
        projectId: sample!.id,
        locale: "en",
        title: "[Sample] Replace this project",
        summary: "Placeholder. One or two sentences that tell a recruiter what you built and why it matters.",
        overview:
          "Placeholder. Describe the project in a short paragraph: what it is, who it is for, and its current state.",
        problem: "Placeholder. What problem did this project solve, and for whom?",
        solution: "Placeholder. How does your solution work? Mention the key design decisions.",
        role: "Placeholder. What did *you* do? Team size, your responsibilities, what you owned.",
        features: "- Placeholder feature one\n- Placeholder feature two\n- Placeholder feature three",
        architecture:
          "Placeholder. Explain the main components and how they talk to each other. Upload an architecture diagram in the Images panel and mark it as a diagram.",
        challenges: "Placeholder. A real obstacle you hit, and how you solved it.",
      });
    }
  });

  console.log("Seed complete.");
  await closeDb();
}

main().catch((error) => {
  console.error("Seeding failed:", error);
  process.exit(1);
});
