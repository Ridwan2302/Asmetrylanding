# Asmetry Landing Page

A single self-contained `index.html` marketing page for the Asmetry app — no build step, deploy as static files anywhere (Vercel, Netlify, GitHub Pages, etc).

## CTA link

Every "Get the App" / "Download" button points to `unlock.html`, the payment page (nav, hero, download section, closing section all use the same link).

## Default language

All pages default to French on first visit (Côte d'Ivoire audience); a visitor's language choice is remembered in `localStorage` (`asmetry_landing_lang`) and used on every page.

## Payment flow

**`unlock.html`**, bilingual (EN/FR):

1. Shows the $1 (≈616 FCFA) one-time price with "free forever after $1" copy — the app stays free, this is a single one-time payment, not a subscription.
2. A "Payer" / "Pay" button opens the Wave payment link in a new tab, where the user actually pays (Wave is currently the only payment method offered).
3. There is no server-side payment verification (honor system, no API/backend involved). After the visitor has clicked the Wave button 4 times, the button is replaced with an "Ouvrir Asmetry" / "Open Asmetry" button linking to the real app (`https://asmetryapp.vercel.app/home`).

## Deploying to Vercel

1. Import this repo in the Vercel dashboard.
2. No build command / framework needed — leave it as a static site.
3. Deploy.
