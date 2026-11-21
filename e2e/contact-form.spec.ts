import { readFileSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { formTestAction, formTestPort } from "../scripts/form-test";
import { locales } from "../src/i18n/config";
import { pathOf } from "../src/i18n/routes";
import { honeypotName } from "../src/lib/contact-form";

// The contact form (#16, ADR 0008), on the test build where it is on
// (scripts/form-test.ts): labelled fields, the browser's own validation with
// each field's message linked to it, the honeypot out of reach, the consent
// checkbox, the post to the form's address (caught before it leaves the
// browser), the subject preselected by the `sujet` parameter (ADR 0005), and
// the legal notice's section on the form.

test.use({ baseURL: `http://localhost:${formTestPort}` });

function contactCopy(locale: string) {
  return JSON.parse(
    readFileSync(new URL(`../src/content/contact/${locale}.json`, import.meta.url), "utf8"),
  );
}

/** Records every request to the form's address, and answers it in place of the service. */
async function catchPosts(page: Page) {
  const posts: { method: string; body: URLSearchParams }[] = [];
  await page.route(`${new URL(formTestAction).origin}/**`, async (route) => {
    const request = route.request();
    posts.push({ method: request.method(), body: new URLSearchParams(request.postData() ?? "") });
    await route.fulfill({ status: 200, contentType: "text/plain", body: "Received" });
  });
  return posts;
}

for (const locale of locales) {
  test.describe(`in ${locale}`, () => {
    const copy = contactCopy(locale);
    const { form } = copy;

    test("every field has a label, and the required ones are required", async ({ page }) => {
      await page.goto(pathOf("contact", locale));
      const fields = [
        { label: form.name.label, required: true, autocomplete: "name" },
        { label: form.email.label, required: true, autocomplete: "email" },
        { label: form.company.label, required: false, autocomplete: "organization" },
        { label: form.message.label, required: true },
      ];
      for (const field of fields) {
        const control = page.getByLabel(field.label, { exact: false }).first();
        await expect(control).toBeVisible();
        expect(await control.evaluate((node: HTMLInputElement) => node.required)).toBe(
          field.required,
        );
        if (field.autocomplete !== undefined) {
          await expect(control).toHaveAttribute("autocomplete", field.autocomplete);
        }
      }
      await expect(page.getByRole("combobox", { name: form.subject.label })).toHaveValue("");
      const consent = page.getByRole("checkbox", { name: form.consent.label });
      await expect(consent).not.toBeChecked();
      expect(await consent.evaluate((node: HTMLInputElement) => node.required)).toBe(true);
      await expect(page.locator("form")).toHaveAttribute("method", "post");
      await expect(page.locator("form")).toHaveAttribute("action", formTestAction);
    });

    test("the honeypot is out of sight and out of reach", async ({ page }) => {
      await page.goto(pathOf("contact", locale));
      const trap = page.locator(`input[name="${honeypotName}"]`);
      await expect(trap).toHaveAttribute("tabindex", "-1");
      // Hidden from assistive technologies, and drawn in one pixel, clipped.
      await expect(page.getByRole("textbox", { name: form.honeypot })).toHaveCount(0);
      const box = await trap.evaluate((node) => node.closest("div")?.getBoundingClientRect());
      expect(box?.width).toBeLessThanOrEqual(1);
    });

    test("an empty form is not sent, and each message says what to fix", async ({ page }) => {
      const posts = await catchPosts(page);
      await page.goto(pathOf("contact", locale));
      const errors = page.locator(".field-error");
      // No message before the visitor has used the form.
      await expect(errors.first()).toBeHidden();
      await page.locator("form").getByRole("button").click();
      for (const key of ["name", "email", "subject", "message", "consent"]) {
        const message = page.locator(`#contact-${key}-error`);
        await expect(message).toBeVisible();
        await expect(page.locator(`#contact-${key}`)).toHaveAccessibleDescription(form[key].error);
      }
      await expect(page).toHaveURL(new RegExp(`${pathOf("contact", locale)}$`));
      expect(posts).toHaveLength(0);
    });

    test("a filled form posts its fields to the form's address", async ({ page }) => {
      const posts = await catchPosts(page);
      await page.goto(pathOf("contact", locale));
      await page.getByLabel(form.name.label, { exact: true }).fill("Ada Lovelace");
      await page.getByLabel(form.email.label, { exact: true }).fill("ada@example.com");
      await page.getByRole("combobox", { name: form.subject.label }).selectOption("audit");
      await page.getByLabel(form.message.label, { exact: true }).fill("Our releases are stuck.");
      await page.getByRole("checkbox", { name: form.consent.label }).check();
      // The message disappears once the field is valid.
      await expect(page.locator("#contact-email-error")).toBeHidden();
      await page.locator("form").getByRole("button").click();
      await expect(page.getByText("Received")).toBeVisible();
      expect(posts).toHaveLength(1);
      expect(posts[0].method).toBe("POST");
      expect(Object.fromEntries(posts[0].body)).toEqual({
        name: "Ada Lovelace",
        email: "ada@example.com",
        company: "",
        subject: "audit",
        message: "Our releases are stuck.",
        [honeypotName]: "",
        consent: "yes",
      });
    });

    test("the sujet parameter preselects a known subject only", async ({ page }) => {
      const subject = page.getByRole("combobox", { name: form.subject.label });
      await page.goto(`${pathOf("contact", locale)}?sujet=sauvetage`);
      await expect(subject).toHaveValue("sauvetage");
      await page.goto(`${pathOf("contact", locale)}?sujet=pricing`);
      await expect(subject).toHaveValue("");
    });

    test("the legal notice describes the form's processing", async ({ page }) => {
      await page.goto(pathOf("legal", locale));
      await expect(page.locator("#form .placeholder").first()).toBeVisible();
    });

    for (const theme of ["dark", "light"] as const) {
      test(`the form has no accessibility violations in the ${theme} theme`, async ({ page }) => {
        if (theme === "light") {
          await page.addInitScript(() => localStorage.setItem("theme", "light"));
        }
        await page.goto(pathOf("contact", locale));
        await page.locator("form").getByRole("button").click();
        const results = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
          .analyze();
        expect(results.violations).toEqual([]);
      });
    }
  });
}

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("the form still renders, with no subject preselected", async ({ page }) => {
    await page.goto(`${pathOf("contact", "fr")}?sujet=audit`);
    await expect(page.locator("#contact-subject")).toHaveValue("");
    await expect(page.locator("form")).toHaveAttribute("action", formTestAction);
  });
});
