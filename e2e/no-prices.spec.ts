import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";
import { normalizePath } from "../src/i18n/routes";

// No price anywhere on the site (#12): every page built in dist/ is opened,
// and its text, the text of its attributes a visitor or a search engine can
// read, and its metadata hold no currency symbol or code.

const dist = fileURLToPath(new URL("../dist/", import.meta.url));
const pages = readdirSync(dist, { recursive: true, encoding: "utf8" })
  .map((file) => file.replaceAll("\\", "/"))
  .filter((file) => file.endsWith(".html"))
  .map((file) => normalizePath(`/${file}`));

const currency = /[€$£¥₣]|\b(?:EUR|USD|GBP|CHF)\b/;

test("the build has pages to check", () => {
  expect(pages).toContain("/offres");
  expect(pages).toContain("/en/services");
});

for (const path of pages) {
  test(`${path} shows no price`, async ({ page }) => {
    await page.goto(path);
    const texts = await page.evaluate(() => {
      const copy = document.documentElement.cloneNode(true) as HTMLElement;
      for (const element of copy.querySelectorAll("script, style")) element.remove();
      const attributes = [...copy.querySelectorAll("[alt], [title], [aria-label], meta[content]")]
        .filter((element) => element.getAttribute("http-equiv") === null)
        .flatMap((element) =>
          ["alt", "title", "aria-label", "content"].map((name) => element.getAttribute(name) ?? ""),
        );
      return [copy.textContent ?? "", ...attributes];
    });
    for (const text of texts) expect(text).not.toMatch(currency);
  });
}
