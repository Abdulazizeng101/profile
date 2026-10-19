import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import "../globals.css";

import { fontVariables } from "@/app/fonts";
import { PreviewBanner } from "@/components/public/preview-banner";
import { SiteFooter } from "@/components/public/site-footer";
import { SiteHeader } from "@/components/public/site-header";
import { getDictionary } from "@/lib/i18n";
import { dirOf, isLocale, locales, ogLocale, type Locale } from "@/lib/i18n/config";
import { getSiteData } from "@/server/content/site";
import { siteUrl } from "@/server/env";

export async function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0f1113" },
    { media: "(prefers-color-scheme: light)", color: "#f6f6f3" },
  ],
  colorScheme: "dark light",
};

async function resolveLocale(params: Promise<{ locale: string }>): Promise<Locale> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return locale;
}

export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const { settings, profile } = await getSiteData(locale);
  const dict = getDictionary(locale);
  const name = profile.fullName.text;
  const headline = profile.headline.text || dict.meta.defaultTitle;
  const title = settings.siteTitle.text || (name ? `${name} — ${headline}` : headline);
  const description = settings.metaDescription.text || profile.intro.text || undefined;
  const image = settings.ogImage ?? profile.photo;

  return {
    metadataBase: new URL(siteUrl()),
    title: { default: title, template: name ? `%s — ${name}` : "%s" },
    description,
    applicationName: name || undefined,
    authors: name ? [{ name }] : undefined,
    alternates: {
      canonical: `/${locale}`,
      languages: settings.arabicEnabled ? { en: "/en", ar: "/ar", "x-default": "/en" } : { en: "/en" },
    },
    robots: settings.allowIndexing ? { index: true, follow: true } : { index: false, follow: false },
    openGraph: {
      type: "profile",
      locale: ogLocale[locale],
      url: `/${locale}`,
      siteName: name || title,
      title,
      description,
      images: image
        ? [{ url: image.src, width: image.width, height: image.height, alt: image.alt || name }]
        : undefined,
    },
    twitter: { card: image ? "summary_large_image" : "summary", title, description },
    formatDetection: { telephone: false },
  };
}

function themeScript(defaultTheme: "dark" | "light" | "system") {
  // Runs before first paint: applies the visitor's saved theme, or the site default.
  return `(function(){try{var d=document.documentElement,s=localStorage.getItem("theme"),t=s==="light"||s==="dark"?s:"${defaultTheme}";if(t==="system")t=matchMedia("(prefers-color-scheme: light)").matches?"light":"dark";d.setAttribute("data-theme",t)}catch(e){}})()`;
}

export default async function PublicLayout({ children, params }: LayoutProps<"/[locale]">) {
  const locale = await resolveLocale(params);
  const data = await getSiteData(locale);
  if (locale !== "en" && !data.settings.arabicEnabled) notFound();
  const dict = getDictionary(locale);
  const initialTheme = data.settings.defaultTheme === "light" ? "light" : "dark";

  return (
    <html
      lang={locale}
      dir={dirOf(locale)}
      data-theme={initialTheme}
      data-accent={data.settings.accent}
      data-scroll-behavior="smooth"
      className={fontVariables}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript(data.settings.defaultTheme) }} />
      </head>
      <body className="flex min-h-dvh flex-col">
        <a
          href="#main"
          className="sr-only z-[60] rounded-[var(--radius)] bg-accent px-4 py-2 text-sm font-medium text-accent-fg focus:not-sr-only focus:fixed focus:start-4 focus:top-4"
        >
          {dict.nav.skipToContent}
        </a>
        <Suspense fallback={null}>
          <PreviewBanner locale={locale} />
        </Suspense>
        <SiteHeader
          locale={locale}
          name={data.profile.fullName.text}
          sections={data.sections}
          arabicEnabled={data.settings.arabicEnabled}
        />
        <main id="main" className="flex-1" tabIndex={-1}>
          {children}
        </main>
        <SiteFooter locale={locale} data={data} />
      </body>
    </html>
  );
}
