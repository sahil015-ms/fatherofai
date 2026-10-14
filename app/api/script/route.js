import { isAdmin } from '@/lib/auth';
import { generateScript } from '@/lib/scripts';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
export async function POST(req) {
  if (!isAdmin(req)) return Response.json({ error: 'Wrong admin key' }, { status: 401 });
  try {
    const { kind, product, audience, offer } = await req.json();
    if (!product) return Response.json({ error: 'Product or topic is required' }, { status: 400 });
    return Response.json(await generateScript({ kind, product, audience, offer }));
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }); }
}
