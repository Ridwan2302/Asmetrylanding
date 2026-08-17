// Upstash KV is connected to this project (Production + Preview) — see api/_lib/kv.js.
const crypto = require('crypto');
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

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).send('Method not allowed');
    return;
  }

  if (!process.env.JEKO_WEBHOOK_SECRET) {
    console.error('JEKO_WEBHOOK_SECRET is not set in Vercel env vars');
    res.status(500).send('Webhook not configured');
    return;
  }

  const rawBody = await readRawBody(req);

  const signature = req.headers['jeko-signature'];
  const expected = crypto
    .createHmac('sha256', process.env.JEKO_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');

  if (!signature || signature !== expected) {
    res.status(401).send('Invalid signature');
    return;
  }

  // Respond fast (Jèko requires a 2xx within 30s) before doing any outbound work.
  res.status(200).send('OK');

  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch (e) {
    console.error('Invalid JSON from Jèko webhook');
    return;
  }

  if (payload.status !== 'success' || payload.transactionType !== 'payment') {
    return;
  }

  // Confirmed from a real Jèko payload: the payer's phone number is in counterpartIdentifier
  // (also duplicated in counterpartLabel).
  const rawPhone = payload.counterpartIdentifier || payload.counterpartLabel || null;

  const amountCents = Number(payload.amount && payload.amount.amount);
  const currency = (payload.amount && payload.amount.currency) || 'XOF';
  const value = amountCents / 100;

  if (rawPhone) {
    const phone = normalizePhone(rawPhone);
    if (phone.length === 10) {
      try {
        await kvSet(
          'paid:' + phone,
          JSON.stringify({ id: payload.id || '1', value: value, currency: currency }),
          86400
        );
      } catch (err) {
        console.error('Failed to store paid phone in KV:', err);
      }
    }
  } else {
    console.error('No phone number field found in Jèko payload — check the logged payload above.');
  }

  // Optional: server-side Meta Conversions API. Only fires if META_PIXEL_ID / META_CAPI_TOKEN
  // are configured — harmless no-op otherwise. The client-side Pixel fired from confirm.html
  // (after a real KV-verified payment) is the primary Purchase signal and doesn't depend on this.
  if (process.env.META_PIXEL_ID && process.env.META_CAPI_TOKEN) {
    try {
      await fetch(
        `https://graph.facebook.com/v20.0/${process.env.META_PIXEL_ID}/events?access_token=${process.env.META_CAPI_TOKEN}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            data: [
              {
                event_name: 'Purchase',
                event_time: Math.floor(new Date(payload.executedAt).getTime() / 1000),
                event_id: payload.id,
                action_source: 'website',
                custom_data: { value: value, currency: currency },
              },
            ],
          }),
        }
      );
    } catch (err) {
      console.error('Failed to send Purchase event to Meta:', err);
    }
  }
};
