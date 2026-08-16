const crypto = require('crypto');

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
