import { db } from '@/lib/db';
import { isAdmin } from '@/lib/auth';
import { AGENTS } from '@/lib/agents';
import { provider } from '@/lib/llm';
import { redditReady } from '@/lib/reddit';
export const dynamic = 'force-dynamic';
const H = { 'Cache-Control': 'no-store' };
export async function GET(req) {
  if (!isAdmin(req)) return Response.json({ error: 'Wrong admin key' }, { status: 401, headers: H });
  const d = db();
  const res = await Promise.all([
    d.from('settings').select('*'),
    d.from('board').select('*').order('id', { ascending: false }).limit(60),
    d.from('tasks').select('id,type,status,niche,error').order('id', { ascending: false }).limit(200),
    d.from('tasks').select('id,result,updated_at').eq('type', 'publish').eq('status', 'done').order('id', { ascending: false }).limit(20),
    d.from('tasks').select('id,result').eq('type', 'script').eq('status', 'done').order('id', { ascending: false }).limit(40),
  ]);
  const bad = res.find((r) => r.error);
  if (bad) return Response.json({ error: 'Database: ' + bad.error.message }, { status: 500, headers: H });
  const [s, b, a, p, sc] = res;
  const counts = {};
  for (const t of a.data || []) counts[t.status] = (counts[t.status] || 0) + 1;
  const reels = {};
  for (const r of sc.data || []) if (r.result?.title && !reels[r.result.title]) reels[r.result.title] = r.result.script;
  const articles = (p.data || []).map((x) => ({ ...x, reel: reels[x.result?.title] || null }));
  return Response.json({
    settings: Object.fromEntries((s.data || []).map((r) => [r.key, r.value])),
    board: (b.data || []).reverse(), counts, articles, agentCount: AGENTS.length,
    config: { provider: provider(), leadsReady: redditReady(), countryCode: process.env.DEFAULT_COUNTRY_CODE || '91' },
  }, { headers: H });
}
