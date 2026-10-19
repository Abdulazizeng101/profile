import { cacheLife } from "next/cache";

/**
 * The copyright year. Cached for a day so the page stays prerendered while the
 * year still rolls over on its own each January.
 */
export async function CurrentYear() {
  "use cache";
  cacheLife("days");
  return <time>{new Date().getFullYear()}</time>;
}
