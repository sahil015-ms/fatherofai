import { db } from '@/lib/db';
import { isAdmin } from '@/lib/auth';
import { generateOutreach } from '@/lib/outreach';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
export async function POST(req) {
  if (!isAdmin(req)) return Response.json({ error: 'Wrong admin key' }, { status: 401 });
  try {
    const { id, type = 'service' } = await req.json();
    const d = db();
    const { data: lead, error } = await d.from('leads').select('*').eq('id', id).single();
    if (error || !lead) return Response.json({ error: 'Lead not found' }, { status: 404 });
    const context = type === 'course' && process.env.COURSE_PITCH ? process.env.COURSE_PITCH : undefined;
    const outreach = await generateOutreach(lead, context);
    await d.from('leads').update({ outreach }).eq('id', id);
    return Response.json({ outreach });
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }); }
}
