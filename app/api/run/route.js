import { tick } from '@/lib/engine';
import { isAdmin } from '@/lib/auth';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
export async function POST(req) {
  if (!isAdmin(req)) return Response.json({ error: 'Wrong admin key' }, { status: 401 });
  try { return Response.json(await tick()); } catch (e) { return Response.json({ error: e.message }, { status: 500 }); }
}
