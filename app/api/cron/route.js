import { tick } from '@/lib/engine';
import { isCron } from '@/lib/auth';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
export async function GET(req) {
  if (!isCron(req)) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  return Response.json(await tick());
}
