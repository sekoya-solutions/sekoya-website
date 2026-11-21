import { createHash } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { contactSubjectScript, mailtoAttribute, subjectSelectAttribute } from "./contact-subject";

// The inline script that preselects the contact subject (ADR 0005), run as
// the page runs it, from its source, on a stand-in for the page's DOM: the
// form's subject list and the email link. Its behaviour in the browser is
// covered by e2e/contact-form.spec.ts.

const subjects = {
  audit: "Audit technique",
  "tech-lead": "Mission Tech Lead",
  sauvetage: "Sauvetage de projet",
  autre: "Autre",
};

class FakeSelect {
  value = "";
}
class FakeAnchor {
  href: string;
  constructor(href: string) {
    this.href = href;
  }
}

/** Runs the inline script on a page at `search`, and returns what it changed. */
function run(search: string, { form = true, mailto = true } = {}) {
  const select = new FakeSelect();
  const link = new FakeAnchor("mailto:hello@example.com");
  vi.stubGlobal("location", { search });
  vi.stubGlobal("HTMLSelectElement", FakeSelect);
  vi.stubGlobal("HTMLAnchorElement", FakeAnchor);
  vi.stubGlobal("document", {
    querySelector: (selector: string) =>
      form && selector === `select[${subjectSelectAttribute}]` ? select : null,
    querySelectorAll: (selector: string) =>
      mailto && selector === `a[${mailtoAttribute}]` ? [link] : [],
  });
  new Function(contactSubjectScript(subjects).script)();
  return { subject: select.value, mailto: link.href };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("the contact subject script", () => {
  it("preselects a known subject and puts its label in the email's subject line", () => {
    expect(run("?sujet=sauvetage")).toEqual({
      subject: "sauvetage",
      mailto: "mailto:hello@example.com?subject=Sauvetage%20de%20projet",
    });
  });

  it("ignores an unknown subject, an inherited property name and a missing parameter", () => {
    const untouched = { subject: "", mailto: "mailto:hello@example.com" };
    expect(run("?sujet=pricing")).toEqual(untouched);
    expect(run("?sujet=toString")).toEqual(untouched);
    expect(run("")).toEqual(untouched);
  });

  it("works with only the form, or only the email link", () => {
    expect(run("?sujet=audit", { mailto: false }).subject).toBe("audit");
    expect(run("?sujet=audit", { form: false }).mailto).toBe(
      "mailto:hello@example.com?subject=Audit%20technique",
    );
  });

  it("is allowed by the hash of its exact source", () => {
    const { script, hash } = contactSubjectScript(subjects);
    expect(hash).toBe(`sha256-${createHash("sha256").update(script).digest("base64")}`);
  });
});
