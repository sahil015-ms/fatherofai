export const isAdmin = (req) => !!process.env.ADMIN_KEY && req.headers.get('x-admin-key') === process.env.ADMIN_KEY;
export const isCron = (req) => {
  const s = process.env.CRON_SECRET;
  if (!s) return false;
  return req.headers.get('authorization') === `Bearer ${s}` || new URL(req.url).searchParams.get('key') === s;
};
