/** The robots file (src/lib/sitemap.ts), built as dist/robots.txt. */
import type { APIRoute } from "astro";
import { robots } from "../lib/sitemap";

export const GET: APIRoute = ({ site }) => {
  if (site === undefined) throw new Error("astro.config.mjs must set `site`");
  return new Response(robots(site), { headers: { "Content-Type": "text/plain" } });
};
