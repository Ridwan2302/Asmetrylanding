const KV_URL = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;

async function kvSet(key, value, ttlSeconds) {
  if (!KV_URL || !KV_TOKEN) throw new Error('KV not configured (KV_REST_API_URL / KV_REST_API_TOKEN missing)');
  var parts = [KV_URL, 'set', encodeURIComponent(key), encodeURIComponent(value)];
  if (ttlSeconds) parts.push('EX', String(ttlSeconds));
  var res = await fetch(parts.join('/'), {
    headers: { Authorization: 'Bearer ' + KV_TOKEN },
  });
  if (!res.ok) throw new Error('KV set failed: ' + res.status);
  return res.json();
}

async function kvGet(key) {
  if (!KV_URL || !KV_TOKEN) throw new Error('KV not configured (KV_REST_API_URL / KV_REST_API_TOKEN missing)');
  var res = await fetch(KV_URL + '/get/' + encodeURIComponent(key), {
    headers: { Authorization: 'Bearer ' + KV_TOKEN },
  });
  if (!res.ok) throw new Error('KV get failed: ' + res.status);
  var data = await res.json();
  return data.result;
}

module.exports = { kvSet: kvSet, kvGet: kvGet };
