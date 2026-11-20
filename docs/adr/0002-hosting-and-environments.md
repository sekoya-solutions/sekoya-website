# ADR 0002: Hosting and environments

- Status: Accepted
- Date: 2026-11-20
- Deciders: Owner

## Context

[ADR 0001](0001-framework-and-rendering.md) makes the site a folder of static files, a few dozen pages, well under 50 MB. It needs a host with a custom domain, HTTPS, a preview of each pull request, and the ability to set HTTP headers (security headers, long cache lifetimes for fingerprinted files) and redirects from files in the repository. The forces:

- **Commercial use.** The site presents the company's services, so a plan restricted to non-commercial use is excluded. Vercel is not considered: its free plan is non-commercial only, and the site needs nothing its paid plan sells.
- **Cost.** A static site needs no paid resources; the free plan must not stop the site because of ordinary use.
- **Deployment rhythm.** Every merged pull request deploys production, so a few dozen production deployments a month is normal during the build.
- **French legal notice.** The legal page names the host with its address.
- **Domain.** The production domain, `sekoyasolutions.com`, is already registered. Its Domain Name System (DNS) zone is hosted by its registrar, which also serves the company's email (mail exchange, SPF and DKIM records) and points the domain at an existing site builder page. Any change of DNS host must carry those email records over unchanged. The zone is not signed with DNSSEC, so changing nameservers needs no DNSSEC step.

Facts below come from each provider's own pages, read on 2026-11-20.

## Options considered

### Option A: Cloudflare Workers with static assets, free plan

- **Terms.** The [Self-Serve Subscription Agreement](https://www.cloudflare.com/terms/) and the [developer platform terms](https://www.cloudflare.com/service-specific-terms-developer-platform/) contain no restriction on commercial use. The free-service restriction that matters to shops (no card data collected) does not apply here.
- **Product.** Cloudflare now tells new projects to start with Workers rather than Pages; Pages is still available but no longer the recommended path ([Pages overview](https://developers.cloudflare.com/pages/)).
- **Limits.** Requests for static assets are free and unlimited, with no storage cost ([billing and limitations](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/)). Up to 20,000 files of at most 25 MiB each ([limits](https://developers.cloudflare.com/workers/platform/limits/)). No bandwidth limit is stated for the free plan.
- **Builds.** Workers Builds connects the GitHub repository: 3,000 build minutes a month, one build at a time, 20-minute timeout ([builds limits](https://developers.cloudflare.com/workers/ci-cd/builds/limits-and-pricing/)). Branches other than production get preview builds ([builds](https://developers.cloudflare.com/workers/ci-cd/builds/)).
- **Previews.** Public by default; the `workers.dev` preview URL sends `X-Robots-Tag: noindex` ([previews](https://developers.cloudflare.com/workers/previews/)).
- **Headers and redirects.** `_headers` and `_redirects` files in the output folder, as on Pages ([migration guide](https://developers.cloudflare.com/workers/static-assets/migration-guides/migrate-from-pages/)).
- **Domain.** A custom domain must have its nameservers on Cloudflare; a CNAME record at another DNS provider is not supported for Workers ([migration guide](https://developers.cloudflare.com/workers/static-assets/migration-guides/migrate-from-pages/)).
- **Legal notice.** Cloudflare, Inc., 101 Townsend St., San Francisco, CA 94107, United States ([agreement](https://www.cloudflare.com/terms/), section 20).

### Option B: Cloudflare Pages, free plan

- Same terms, network and legal entity as option A.
- 500 builds a month, one at a time, 20-minute timeout; 20,000 files ([Pages limits](https://developers.cloudflare.com/pages/platform/limits/)).
- Preview per branch with `X-Robots-Tag: noindex` by default, optionally restricted with Cloudflare Access ([preview deployments](https://developers.cloudflare.com/pages/configuration/preview-deployments/)).
- A custom domain can stay at another DNS provider through a CNAME record.
- Against it: Cloudflare advises new projects to use Workers instead, so Pages may receive fewer features and could later need a migration.

### Option C: Netlify, free plan

- **Terms.** The [Acceptable Use Policy](https://www.netlify.com/legal/acceptable-use-policy) and [Terms of Use](https://www.netlify.com/legal/terms-of-use/) contain no restriction on commercial use; the pricing page labels the free plan for individuals. The Self-Serve Subscription Agreement, which governs the services, is a PDF that could not be read and must be checked by hand.
- **Credits.** 300 credits a month. A production deployment costs 15 credits, bandwidth 20 credits per GB, requests 2 credits per 10,000 ([pricing](https://www.netlify.com/pricing/)). Deployments alone therefore allow at most 20 production deployments a month.
- **When credits run out,** every site of the team is paused with a "Site not available" page until the next billing cycle; the free plan cannot buy more credits ([billing FAQ](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/billing-faq-for-credit-based-plans.md)).
- **Previews.** Unlimited deploy previews per pull request, sent with `X-Robots-Tag: noindex` ([deploy previews](https://docs.netlify.com/site-deploys/deploy-previews/)). Password protection is a paid feature.
- **Headers and redirects.** `_headers` and `_redirects` files, or `netlify.toml` ([headers](https://docs.netlify.com/routing/headers/), [redirects](https://docs.netlify.com/routing/redirects/)).
- **Domain.** Custom domain with HTTPS on the free plan, with Netlify DNS or a CNAME at another provider ([domains](https://docs.netlify.com/domains-https/custom-domains/)).
- **Legal notice.** Netlify, Inc., 101 2nd Street, San Francisco, CA 94105, United States ([Terms of Use](https://www.netlify.com/legal/terms-of-use/), section 15).
- Against it: the deployment rhythm above would exhaust the credits within a month, taking the site offline; avoiding that means deploying production by hand or in batches.

### Option D: GitHub Pages

- No new account; free for public repositories.
- Against it: no custom HTTP headers (no security headers, a fixed short cache lifetime), no redirect rules, no pull request previews; GitHub's terms discourage using Pages mainly to run a business.

### Summary

| Criterion | A: Workers | B: Pages | C: Netlify | D: GitHub Pages |
| --- | --- | --- | --- | --- |
| Commercial use | Allowed | Allowed | Allowed (agreement to check) | Discouraged |
| Free-plan risk of going offline | None found for static files | None found for static files | Credits exhausted after about 20 deployments | None |
| Pull request previews, not indexed | Yes | Yes, can be restricted | Yes | No |
| Headers and redirects files | Yes | Yes | Yes | No |
| DNS | Must be on Cloudflare | Any provider | Any provider | Any provider |
| Provider's direction | Recommended path | Superseded by Workers | — | — |

## Decision

Chosen: **option A, Cloudflare Workers with static assets, on the free plan**, with the domain's DNS zone moved to Cloudflare's free DNS. The registration stays where it is; only the nameservers change. Option B stays the fallback if the zone must stay with the registrar: `www` can then point to Pages through a CNAME record, while the bare domain only redirects to `www` if the registrar's forwarding allows it.

What the move involves (facts read on 2026-11-20):

- **Cost.** Cloudflare's DNS is free on every plan; a free zone holds up to 200 records ([DNS FAQ](https://developers.cloudflare.com/dns/troubleshooting/faq/), [records](https://developers.cloudflare.com/dns/manage-dns-records/)). Only the full setup, where Cloudflare's nameservers answer for the whole domain, is available on the free plan ([zone setups](https://developers.cloudflare.com/dns/zone-setups/)).
- **Registrar.** The registrar allows custom nameservers, and switching back to its own nameservers is possible. Once switched, its DNS records no longer apply, the domain disconnects from the site builder site, and its domain forwarding stops ([nameservers and DNSSEC](https://support.squarespace.com/hc/en-us/articles/4404183898125-Nameservers-and-DNSSEC-for-Squarespace-managed-domains), [forwarding after migration](https://support.squarespace.com/hc/en-us/articles/46213669097101-Restore-domain-and-email-forwarding-after-migration)). No fee was found for custom nameservers.
- **Import.** Cloudflare scans the existing records, but the scan is not guaranteed to find them all; every record must be reviewed before switching ([full setup](https://developers.cloudflare.com/dns/zone-setups/full-setup/setup/)).
- **Not confirmed:** whether the email subscription's billing through the registrar is affected (only its DNS records are), and whether DNSSEC is on Cloudflare's free plan.

Moving the zone, with the owner, at launch so that the end of the site builder site does not matter:

1. List every record of the current zone from the registrar's dashboard (not only the public lookups); after Cloudflare's scan, compare record by record, the email records (MX, SPF, DKIM) first, and add the website records for the Worker.
2. Switch the nameservers at the registrar. During propagation (up to 48 hours) resolvers get the old or the new zone; with identical email records, email keeps flowing either way.
3. Check email in both directions and the records from outside. If anything is wrong, switch the registrar back to its own nameservers.
4. Optionally then: a DMARC record, and DNSSEC if available.

The environments:

- **Production** from `main`, built by Workers Builds after a merge, on the custom domain.
- **Previews** for every other branch, on `workers.dev` URLs, kept out of search engines by the `noindex` header.
- **Local:** `astro dev`, and the build served by `wrangler dev`, Cloudflare's local emulation; no account is needed to build or test. Wrangler, Cloudflare's command-line tool, is a development dependency of the project, never installed globally.
- **Headers:** security headers and cache lifetimes in `_headers`. The Content Security Policy is Astro's built-in `security.csp`, a meta tag in each page with the hashes of its inline scripts and styles, so no `'unsafe-inline'` is needed; `_headers` adds `frame-ancestors`, which a meta tag cannot carry.
- **Secrets:** none are needed to build. Optional values (such as the contact form address of [ADR 0008](0008-contact-and-privacy.md)) live in Cloudflare's environment variables, never in the repository; `.env.example` lists the names only.

## Consequences

Positive:

- Hosting costs nothing, with no usage meter on static files that could take the site offline.
- Headers and redirects are files in the repository, reviewed like code.

Negative:

- One more account for the owner, and the domain's DNS, email records included, managed at Cloudflare.
- A mistake while moving the zone could break email; the checklist above guards against it.
- Previews are public (not indexed); a pull request must never carry anything that may not be public, which the public repository already requires.
- The legal notice names a host in the United States.

Follow-up, with the owner's account:

- Create the Cloudflare account and the Worker from the repository, move the DNS zone as above, and connect the domain at launch.
