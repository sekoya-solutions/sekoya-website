/**
 * The contact subject (ADR 0005): the offers and the quiz link to the contact
 * page with a subject in the `sujet` query parameter, such as
 * `/contact?sujet=audit`. This inline script preselects it in the form's
 * subject list, when the form is on, and adds it as the subject line of the
 * email link, once the address is known. It accepts only the page's own
 * subjects and ignores any other value; it stores and sends nothing. Without
 * JavaScript, the form keeps its default subject and the email link has none.
 *
 * The function is inlined by its source, so it must use nothing outside its
 * own body. The page's policy allows it by its hash (ADR 0002).
 */
import { createHash } from "node:crypto";
import { type ContactSubject, subjectParameter } from "../../content/contact-subjects";

/** The attribute of the form's subject list. */
export const subjectSelectAttribute = "data-contact-subject";

/** The attribute of an email link that gets the subject line. */
export const mailtoAttribute = "data-contact-mailto";

export function preselectSubject(
  parameter: string,
  subjects: Readonly<Record<string, string>>,
  selectAttribute: string,
  linkAttribute: string,
): void {
  const subject = new URLSearchParams(location.search).get(parameter);
  if (subject === null || !Object.hasOwn(subjects, subject)) return;
  const select = document.querySelector(`select[${selectAttribute}]`);
  if (select instanceof HTMLSelectElement) select.value = subject;
  for (const link of document.querySelectorAll(`a[${linkAttribute}]`)) {
    if (!(link instanceof HTMLAnchorElement)) continue;
    const address = link.href.split("?")[0];
    link.href = `${address}?subject=${encodeURIComponent(subjects[subject])}`;
  }
}

/** The inline script's source and its CSP hash, for a language's subject labels. */
export function contactSubjectScript(subjects: Readonly<Record<ContactSubject, string>>): {
  script: string;
  hash: `sha256-${string}`;
} {
  const args = [subjectParameter, subjects, subjectSelectAttribute, mailtoAttribute]
    .map((arg) => JSON.stringify(arg))
    .join(",");
  const script = `(${preselectSubject.toString()})(${args});`;
  return { script, hash: `sha256-${createHash("sha256").update(script).digest("base64")}` };
}
