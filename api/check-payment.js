const { normalizePhone } = require('./_lib/phone');
const { kvGet } = require('./_lib/kv');

module.exports = async (req, res) => {
  const phoneRaw = (req.query && req.query.phone) || '';
  const phone = normalizePhone(phoneRaw);

  if (phone.length !== 10) {
    res.status(400).json({ error: 'invalid phone' });
    return;
  }

  try {
    const result = await kvGet('paid:' + phone);
    res.status(200).json({ paid: !!result });
  } catch (err) {
    console.error('check-payment KV error:', err);
    res.status(200).json({ paid: false });
  }
};
