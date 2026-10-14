'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { api } from '@/lib/clientApi';
import ArticlesTab from './components/ArticlesTab';
import LeadsTab from './components/LeadsTab';
import VideoStudio from './components/VideoStudio';

const COLORS = { manager: '#12263a', topic_finder: '#0f766e', researcher: '#0369a1', seo_researcher: '#4f46e5', writer: '#b45309', editor: '#be185d', publisher: '#15803d', lead_finder: '#7c3aed' };
const initials = (n = '') => n.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
const TABS = [['board', 'Meeting room'], ['articles', 'Articles'], ['leads', 'Leads'], ['video', 'Video Studio'], ['settings', 'Settings']];

export default function Home() {
  const [key, setKey] = useState('');
  const [input, setInput] = useState('');
  const [st, setSt] = useState(null);
  const [tab, setTab] = useState('board');
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(null);
  const [studioScript, setStudioScript] = useState(null);
  const stopRef = useRef(false);

  const load = useCallback(async (k) => {
    try { const d = await api('/api/state', k); setSt(d); setForm((f) => f || d.settings); }
    catch (e) { setErr(e.message); setSt(null); }
  }, []);

  useEffect(() => { const k = localStorage.getItem('adminKey'); if (k) { setKey(k); load(k); } }, [load]);
  useEffect(() => { if (!key) return; const t = setInterval(() => load(key), 10000); return () => clearInterval(t); }, [key, load]);

  const login = () => { localStorage.setItem('adminKey', input); setKey(input); load(input); };

  // Runs the agents step by step until nothing is pending (each call fits Vercel's time limit).
  const run = async () => {
    if (busy) return;
    setBusy(true); setErr(''); setMsg(''); stopRef.current = false;
    let total = 0;
    try {
      for (let i = 0; i < 80 && !stopRef.current; i++) {
        const r = await api('/api/run', key, {});
        total += r.ran || 0;
        setMsg(`Working… ${total} steps done`);
        await load(key);
        if (!r.pending) break;
      }
      setMsg(stopRef.current ? `Stopped after ${total} steps` : `Finished: ${total} steps done`);
    } catch (e) { setErr(e.message); }
    setBusy(false); load(key);
  };
  const save = async () => { try { await api('/api/settings', key, form); setErr(''); setMsg('Settings saved'); load(key); } catch (e) { setErr(e.message); } };
  const openInStudio = (script) => { setStudioScript(script); setTab('video'); };

  if (!st) return (
    <div className="wrap">
      <h1>Agent Room</h1>
      <p className="sub">Enter your admin key to open the dashboard.</p>
      <input type="password" placeholder="Admin key" value={input} onChange={(e) => setInput(e.target.value)} />
      {err && <p className="err">{err}</p>}
      <p><button className="btn" onClick={login}>Open dashboard</button></p>
    </div>
  );

  const c = st.counts || {};
  return (
    <div className="wrap">
      <div className="row">
        <div><h1>Agent Room</h1><p className="sub" style={{ margin: 0 }}>{st.agentCount} agents · AI: {st.config?.provider === 'gemini' ? 'Gemini' : 'OpenRouter'}</p></div>
        <button className="btn" onClick={busy ? () => { stopRef.current = true; } : run}>{busy ? 'Stop' : 'Run now'}</button>
      </div>
      {err && <p className="err">{err}</p>}
      {msg && <p className="sub">{msg}</p>}
      <div className="stats">
        <div className="stat"><b>{c.pending || 0}</b><span>Waiting</span></div>
        <div className="stat"><b>{c.done || 0}</b><span>Done</span></div>
        <div className="stat"><b>{(c.failed || 0) + (c.rejected || 0)}</b><span>Failed</span></div>
      </div>
      <div className="tabs">
        {TABS.map(([id, label]) => <button key={id} className={`tab ${tab === id ? 'on' : ''}`} onClick={() => setTab(id)}>{label}</button>)}
      </div>

      {tab === 'board' && (st.board.length ? st.board.map((m) => (
        <div className="msg" key={m.id}>
          <div className="av" style={{ background: COLORS[m.role] || '#555' }}>{initials(m.agent)}</div>
          <div className={`bub ${m.kind}`}><div className="who">{m.agent} · {new Date(m.created_at).toLocaleString()}</div><p>{m.content}</p></div>
        </div>
      )) : <p className="empty">No messages yet. Tap “Run now” to start the first meeting.</p>)}

      {tab === 'articles' && <ArticlesTab apiKey={key} st={st} onQueued={run} openInStudio={openInStudio} />}
      {tab === 'leads' && <LeadsTab apiKey={key} st={st} onQueued={run} />}
      {tab === 'video' && <VideoStudio apiKey={key} initialScript={studioScript} />}

      {tab === 'settings' && form && (
        <div>
          <label>Publishing mode</label>
          <button className="btn ghost" onClick={() => setForm({ ...form, auto_publish: form.auto_publish === 'true' ? 'false' : 'true' })}>
            {form.auto_publish === 'true' ? 'Auto-publish is ON' : 'Saving as draft (review first)'}
          </button>
          <label>Articles per day</label>
          <input type="number" min="1" max="20" value={form.daily_limit} onChange={(e) => setForm({ ...form, daily_limit: e.target.value })} />
          <label>Daily Reddit lead scan</label>
          <button className="btn ghost" onClick={() => setForm({ ...form, auto_leads: form.auto_leads === 'false' ? 'true' : 'false' })}>
            {form.auto_leads === 'false' ? 'Auto scan is OFF' : 'Auto scan is ON'}
          </button>
          <label>Google Places searches (one per line, optional)</label>
          <textarea rows={4} placeholder={'gyms in Jaipur\ncafes in Pune'} value={form.lead_queries} onChange={(e) => setForm({ ...form, lead_queries: e.target.value })} />
          <p><button className="btn" onClick={save}>Save settings</button></p>
        </div>
      )}
    </div>
  );
}
