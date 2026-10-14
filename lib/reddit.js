// Reddit lead sourcing. Uses app-only OAuth (REDDIT_CLIENT_ID/SECRET); falls back to the
// public JSON endpoint, which Reddit often blocks from cloud servers.
const UA = () => process.env.REDDIT_USER_AGENT || 'web:automation-magic:1.0 (by /u/your_username)';
let cached = { token: null, exp: 0 };

const list = (v, d = '') => (v || d).split(/[,\n]/).map((x) => x.trim()).filter(Boolean);
export const keywords = () => list(process.env.LEAD_KEYWORDS, 'looking for,need recommendation,where to buy,best service for,want to buy,anyone recommend');
export const subreddits = () => list(process.env.SUBREDDITS);
export const redditReady = () => !!(process.env.BUSINESS_CONTEXT && process.env.REDDIT_CLIENT_ID && process.env.REDDIT_CLIENT_SECRET);

async function getToken() {
  const id = process.env.REDDIT_CLIENT_ID, secret = process.env.REDDIT_CLIENT_SECRET;
  if (!id || !secret) return null;
  if (cached.token && Date.now() < cached.exp) return cached.token;
  const res = await fetch('https://www.reddit.com/api/v1/access_token', {
    method: 'POST',
    headers: { Authorization: 'Basic ' + Buffer.from(`${id}:${secret}`).toString('base64'), 'User-Agent': UA(), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials',
    signal: AbortSignal.timeout(20000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) throw new Error(`Reddit login failed (${res.status}). Check REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET.`);
  cached = { token: data.access_token, exp: Date.now() + Math.max(60, (data.expires_in || 3600) - 60) * 1000 };
  return cached.token;
}

async function redditGet(path, params) {
  const token = await getToken();
  const url = new URL((token ? 'https://oauth.reddit.com' : 'https://www.reddit.com') + path + (token ? '' : '.json'));
  for (const [k, v] of Object.entries({ ...params, raw_json: 1 })) url.searchParams.set(k, v);
  const res = await fetch(url, { headers: { 'User-Agent': UA(), ...(token ? { Authorization: `Bearer ${token}` } : {}) }, signal: AbortSignal.timeout(25000) });
  if (res.status === 401 || res.status === 403 || res.status === 429) throw new Error(`Reddit refused the request (${res.status}). Add REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET.`);
  if (!res.ok) throw new Error(`Reddit error ${res.status}`);
  return res.json();
}

const clean = (d, kind) => ({
  id: `${kind}_${d.id}`, author: d.author || '', subreddit: d.subreddit || '',
  title: String(d.title || d.link_title || '(comment)').trim(),
  text: String(d.selftext ?? d.body ?? '').trim().slice(0, 900),
  url: `https://www.reddit.com${d.permalink}`, created: Number(d.created_utc) || 0,
});

export async function fetchCandidates() {
  const subs = subreddits().join('+') || 'all';
  const kws = keywords();
  const query = kws.map((k) => `"${k}"`).join(' OR ');
  const found = await redditGet(`/r/${subs}/search`, { q: query, restrict_sr: subreddits().length ? 1 : 0, sort: 'new', t: 'day', limit: 50 });
  let items = (found.data?.children || []).map((c) => clean(c.data, 't3'));
  if (process.env.INCLUDE_COMMENTS !== 'false' && process.env.REDDIT_CLIENT_ID) {
    try {
      const com = await redditGet(`/r/${subs}/comments`, { limit: 100 });
      items = items.concat((com.data?.children || []).map((c) => clean(c.data, 't1')));
    } catch { /* comments are a bonus */ }
  }
  const maxAge = Number(process.env.LEAD_MAX_AGE_HOURS || 48) * 3600;
  const cutoff = Date.now() / 1000 - maxAge;
  const out = [];
  for (const it of items) {
    const low = `${it.title} ${it.text}`.toLowerCase();
    const keyword = kws.find((k) => low.includes(k.toLowerCase()));
    if (keyword && it.created >= cutoff && !['[deleted]', 'AutoModerator', ''].includes(it.author)) out.push({ ...it, keyword });
  }
  return out;
}
