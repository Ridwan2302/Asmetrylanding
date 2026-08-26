module.exports = async (req, res) => {
  // Country changes per visitor, never per deployment — never cache this.
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

  // Vercel's edge network sets this header on every request it proxies — no external
  // geolocation service, no API key, no extra network round-trip from the browser.
  const country = (req.headers['x-vercel-ip-country'] || '').toUpperCase();
  res.status(200).json({ country: country || null });
};
