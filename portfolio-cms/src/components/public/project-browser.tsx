"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";

type Item = { id: string; category: string | null; technologies: string[]; node: ReactNode };

type Labels = {
  filters: string;
  category: string;
  technology: string;
  allCategories: string;
  allTechnologies: string;
  clearFilters: string;
  noMatches: string;
  resultCount: string; // "{n}" is replaced
};

const selectClass =
  "h-10 w-full appearance-none rounded-[var(--radius)] border border-border-strong bg-bg px-3 pe-9 text-sm text-fg hover:border-[var(--muted)] focus-visible:border-accent focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-accent-soft";

/**
 * Filters server-rendered project cards by category and technology. Filters
 * live in the URL (?category=web&tech=TypeScript) so a filtered view can be
 * shared or bookmarked.
 */
export function ProjectBrowser({
  items,
  categories,
  technologies,
  labels,
}: {
  items: Item[];
  categories: { slug: string; name: string }[];
  technologies: string[];
  labels: Labels;
}) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const category = params.get("category") ?? "";
  const tech = params.get("tech") ?? "";

  const visible = items.filter(
    (item) =>
      (!category || item.category === category) &&
      (!tech || item.technologies.some((t) => t.toLowerCase() === tech.toLowerCase())),
  );

  function update(next: { category?: string; tech?: string }) {
    const search = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value) search.set(key, value);
      else search.delete(key);
    }
    const query = search.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  const filtered = Boolean(category || tech);

  return (
    <div className="grid gap-10">
      {categories.length > 1 || technologies.length > 1 ? (
        <form
          role="search"
          aria-label={labels.filters}
          className="flex flex-wrap items-end gap-4"
          onSubmit={(event) => event.preventDefault()}
        >
          {categories.length > 1 ? (
            <div className="grid min-w-48 gap-1.5">
              <label htmlFor="filter-category" className="text-xs text-subtle">
                {labels.category}
              </label>
              <select
                id="filter-category"
                className={selectClass}
                value={category}
                onChange={(event) => update({ category: event.target.value })}
              >
                <option value="">{labels.allCategories}</option>
                {categories.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          {technologies.length > 1 ? (
            <div className="grid min-w-48 gap-1.5">
              <label htmlFor="filter-tech" className="text-xs text-subtle">
                {labels.technology}
              </label>
              <select
                id="filter-tech"
                className={selectClass}
                value={technologies.find((t) => t.toLowerCase() === tech.toLowerCase()) ?? ""}
                onChange={(event) => update({ tech: event.target.value })}
              >
                <option value="">{labels.allTechnologies}</option>
                {technologies.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          {filtered ? (
            <button
              type="button"
              onClick={() => update({ category: "", tech: "" })}
              className="link h-10 text-sm font-medium"
            >
              {labels.clearFilters}
            </button>
          ) : null}
          <p aria-live="polite" className="ms-auto h-10 content-center text-sm text-subtle">
            {labels.resultCount.replace("{n}", String(visible.length))}
          </p>
        </form>
      ) : null}

      {visible.length > 0 ? (
        <div className="grid gap-x-8 gap-y-14 md:grid-cols-2">
          {visible.map((item) => (
            <div key={item.id}>{item.node}</div>
          ))}
        </div>
      ) : (
        <p className="text-muted">{labels.noMatches}</p>
      )}
    </div>
  );
}
