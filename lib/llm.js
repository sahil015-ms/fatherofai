// One entry point for AI calls. GEMINI_API_KEY set -> Google Gemini (free tier friendly),
// otherwise OpenRouter. Retries, spacing and timeouts are handled here.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let lastCall = 0;

export const provider = () => (process.env.GEMINI_API_KEY ? 'gemini' : 'openrouter');

async function callGemini(system, user, { max, temperature, json }) {
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const minDelay = Number(process.env.GEMINI_MIN_DELAY_MS ?? 6000);
  let thinking = true;
  for (let attempt = 1; attempt <= 3; attempt++) {
    const wait = minDelay - (Date.now() - lastCall);
    if (wait > 0) await sleep(wait);
    const generationConfig = { temperature, maxOutputTokens: max };
    if (json) generationConfig.responseMimeType = 'application/json';
    if (thinking) generationConfig.thinkingConfig = { thinkingBudget: 0 };
    let res;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'x-goog-api-key': process.env.GEMINI_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: user }] }], systemInstruction: { parts: [{ text: system }] }, generationConfig }),
        signal: AbortSignal.timeout(40000),
      });
    } catch (e) {
      lastCall = Date.now();
      if (attempt === 3) throw new Error(`Gemini network error: ${e.message}`);
      await sleep(3000);
      continue;
    }
    lastCall = Date.now();
    if (res.ok) {
      const data = await res.json();
      const cand = data.candidates?.[0];
      const text = (cand?.content?.parts || []).filter((p) => !p.thought).map((p) => p.text || '').join('').trim();
      if (!text) throw new Error(`Gemini returned an empty answer (${cand?.finishReason || data.promptFeedback?.blockReason || 'unknown'})`);
      return text;
    }
    const body = await res.text();
    if (res.status === 400 && thinking && /thinking/i.test(body)) { thinking = false; continue; }
    if (res.status === 404) throw new Error(`Gemini model "${model}" not found. Set GEMINI_MODEL to a current model.`);
    if (res.status === 401 || res.status === 403) throw new Error('Gemini rejected the API key. Check GEMINI_API_KEY.');
    if (res.status === 429) {
      if (/per ?day/i.test(body)) throw new Error('Gemini free daily quota is finished. Try again tomorrow.');
      await sleep(Math.min(12000, 5000 * attempt));
      continue;
    }
    if (res.status >= 500) { await sleep(3000 * attempt); continue; }
    throw new Error(`Gemini ${res.status}: ${body.slice(0, 200)}`);
  }
  throw new Error('Gemini is rate-limiting right now. Run again in a minute.');
}

async function callOpenRouter(system, user, { max, temperature, web }) {
  const base = process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini';
  const model = web && !base.endsWith(':online') ? `${base}:online` : base;
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages: [{ role: 'system', content: system }, { role: 'user', content: user }], temperature, max_tokens: max }),
    signal: AbortSignal.timeout(Number(process.env.LLM_TIMEOUT_MS) || 45000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.message || `LLM error ${res.status}`);
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error('LLM returned an empty response');
  return text.trim();
}

export async function chat(system, user, { max = 3500, temperature = 0.7, web = false, json = false } = {}) {
  return provider() === 'gemini'
    ? callGemini(system, user, { max, temperature, json })
    : callOpenRouter(system, user, { max, temperature, web });
}

export function parseJson(text) {
  const t = text.replace(/^```(?:json)?\s*|```\s*$/gi, '').trim();
  try { return JSON.parse(t); } catch { /* fall through */ }
  const s = t.indexOf('{'), e = t.lastIndexOf('}');
  if (s < 0 || e < s) throw new Error('No JSON in model output');
  return JSON.parse(t.slice(s, e + 1));
}
