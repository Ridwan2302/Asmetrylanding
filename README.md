# Asmetry Landing Page

A single self-contained `index.html` marketing page for the Asmetry app — no build step, deploy as static files anywhere (Vercel, Netlify, GitHub Pages, etc).

## CTA link

Every "Get the App" / "Download" button currently points to:

```
https://verify-ruby.vercel.app/
```

To point them elsewhere, search `index.html` for that URL and replace it — all four buttons (nav, hero, download section, closing section) use the same link.

## Deploying to Vercel

1. Import this repo in the Vercel dashboard.
2. No build command / framework needed — leave it as a static site.
3. Deploy.
