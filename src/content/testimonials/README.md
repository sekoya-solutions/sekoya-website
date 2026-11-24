# Testimonials

One JSON file per testimonial, named `<slug>.json` in lowercase. While this folder holds none, the site shows no testimonials section, page, footer link or sitemap entry. The first file adds them all.

A testimonial is published only with its author's consent, and never invented. The schema is in [`../testimonial-schema.ts`](../testimonial-schema.ts):

```json
{
  "lang": "fr",
  "quote": "The author's own words, at most 512 characters.",
  "author": "First and last name",
  "role": "Role, in the quote's language",
  "company": "Company",
  "year": 2026,
  "linkedin": "https://www.linkedin.com/in/…",
  "consent": true,
  "featured": true,
  "translations": {
    "en": { "quote": "A translation the author approved.", "role": "Role" }
  }
}
```

- `lang` is the language the author wrote the quote in. Pages in that language show the original.
- `translations` is optional. Pages in another language show its translation, marked as translated, or else the original.
- `linkedin` and `featured` are optional. The home section shows up to three testimonials, the featured ones first, then the most recent by `year`.
