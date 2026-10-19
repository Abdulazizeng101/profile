"use client";

import { useParams } from "next/navigation";
import { useEffect } from "react";

const copy = {
  en: {
    title: "Something went wrong",
    text: "The page couldn’t be loaded. Try again in a moment.",
    retry: "Try again",
  },
  ar: { title: "حدث خطأ", text: "تعذّر تحميل الصفحة. حاول مرة أخرى بعد قليل.", retry: "إعادة المحاولة" },
};

/** Visitors see a plain message; details stay in the server logs. */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const params = useParams<{ locale?: string }>();
  const t = params.locale === "ar" ? copy.ar : copy.en;

  useEffect(() => {
    console.error(error.digest ?? "client error");
  }, [error]);

  return (
    <div className="mx-auto grid max-w-[1200px] gap-4 px-5 py-28 md:px-8 md:py-40">
      <h1 className="heading text-3xl">{t.title}</h1>
      <p className="text-lg text-muted">{t.text}</p>
      <p className="pt-2">
        <button type="button" onClick={reset} className="link font-medium">
          {t.retry}
        </button>
      </p>
    </div>
  );
}
