import { chat, parseJson } from './llm';

export const KINDS = { reel: ['Instagram Reel', 40, 100], short: ['YouTube Short', 55, 140], ad: ['Video ad', 30, 75] };

export async function generateScript({ kind = 'reel', product, audience = '', offer = '' }) {
  const [label, seconds, words] = KINDS[kind] || KINDS.reel;
  const out = await chat(
    'You write short-form video scripts that sound spoken and human.',
    `Write a ${label} script of about ${seconds} seconds (voice-over about ${words} words).\nProduct/topic: ${product}\nAudience: ${audience || 'general'}\nOffer: ${offer || process.env.OFFER || 'none'}\nLanguage: ${process.env.ARTICLE_LANGUAGE || 'English'}\n\n` +
    'Use the PAS framework: Problem, Agitate, Solution. Start with a scroll-stopping hook in the first 2 seconds. Short sentences, simple words. No fake testimonials, no invented numbers or guarantees. End with one clear CTA.\n' +
    'Return JSON: {"hooks":["3 alternative hooks"],"script":"full voice-over","cta":"","hashtags":["5-8"],"scenes":[{"voiceover":"1-2 sentences","caption":"max 8 words shown on screen","image_prompt":"vivid English prompt for a vertical background image, no text, no logos"}]} with 5-7 scenes whose voiceovers together equal the script.',
    { json: true, max: 2500, temperature: 0.9 });
  const data = parseJson(out);
  const scenes = (data.scenes || []).filter((s) => s.voiceover);
  if (!scenes.length) throw new Error('The AI returned no scenes. Try again.');
  return { kind, hooks: data.hooks || [], script: data.script || '', cta: data.cta || '', hashtags: data.hashtags || [], scenes };
}
