// Browser-side fetch helper for the dashboard.
export async function api(path, key, body, method) {
  const res = await fetch(path, {
    cache: 'no-store',
    method: method || (body ? 'POST' : 'GET'),
    headers: { 'x-admin-key': key, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
  return data;
}
