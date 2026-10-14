import { chat, parseJson } from './llm';

// Personalised WhatsApp pitch + 3 follow-ups. A human taps Send; nothing is automated on WhatsApp.
export async function generateOutreach(lead, context) {
  const out = await chat(
    'You write friendly, honest, low-pressure sales messages.',
    `We help people with: ${context || process.env.BUSINESS_CONTEXT}\nOur offer: ${process.env.OFFER || 'a free, no-obligation consultation'}\nWhatsApp community invite (optional): ${process.env.WHATSAPP_GROUP_INVITE || ''}\n\n` +
    `Lead: u/${lead.username} wrote on r/${lead.subreddit}: "${lead.title}"\nWhat they want: ${lead.intent_summary}\nLanguage: ${process.env.OUTREACH_LANGUAGE || 'English'}\n\n` +
    'Write a first WhatsApp message (pitch) and 3 follow-ups for days 2, 5 and 9. Each under 70 words, human, references what they asked for, one clear low-pressure call to action, no fake urgency, no made-up claims or numbers. The LAST follow-up must end with a polite opt-out line. Follow-ups must add value (a tip, a question, a quick offer), not just "checking in".\n' +
    'Return JSON: {"pitch":"","followups":[{"day":2,"text":""},{"day":5,"text":""},{"day":9,"text":""}]}',
    { json: true, max: 1500, temperature: 0.7 });
  const data = parseJson(out);
  return { pitch: String(data.pitch || '').trim(), followups: (data.followups || []).slice(0, 3).map((f) => ({ day: Number(f.day) || 0, text: String(f.text || '').trim() })) };
}
