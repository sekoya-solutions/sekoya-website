# ADR 0008: Contact and privacy

- Status: Proposed
- Date: 2026-11-20
- Deciders: Owner

## Context

Visitors must be able to reach the company, and the site promises them privacy. The forces:

- **No third-party script:** no analytics, no chat widget, no embedded form script. With no tracking cookie, no consent banner is needed.
- **The quiz stores and sends nothing** (no cookie, no `localStorage`, no network request).
- **French law:** the legal page names the publisher and the host, and says what personal data is collected and why. A form that sends messages through a third party makes that party a processor of the visitor's data, to be named on the legal page.
- **Static hosting:** there is no server of our own to receive a form ([ADR 0001](0001-framework-and-rendering.md)).

## Options considered

1. **Links only:** an email link (`mailto:`), the Malt profile, LinkedIn and GitHub. Pros: nothing collected by the site, nothing to maintain. Cons: some visitors have no email client set up.
2. **An optional plain HTML form** posting to a form service (such as Formspree or Web3Forms), with no script tag, a honeypot field and a consent checkbox. It is rendered only when the environment variable `PUBLIC_CONTACT_FORM_ACTION` is set. Pros: easier for visitors. Cons: a third party receives the messages, a spam vector, one more account; the legal page must name the service.
3. **A small Cloudflare Worker of our own** to receive the form, on the host chosen in [ADR 0002](0002-hosting-and-environments.md), with Turnstile, Cloudflare's free challenge, against spam. Pros: no separate form service; the form stays on the same site and account; a small showcase of server-side code. Cons, to settle when it is chosen:
   - A Worker cannot deliver email by itself: its email-sending feature is tied to Cloudflare's own email handling, which may clash with the company's existing email provider, otherwise an email service is needed, which brings back a third party.
   - Turnstile loads a script from Cloudflare's challenge domain on the contact page, an exception to the "no third-party script" rule and to that page's zero-JavaScript budget.
   - Each form post runs the Worker, within the free plan's daily request allowance.

## Decision

Proposed: **launch with option 1**, with option 2 built and switched off by default, so it can be turned on later by setting the variable, once the owner has chosen a service and the legal page names it.

## Consequences

Positive:

- At launch, the site collects no personal data at all.

Negative:

- Contact depends on the visitor's email client or on a third-party profile.

Follow-up:

- Before switching a form on: choose between a form service (option 2) and our own Worker with Turnstile (option 3) in a new record, add whoever receives the messages to the legal page, and test the spam protection and the consent checkbox.
