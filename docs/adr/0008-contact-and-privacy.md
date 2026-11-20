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
3. **A serverless function of our own** to receive the form. Pros: no form service. Cons: a server-side component, secrets and abuse protection for a few messages a month.

## Decision

Proposed: **launch with option 1**, with option 2 built and switched off by default, so it can be turned on later by setting the variable, once the owner has chosen a service and the legal page names it.

## Consequences

Positive:

- At launch, the site collects no personal data at all.

Negative:

- Contact depends on the visitor's email client or on a third-party profile.

Follow-up:

- Before switching the form on: choose the service, add it to the legal page, and test the honeypot and the consent checkbox.
