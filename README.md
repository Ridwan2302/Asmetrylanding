# Asmetry Landing Page

A single self-contained `index.html` marketing page for the Asmetry app — no build step, deploy as static files anywhere (Vercel, Netlify, GitHub Pages, etc).

## CTA link

Every "Get the App" / "Download" button points to `unlock.html`, the payment page (nav, hero, download section, closing section all use the same link).

## Default language

All pages default to French on first visit (Côte d'Ivoire audience); a visitor's language choice is remembered in `localStorage` (`asmetry_landing_lang`) and used on every page.

## Payment & verification flow (two steps)

**`unlock.html`** — payment only, bilingual (EN/FR):

1. Shows the $1 (≈616 FCFA) one-time price with "free forever after $1" copy — the app stays free, this is a single one-time payment, not a subscription.
2. A "Go with Jèko" button opens the Jèko payment link in a new tab, where the user actually pays.
3. An "Already paid? Continue →" link sends the user to `verify.html`.

**`verify.html`** — verification only, bilingual (EN/FR):

1. Asks the user to screenshot their Jèko payment confirmation and upload it.
2. Sends the screenshot to `api/verify-payment.js`, a Vercel serverless function that uses the Anthropic API (Claude Opus 5, vision + structured output) to check that the screenshot is a genuine, successful Jèko payment of ~616 FCFA to Asmetry.
3. On success, reveals the real app link (`https://asmetryapp.vercel.app/home`).

The serverless function requires an `ANTHROPIC_API_KEY` environment variable set in the Vercel project settings.

## Deploying to Vercel

1. Import this repo in the Vercel dashboard.
2. No build command needed for the static pages — `index.html`, `unlock.html` and `verify.html` are served as-is. Vercel auto-detects `api/verify-payment.js` as a serverless function and installs `package.json` dependencies for it.
3. Set the `ANTHROPIC_API_KEY` environment variable in the Vercel project settings.
4. Deploy.
