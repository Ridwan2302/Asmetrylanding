function normalizePhone(value) {
  var digits = String(value || '').replace(/[^\d]/g, '');
  if (digits.length > 10) digits = digits.slice(-10);
  return digits;
}

module.exports = { normalizePhone };
