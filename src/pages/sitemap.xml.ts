/** The sitemap (src/lib/sitemap.ts), built as dist/sitemap.xml. */
import type { APIRoute } from "astro";
import { sitemap } from "../lib/sitemap";

export const GET: APIRoute = ({ site }) => {
  if (site === undefined) throw new Error("astro.config.mjs must set `site`");
  return new Response(sitemap(site), { headers: { "Content-Type": "application/xml" } });
};
