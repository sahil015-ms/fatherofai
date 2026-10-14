import { db } from '@/lib/db';
import { isAdmin } from '@/lib/auth';
export const dynamic = 'force-dynamic';
const H = { 'Cache-Control': 'no-store' };
const EDITABLE = ['phone', 'status', 'notes'];
export async function GET(req) {
  if (!isAdmin(req)) return Response.json({ error: 'Wrong admin key' }, { status: 401, headers: H });
  const { data, error } = await db().from('leads').select('*').order('id', { ascending: false }).limit(500);
  if (error) return Response.json({ error: error.message }, { status: 500, headers: H });
  return Response.json({ leads: data || [] }, { headers: H });
}
export async function PATCH(req) {
  if (!isAdmin(req)) return Response.json({ error: 'Wrong admin key' }, { status: 401 });
  const { id, fields = {} } = await req.json();
  const update = Object.fromEntries(Object.entries(fields).filter(([k]) => EDITABLE.includes(k)));
  if (!id || !Object.keys(update).length) return Response.json({ error: 'Nothing to update' }, { status: 400 });
  const { error } = await db().from('leads').update(update).eq('id', id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
