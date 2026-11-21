/**
 * The subjects a visitor can write about, in the contact form's order. The
 * offers and the quiz link to the contact page with one of them in the
 * `sujet` query parameter (`/contact?sujet=audit`), which preselects it
 * (src/components/contact/contact-subject.ts, ADR 0005). Each has its label
 * in src/content/contact.
 */
export const contactSubjects = ["audit", "tech-lead", "sauvetage", "autre"] as const;

/** A subject of the contact page. */
export type ContactSubject = (typeof contactSubjects)[number];

/** The query parameter that preselects the subject, the same in every language. */
export const subjectParameter = "sujet";
