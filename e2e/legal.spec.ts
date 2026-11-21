import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { locales } from "../src/i18n/config";
import { pathOf } from "../src/i18n/routes";

// The legal notice (#16): the publisher and the host with their facts from
// src/content/company, each fact still to provide flagged as a placeholder;
// the privacy statement; and no section on the contact form while the form
// is off (ADR 0008). The section appears with the form (contact-form.spec.ts).

function json(path: string) {
  return JSON.parse(readFileSync(new URL(`../src/content/${path}`, import.meta.url), "utf8"));
}

const company = json("company/company.json");

/** French typography turns the space before : ; ? ! » and after « into a no-break space. */
function typeset(text: string, locale: string): string {
  return locale === "fr" ? text.replace(/ (?=[:;?!»])/g, " ").replace(/(?<=«) /g, " ") : text;
}

for (const locale of locales) {
  test(`the legal notice names the publisher and the host in ${locale}`, async ({ page }) => {
    const copy = json(`legal/${locale}.json`);
    await page.goto(pathOf("legal", locale));
    const publisher = page.locator('section[aria-labelledby="publisher-title"]');
    await expect(publisher).toContainText(company.name);
    await expect(publisher).toContainText(company.director);
    await expect(publisher).toContainText(typeset(copy.publisher.legalForm, locale));

    const host = page.locator('section[aria-labelledby="host-title"]');
    await expect(host).toContainText(company.host.name);
    await expect(host).toContainText(company.host.address);
    await expect(host.locator(`a[href="${company.host.website}"]`)).toHaveCount(1);
  });

  test(`the legal notice flags each missing fact as a placeholder in ${locale}`, async ({
    page,
  }) => {
    await page.goto(pathOf("legal", locale));
    const missing = [
      company.capital,
      company.address,
      company.registration,
      company.vat,
      company.phone,
      company.email,
      company.host.phone,
    ];
    await expect(page.locator(".legal-facts .placeholder")).toHaveText(missing);
  });

  test(`the legal notice states what the site does with data in ${locale}`, async ({ page }) => {
    const copy = json(`legal/${locale}.json`);
    await page.goto(pathOf("legal", locale));
    const privacy = page.locator("#privacy");
    await expect(privacy.locator(".legal-paragraph")).toHaveCount(copy.privacy.items.length);
    await expect(privacy.locator(".legal-paragraph").first()).toHaveText(
      typeset(copy.privacy.items[0].text, locale),
    );
    await expect(page.locator("#form")).toHaveCount(0);
  });
}
