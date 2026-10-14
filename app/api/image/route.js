import { isAdmin } from '@/lib/auth';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
// Same-origin proxy for Pollinations images so the browser canvas is never "tainted" and can record video.
export async function GET(req) {
  if (!isAdmin(req)) return Response.json({ error: 'Wrong admin key' }, { status: 401 });
  const u = new URL(req.url);
  const prompt = (u.searchParams.get('prompt') || '').slice(0, 300);
  const clamp = (v, d) => Math.max(256, Math.min(1280, parseInt(v, 10) || d));
  if (!prompt) return Response.json({ error: 'prompt is required' }, { status: 400 });
  try {
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${clamp(u.searchParams.get('w'), 720)}&height=${clamp(u.searchParams.get('h'), 1280)}&nologo=true&seed=${Math.floor(Math.random() * 1e6)}`;
    const r = await fetch(url, { signal: AbortSignal.timeout(50000) });
    const ct = r.headers.get('content-type') || '';
    if (!r.ok || !ct.startsWith('image/')) return Response.json({ error: 'Image service is busy' }, { status: 502 });
    return new Response(await r.arrayBuffer(), { headers: { 'Content-Type': ct, 'Cache-Control': 'no-store' } });
  } catch (e) { return Response.json({ error: 'Image service timed out' }, { status: 504 }); }
}
