# Asmetry Landing Page

A single self-contained `index.html` marketing page for the Asmetry app — no build step, deploy as static files anywhere (Vercel, Netlify, GitHub Pages, etc).

## CTA link

Every "Get the App" / "Download" button points to `unlock.html`, the $1 payment/unlock page (nav, hero, download section, closing section all use the same link).

## Payment & verification flow

`unlock.html` is a bilingual (EN/FR) page that:

1. Shows the $1 (≈616 FCFA) one-time price and a "Pay with Jèko" button linking to the Jèko payment link.
2. Asks the user to screenshot their Jèko payment confirmation and upload it.
3. Sends the screenshot to `api/verify-payment.js`, a Vercel serverless function that uses the Anthropic API (Claude Opus 5, vision + structured output) to check that the screenshot is a genuine, successful Jèko payment of ~616 FCFA to Asmetry.
4. On success, reveals the real app link (`https://asmetryapp.vercel.app/home`).

The serverless function requires an `ANTHROPIC_API_KEY` environment variable set in the Vercel project settings.

## Deploying to Vercel

1. Import this repo in the Vercel dashboard.
2. No build command needed for the static pages — `index.html` and `unlock.html` are served as-is. Vercel auto-detects `api/verify-payment.js` as a serverless function and installs `package.json` dependencies for it.
3. Set the `ANTHROPIC_API_KEY` environment variable in the Vercel project settings.
4. Deploy.
