function creds() {
  const base = (process.env.WP_URL || '').replace(/\/$/, '');
  if (!base || !process.env.WP_USER || !process.env.WP_APP_PASSWORD) throw new Error('WordPress env vars are missing (WP_URL, WP_USER, WP_APP_PASSWORD)');
  return { base, auth: Buffer.from(`${process.env.WP_USER}:${process.env.WP_APP_PASSWORD}`).toString('base64') };
}

export async function wpUploadMedia({ bytes, contentType, filename }) {
  const { base, auth } = creds();
  const res = await fetch(`${base}/wp-json/wp/v2/media`, {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': contentType, 'Content-Disposition': `attachment; filename="${filename}"` },
    body: bytes,
    signal: AbortSignal.timeout(30000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || `WordPress media error ${res.status}`);
  return data.id;
}

export async function wpPost({ title, html, slug, excerpt, status, featuredMedia }) {
  const { base, auth } = creds();
  const body = { title, content: html, slug, excerpt, status };
  if (featuredMedia) body.featured_media = featuredMedia;
  const res = await fetch(`${base}/wp-json/wp/v2/posts`, {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || `WordPress error ${res.status}`);
  return { id: data.id, link: data.link, status: data.status };
}
