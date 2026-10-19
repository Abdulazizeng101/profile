import localFont from "next/font/local";

/**
 * Self-hosted fonts (no request to Google at build or run time).
 * Instrument Sans is a variable font with weight 400–700 and width 75–100%;
 * the condensed widths drive the display type. IBM Plex Sans Arabic covers
 * Arabic text and pairs with it for the RTL version of the site.
 */
export const latin = localFont({
  variable: "--font-latin",
  display: "swap",
  src: [
    { path: "../fonts/instrument-sans-latin-standard-normal.woff2", weight: "400 700", style: "normal" },
    { path: "../fonts/instrument-sans-latin-standard-italic.woff2", weight: "400 700", style: "italic" },
  ],
  declarations: [{ prop: "font-stretch", value: "75% 100%" }],
  fallback: ["ui-sans-serif", "system-ui", "Segoe UI", "Helvetica Neue", "Arial", "sans-serif"],
});

export const arabic = localFont({
  variable: "--font-arabic",
  display: "swap",
  preload: false,
  src: [
    { path: "../fonts/ibm-plex-sans-arabic-arabic-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../fonts/ibm-plex-sans-arabic-arabic-500-normal.woff2", weight: "500", style: "normal" },
    { path: "../fonts/ibm-plex-sans-arabic-arabic-600-normal.woff2", weight: "600", style: "normal" },
    { path: "../fonts/ibm-plex-sans-arabic-arabic-700-normal.woff2", weight: "700", style: "normal" },
  ],
  fallback: ["Tahoma", "Segoe UI", "Geeza Pro", "sans-serif"],
});

export const fontVariables = `${latin.variable} ${arabic.variable}`;
