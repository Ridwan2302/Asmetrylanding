// Receives Wave Business payment notifications forwarded by a notification-forwarding
// app (e.g. MacroDroid/Tasker watching the Wave Business app) and marks the payer's
// phone as paid, using the same paid:{phone} KV scheme as the Jèko webhook.
//
// Real notification text this parses (from the Wave Business app):
// "REMOTE payment received: RIDWAN ADESHOLA SHITTU (0546979919) paid 5F on 03/09/2026 21h47."
//
// Auth: since the forwarding app can only be configured with a static URL (no per-request
// signature like Jèko's HMAC), this uses a shared secret token in the query string instead —
// set it as the ?token= value in whatever URL you configure in the forwarding app.
const { normalizePhone } = require('../_lib/phone');
const { kvSet } = require('../_lib/kv');

module.exports.config = {
  api: { bodyParser: false },
};

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => { data += chunk; });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

// Scans the raw body for the payment pattern regardless of whether the forwarding app
// wraps it in JSON, form fields, or sends it as plain text — we don't need to know the
// exact payload shape, just that this text appears somewhere in it.
const PAYMENT_RE = /payment received:\s*(.+?)\s*\((\d{6,15})\)\s*paid\s*([\d][\d\s.,]*)\s*F(?:CFA)?\s*on\s*(\d{2}\/\d{2}\/\d{4})\s*(\d{1,2})h(\d{2})/i;

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).send('Method not allowed');
    return;
  }

  if (!process.env.WAVE_WEBHOOK_TOKEN) {
    console.error('WAVE_WEBHOOK_TOKEN is not set in Vercel env vars');
    res.status(500).send('Webhook not configured');
    return;
  }

  const token = (req.query && req.query.token) || '';
  if (token !== process.env.WAVE_WEBHOOK_TOKEN) {
    res.status(401).send('Invalid token');
    return;
  }

  const rawBody = await readRawBody(req);
  console.log('Wave notify raw body:', rawBody);

  const match = rawBody.match(PAYMENT_RE);
  if (!match) {
    console.error('Wave notify: no payment pattern found in body');
    res.status(200).send('OK');
    return;
  }

  const rawPhone = match[2];
  const rawAmount = match[3];
  const value = Number(rawAmount.replace(/[\s,]/g, ''));
  const currency = 'XOF';

  const phone = normalizePhone(rawPhone);
  console.log('Extracted phone from Wave notification:', rawPhone, '-> normalized:', phone, 'amount:', value);

  if (phone.length === 10) {
    try {
      await kvSet(
        'paid:' + phone,
        JSON.stringify({ id: 'wave-' + Date.now(), value: value, currency: currency }),
        86400
      );
      console.log('Stored in KV under key paid:' + phone);
    } catch (err) {
      console.error('Failed to store paid phone in KV:', err && err.message);
    }
  } else {
    console.error('Normalized phone has unexpected length:', phone, 'from raw:', rawPhone);
  }

  res.status(200).send('OK');
};
