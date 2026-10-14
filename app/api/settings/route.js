import { db } from '@/lib/db';
import { isAdmin } from '@/lib/auth';
export const dynamic = 'force-dynamic';
const ALLOWED = ['auto_publish', 'daily_limit', 'lead_queries', 'auto_leads'];
export async function POST(req) {
  if (!isAdmin(req)) return Response.json({ error: 'Wrong admin key' }, { status: 401 });
  const body = await req.json();
  const rows = Object.entries(body).filter(([k]) => ALLOWED.includes(k)).map(([key, value]) => ({ key, value: String(value) }));
  const { error } = await db().from('settings').upsert(rows);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
