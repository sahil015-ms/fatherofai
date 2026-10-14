// Client-safe helpers for wa.me links.
export function normalizePhone(phone, countryCode = '91') {
  let d = String(phone || '').replace(/\D/g, '');
  if (d.length === 10 && countryCode) d = countryCode + d;
  return d;
}
export function waLink(phone, text, countryCode) {
  const d = normalizePhone(phone, countryCode);
  const base = d.length >= 11 ? `https://wa.me/${d}` : 'https://wa.me/';
  return `${base}?text=${encodeURIComponent(text)}`;
}
