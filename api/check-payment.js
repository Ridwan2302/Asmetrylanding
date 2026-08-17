const { normalizePhone } = require('./_lib/phone');
const { kvGet } = require('./_lib/kv');

module.exports = async (req, res) => {
  // This is polled repeatedly to check for a fresh payment — never let it be cached.
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

  const phoneRaw = (req.query && req.query.phone) || '';
  const phone = normalizePhone(phoneRaw);

  if (phone.length !== 10) {
    res.status(400).json({ error: 'invalid phone' });
    return;
  }

  try {
    const result = await kvGet('paid:' + phone);
    if (!result) {
      res.status(200).json({ paid: false });
      return;
    }
    let details = {};
    try {
      details = JSON.parse(result);
    } catch (e) {
      // Older/plain values stored before this format existed — still counts as paid.
    }
    res.status(200).json({ paid: true, value: details.value, currency: details.currency });
  } catch (err) {
    console.error('check-payment KV error:', err);
    res.status(200).json({ paid: false });
  }
};
