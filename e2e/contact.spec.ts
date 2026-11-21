import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { locales } from "../src/i18n/config";
import { pathOf } from "../src/i18n/routes";

// The contact page (#16), as the site serves it: the form is off (ADR 0008),
// so the page shows the direct links only, with no form and no script of its
// own. Each address still to provide is a placeholder with no link. The form
// itself is tested on its own build (contact-form.spec.ts).

function json(path: string) {
  return JSON.parse(readFileSync(new URL(`../src/content/${path}`, import.meta.url), "utf8"));
}

const company = json("company/company.json");

/** French typography turns the space before : ; ? ! » and after « into a no-break space. */
function typeset(text: string, locale: string): string {
  return locale === "fr" ? text.replace(/ (?=[:;?!»])/g, " ").replace(/(?<=«) /g, " ") : text;
}

for (const locale of locales) {
  test(`the contact page shows its copy and its direct links in ${locale}`, async ({ page }) => {
    const copy = json(`contact/${locale}.json`);
    await page.goto(pathOf("contact", locale));
    const main = page.getByRole("main");
    await expect(main.getByRole("heading", { level: 1 })).toHaveText(typeset(copy.title, locale));
    await expect(main.locator(".channel")).toHaveCount(copy.channels.items.length);

    // The profiles that exist are links; the email and LinkedIn wait for their values.
    await expect(main.locator(`a.channel[href="${company.malt}"]`)).toHaveCount(1);
    await expect(main.locator(`a.channel[href="${company.github}"]`)).toHaveCount(1);
    await expect(main.locator('a[href^="mailto:"]')).toHaveCount(0);
    await expect(main.locator("div.channel .placeholder")).toHaveText([
      company.email,
      company.linkedin,
    ]);
  });

  test(`the contact page has no form and no script of its own in ${locale}`, async ({ page }) => {
    await page.goto(`${pathOf("contact", locale)}?sujet=audit`);
    await expect(page.locator("form")).toHaveCount(0);
    // Only the theme script of every page: nothing to preselect, so no subject script.
    const scripts = await page.locator("script").allTextContents();
    expect(scripts).toHaveLength(1);
    expect(scripts[0]).toContain("data-theme-toggle");
    // The quiz band appears with the quiz.
    await expect(page.locator(".contact-quiz")).toHaveCount(0);
  });
}

test("every page's footer links to the legal notice", async ({ page }) => {
  for (const locale of locales) {
    for (const key of ["home", "contact", "legal"] as const) {
      await page.goto(pathOf(key, locale));
      const link = page.getByRole("contentinfo").getByRole("link");
      await expect(link).toHaveAttribute("href", pathOf("legal", locale));
    }
  }
});
