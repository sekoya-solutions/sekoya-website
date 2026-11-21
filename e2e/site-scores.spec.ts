import { expect, test } from "@playwright/test";
import { locales } from "../src/i18n/config";
import { dictionaries } from "../src/i18n/index";
import { pathOf } from "../src/i18n/routes";
import { numericDate } from "../src/lib/dates";
import { categories } from "../src/lib/lighthouse";
import { committedMeasurement } from "./site-measurement";

// The footer's measured scores (#21, ADR 0007): the figures and date of
// src/data/lighthouse.json, or, with no file, the measurement said pending
// and no number.

const measurement = committedMeasurement();
const repository = "https://github.com/sekoya-solutions/sekoya-website";

for (const locale of locales) {
  const t = dictionaries[locale].layout.scores;

  for (const key of ["home", "quiz"] as const) {
    test(`the footer shows the measured scores on ${key} in ${locale}`, async ({ page }) => {
      await page.goto(pathOf(key, locale));
      const footer = page.getByRole("contentinfo");
      await expect(footer).toContainText(t.title);

      if (measurement === undefined) {
        await expect(footer).toContainText(`${t.source} · ${t.pending}`);
        await expect(footer.locator(".site-score")).toHaveCount(0);
        await expect(footer.locator(".site-scores")).not.toContainText(/\d/);
      } else {
        await expect(footer.locator(`time[datetime="${measurement.measuredOn}"]`)).toHaveText(
          numericDate(measurement.measuredOn),
        );
        const list = footer.getByRole("list", { name: t.title });
        const items = list.getByRole("listitem");
        await expect(items).toHaveCount(categories.length);
        for (const [index, category] of categories.entries()) {
          const item = items.nth(index);
          await expect(item.locator(".site-score-value")).toHaveText(
            String(measurement.summary[category]),
          );
          await expect(item).toContainText(t.categoryNames[category]);
          await expect(item.locator(".site-score-arc")).toHaveAttribute(
            "stroke-dasharray",
            `${measurement.summary[category]} 100`,
          );
        }
      }

      await expect(
        footer.getByRole("link", { name: `${t.sourceCode} (${t.externalLink})` }),
      ).toHaveAttribute("href", repository);
    });
  }
}
