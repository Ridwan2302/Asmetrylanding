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

  // TEMPORARY — logs the full payload so we can see Jèko's real field names (phone number
  // included) from a live test payment. Remove once the phone-matching field is confirmed.
  console.log('Jèko webhook payload:', JSON.stringify(payload));

  if (payload.status !== 'success' || payload.transactionType !== 'payment') {
    return;
  }

  // Try the common places a payer's phone number could be in Jèko's payload. Once we see a
  // real payload (logged above), narrow this down to the exact field and drop the rest.
  const rawPhone =
    (payload.customer && payload.customer.phone) ||
    (payload.payer && payload.payer.phone) ||
    payload.phone ||
    payload.msisdn ||
    payload.payerPhone ||
    payload.customerPhone ||
    null;

  if (rawPhone) {
    const phone = normalizePhone(rawPhone);
    if (phone.length === 10) {
      try {
        await kvSet('paid:' + phone, payload.id || '1', 86400);
      } catch (err) {
        console.error('Failed to store paid phone in KV:', err);
      }
    }
  } else {
    console.error('No phone number field found in Jèko payload — check the logged payload above.');
  }

  const amountCents = Number(payload.amount && payload.amount.amount);
  const currency = (payload.amount && payload.amount.currency) || 'XOF';
  const value = amountCents / 100;

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
};
