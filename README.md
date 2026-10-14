# Agent Room: Articles + Leads + Video (sab Vercel pe, ek dashboard)

## Kya-kya hai
- **Articles:** topic -> SEO plan -> section-by-section writing -> editor check -> WordPress (draft ya live).
  Meta description, FAQ + FAQ schema (JSON-LD), Pollinations featured image, aur har article ka Reel script.
- **Leads:** Reddit scan -> AI score 1-10 (8+ hot, 5-7 warm) -> Leads tab me filter, search, CSV export, status/phone edit,
  Gemini se pitch + 3 follow-ups, aur "Send via WhatsApp" (wa.me) button. Hot lead par Telegram alert (optional).
- **Video Studio:** script (Hook, PAS, CTA) -> scenes edit -> Pollinations images -> 9:16 video browser me hi record hota hai.
- **Meeting room:** bots ka chat log. **Run now** kaam ko step-by-step chalata rehta hai, **Stop** se ruk jata hai.

## Zaroori baatein
- **Gemini model:** `gemini-1.5-flash` Google ne deprecate kar diya. `GEMINI_MODEL` (default `gemini-2.5-flash`). Free limits badalti rehti hain, ai.google.dev dekho.
  `GEMINI_API_KEY` set hai to Gemini chalega, warna OpenRouter.
- **Video browser me banta hai** (Vercel pe ffmpeg nahi chalta). Video utni der me record hota hai jitni uski length hai, aur screen on + tab khula rakhna padta hai.
  Voice ke liye apni narration audio upload karo; bina audio ke video silent + captions wala banta hai.
  Chrome/Android aksar WebM deta hai; Instagram ko MP4 chahiye to free converter use karo.
- **Web research** (`RESEARCH_MODE=on`) sirf OpenRouter ke saath kaam karta hai. Gemini ke saath band rehta hai (warna facts bana deta).
- **WhatsApp:** har message aap khud Send dabate ho. Phir bhi unsolicited message report ho to ban ho sakta hai, isliye opt-out line aur kam volume.
- **Reddit API:** app banane ke liye reddit.com/prefs/apps (type: script). Reddit approval maang sakta hai; rules badalte rehte hain.
- WordPress ka FAQ schema (script tag) tabhi bachta hai jab WP user ke paas `unfiltered_html` ho (Administrator).

## Setup
1. Supabase SQL Editor me `supabase/schema.sql` run karo (dobara chalana safe hai).
2. Vercel Environment Variables: `.env.example` dekho. Naye zaroori: GEMINI_API_KEY, BUSINESS_CONTEXT, REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET, SUBREDDITS.
3. Redeploy. Site kholo -> ADMIN_KEY -> Settings (draft mode rakho) -> test karo.

## Test order
1. Articles tab: ek topic likho -> Meeting room me bots ka kaam dekho -> WordPress me draft check karo.
2. Leads tab: "Scan Reddit now" -> leads aane chahiye -> ek lead ka pitch banao.
3. Video Studio: script banao -> Render.
