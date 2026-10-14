'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/clientApi';
import { loadImage, renderVideo, wordsToSeconds } from '@/lib/videoRender';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const withSeconds = (scenes) => scenes.map((s) => ({ ...s, seconds: wordsToSeconds(s.voiceover) }));

export default function VideoStudio({ apiKey, initialScript }) {
  const [kind, setKind] = useState('reel');
  const [product, setProduct] = useState('');
  const [audience, setAudience] = useState('');
  const [offer, setOffer] = useState('');
  const [script, setScript] = useState(null);
  const [scenes, setScenes] = useState([]);
  const [audioFile, setAudioFile] = useState(null);
  const [lang, setLang] = useState('en-IN');
  const [status, setStatus] = useState('');
  const [progress, setProgress] = useState(0);
  const [video, setVideo] = useState(null);
  const [err, setErr] = useState('');
  const busy = !!status;

  useEffect(() => {
    if (initialScript) { setScript(initialScript); setScenes(withSeconds(initialScript.scenes || [])); setVideo(null); }
  }, [initialScript]);

  const generate = async () => {
    setErr(''); setVideo(null); setStatus('Writing script…');
    try {
      const data = await api('/api/script', apiKey, { kind, product, audience, offer });
      setScript(data); setScenes(withSeconds(data.scenes));
    } catch (e) { setErr(e.message); }
    setStatus('');
  };

  const edit = (i, field, value) => setScenes((all) => all.map((s, j) => (j === i ? { ...s, [field]: value, ...(field === 'voiceover' ? { seconds: wordsToSeconds(value) } : {}) } : s)));

  const preview = () => {
    if (!('speechSynthesis' in window)) return setErr('This browser has no voice preview.');
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(scenes.map((s) => s.voiceover).join(' '));
    u.lang = lang;
    window.speechSynthesis.speak(u);
  };

  const render = async () => {
    setErr(''); setVideo(null); setProgress(0);
    try {
      const ready = [];
      for (let i = 0; i < scenes.length; i++) {
        setStatus(`Getting image ${i + 1}/${scenes.length}…`);
        let img = null;
        try {
          const res = await fetch(`/api/image?prompt=${encodeURIComponent(scenes[i].image_prompt || scenes[i].voiceover)}&w=720&h=1280`, { headers: { 'x-admin-key': apiKey }, cache: 'no-store' });
          if (res.ok) img = await loadImage(URL.createObjectURL(await res.blob()));
        } catch { /* gradient fallback */ }
        ready.push({ ...scenes[i], img });
        await sleep(1200);
      }
      setStatus('Recording video… keep this screen open');
      const { blob, ext } = await renderVideo({ scenes: ready, audioFile, onProgress: setProgress });
      setVideo({ url: URL.createObjectURL(blob), ext });
    } catch (e) { setErr(e.message); }
    setStatus('');
  };

  return (
    <div>
      <div className="grid2">
        <div><label>Format</label>
          <select value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="reel">Instagram Reel</option><option value="short">YouTube Short</option><option value="ad">Video ad</option>
          </select></div>
        <div><label>Audience</label><input type="text" value={audience} onChange={(e) => setAudience(e.target.value)} placeholder="e.g. first-time home buyers" /></div>
      </div>
      <label>Product / topic</label>
      <input type="text" value={product} onChange={(e) => setProduct(e.target.value)} placeholder="What is the video about?" />
      <label>Offer (optional)</label>
      <input type="text" value={offer} onChange={(e) => setOffer(e.target.value)} placeholder="e.g. Free 15-minute consultation" />
      <p><button className="btn" onClick={generate} disabled={busy || !product.trim()}>🎬 Generate script</button></p>
      {err && <p className="err">{err}</p>}

      {script && (
        <div>
          <div className="card"><b>Hooks</b>{script.hooks.map((h, i) => <div key={i}>• {h}</div>)}
            <div style={{ marginTop: 8 }}><b>CTA:</b> {script.cta}</div>
            <small>{(script.hashtags || []).map((h) => `#${String(h).replace(/^#/, '')}`).join(' ')}</small></div>

          <h2 className="h2">Scenes</h2>
          {scenes.map((s, i) => (
            <div className="card" key={i}>
              <small>Scene {i + 1} · {s.seconds.toFixed(1)}s</small>
              <label>Caption on screen</label>
              <input type="text" value={s.caption || ''} onChange={(e) => edit(i, 'caption', e.target.value)} />
              <label>Voice-over</label>
              <textarea rows={2} value={s.voiceover} onChange={(e) => edit(i, 'voiceover', e.target.value)} />
              <label>Image idea</label>
              <input type="text" value={s.image_prompt || ''} onChange={(e) => edit(i, 'image_prompt', e.target.value)} />
            </div>
          ))}

          <h2 className="h2">Voice-over audio (optional)</h2>
          <p className="sub">The video is recorded in your browser. For a voice, upload a narration file (for example one made in your own TTS tool). Without a file the video is silent with captions.</p>
          <input type="file" accept="audio/*" onChange={(e) => setAudioFile(e.target.files?.[0] || null)} />
          <div className="row" style={{ marginTop: 10 }}>
            <select value={lang} onChange={(e) => setLang(e.target.value)} style={{ maxWidth: 150 }}>
              <option value="en-IN">English (IN)</option><option value="hi-IN">Hindi</option><option value="en-US">English (US)</option>
            </select>
            <button className="btn ghost" onClick={preview}>🔈 Preview voice</button>
          </div>
          <p className="sub">Preview uses your browser voice and is not recorded into the video.</p>

          <p><button className="btn" onClick={render} disabled={busy}>🎞️ Render 9:16 video</button></p>
          {busy && <p className="sub">{status}{progress > 0 && ` ${Math.round(progress * 100)}%`}</p>}
          {video && (
            <div>
              <video src={video.url} controls playsInline style={{ width: '100%', maxWidth: 360, borderRadius: 12 }} />
              <p><a className="btn" href={video.url} download={`promo.${video.ext}`}>⬇️ Download .{video.ext}</a></p>
              {video.ext === 'webm' && <p className="sub">This browser saves WebM. Instagram may need MP4: Chrome on desktop or Safari usually gives MP4, or convert the file with any free converter.</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
