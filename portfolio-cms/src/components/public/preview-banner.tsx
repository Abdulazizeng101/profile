import { draftMode } from "next/headers";

import { getDictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/config";
import { exitPreview } from "@/server/actions/preview";

export async function PreviewBanner({ locale }: { locale: Locale }) {
  const { isEnabled } = await draftMode();
  if (!isEnabled) return null;
  const dict = getDictionary(locale);
  return (
    <div role="status" className="border-b border-accent-line bg-accent-soft">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-3 px-5 py-2 text-sm md:px-8">
        <span>{dict.preview.banner}</span>
        <form action={exitPreview}>
          <input type="hidden" name="locale" value={locale} />
          <button type="submit" className="font-medium underline underline-offset-4 hover:no-underline">
            {dict.preview.exit}
          </button>
        </form>
      </div>
    </div>
  );
}
