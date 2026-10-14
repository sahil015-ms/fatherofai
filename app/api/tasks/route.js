import { db } from '@/lib/db';
import { isAdmin } from '@/lib/auth';
export const dynamic = 'force-dynamic';
const ALLOWED = ['seo', 'leadscan', 'leads', 'topic'];
export async function POST(req) {
  if (!isAdmin(req)) return Response.json({ error: 'Wrong admin key' }, { status: 401 });
  const { type, payload = {}, niche = null } = await req.json();
  if (!ALLOWED.includes(type)) return Response.json({ error: 'Unknown task type' }, { status: 400 });
  if (type === 'seo' && !payload.topic?.title) return Response.json({ error: 'Topic is required' }, { status: 400 });
  const { data, error } = await db().from('tasks').insert({ type, niche, payload }).select('id').single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ id: data.id });
}
