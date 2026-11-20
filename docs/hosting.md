# Hosting

The site is a Cloudflare Worker with static assets and no Worker script, built and deployed by Workers Builds ([ADR 0002](adr/0002-hosting-and-environments.md)). This page explains what the repository configures and the one-time setup in the Cloudflare dashboard.

## What the repository configures

| File | Role |
| --- | --- |
| [`wrangler.jsonc`](../wrangler.jsonc) | The Worker: its name, `sekoya-website`, the `dist/` folder it serves, URLs without a trailing slash, and the `workers.dev` and preview URLs |
| [`public/_headers`](../public/_headers) | The security headers on every response, a one-year cache for the fingerprinted files in `/_astro/`, and `X-Robots-Tag: noindex` on every `workers.dev` host |
| [`public/_redirects`](../public/_redirects) | The redirects, none yet |
| [`astro.config.mjs`](../astro.config.mjs) | The Content Security Policy (CSP), written into each page as a meta tag with the hashes of its inline code |

Astro copies `public/` into `dist/`, where Cloudflare reads `_headers` and `_redirects`; neither file is served.

The environments:

- **Production:** every push to `main` (each merged pull request) is built and deployed. Until launch it is served at `https://sekoya-website.<subdomain>.workers.dev`, where `<subdomain>` is the account's `workers.dev` subdomain.
- **Previews:** every other branch gets a preview build at `https://<preview>-sekoya-website.<subdomain>.workers.dev`, updated on each push. `<preview>` is the branch name with `/` replaced by `-`: `chore/4-cloudflare-workers` gave `chore-4-cloudflare-workers`. Each build reports a check on its commit, and Cloudflare posts a comment on the pull request with the preview's URL, updated with each build. Previews are public, but not indexed.
- **Local:** `npm run preview` serves `dist/` with `wrangler dev`, Cloudflare's local emulation, which applies the same configuration and headers files. The end-to-end tests run against it. No account is needed.

Wrangler, Cloudflare's command-line tool, is a development dependency at an exact version; Workers Builds uses the version in `package.json`. Workers Builds reads the Node.js version from `.node-version`.

Previews use Worker Previews: the `wrangler preview` command, which needs the `previews` block in `wrangler.jsonc`. It is in open beta (2026-11-20), so its commands may change; the fallback is in [ADR 0002](adr/0002-hosting-and-environments.md).

## Variables

No variable is needed to build or serve the site, and no secret is stored in the repository. Variables the site may need later are listed, names only, in [`.env.example`](../.env.example). Values the build reads are set in the Cloudflare dashboard under **Settings** > **Build** > **Build variables and secrets**; values the Worker reads at run time would go under **Settings** > **Variables and Secrets**.

## One-time setup in the Cloudflare dashboard

Done once by the owner, with the owner's Cloudflare account.

1. In the [Cloudflare dashboard](https://dash.cloudflare.com/), open **Workers & Pages**, then select **Create application**.
2. Choose **GitHub** and authorize the Cloudflare Workers & Pages GitHub App when asked. Give it access to **Only select repositories**: `sekoya-solutions/sekoya-website`.
3. Select the repository and set:
   - **Project name** (the Worker's name): `sekoya-website`. It must match `name` in `wrangler.jsonc`, or the build fails.
   - **Build command:** `npm run build`
   - **Deploy command:** `npx wrangler deploy` (the default)
   - **Preview command:** `npx wrangler preview` (the default)
   - **Enable Preview builds:** on; **Protect with Cloudflare Access:** off (previews are public, but not indexed)
   - Under **Advanced settings**, **Path:** `/` (the repository root); **API token:** let Cloudflare create one; no variable
4. Select **Deploy**. The first production build runs from `main`, which must already contain `wrangler.jsonc`; without it, Wrangler guesses a configuration and the build fails.
5. In the Worker's **Settings**, under **Builds**, check that **Production branch** is `main`. A retried build runs the same commit again; changing the branch takes effect on the next push.
6. Note the Worker's `workers.dev` URL, shown on the Worker's overview page.

## Checks

Once the branch's Cloudflare check has passed:

```sh
curl --head https://<preview>-sekoya-website.<subdomain>.workers.dev/
```

The response must include `x-robots-tag: noindex` and the security headers from `public/_headers`. The same request to the production `workers.dev` URL must also include `x-robots-tag: noindex`.
