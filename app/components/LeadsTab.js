'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/clientApi';
import { waLink } from '@/lib/phone';

const STATUSES = ['new', 'contacted', 'replied', 'won', 'lost'];
const ICON = { hot: '🔥', warm: '🟠', cold: '🧊' };
const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

export default function LeadsTab({ apiKey, st, onQueued }) {
  const [leads, setLeads] = useState([]);
  const [err, setErr] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [cats, setCats] = useState(['hot', 'warm', 'cold']);
  const [statuses, setStatuses] = useState(STATUSES);
  const [minScore, setMinScore] = useState(1);
  const [q, setQ] = useState('');
  const cc = st.config?.countryCode;

  const load = useCallback(async () => {
    try { setLeads((await api('/api/leads', apiKey)).leads); setErr(''); } catch (e) { setErr(e.message); }
  }, [apiKey]);
  useEffect(() => { load(); }, [load, st.counts?.done]);

  const patch = (id, fields) => setLeads((all) => all.map((l) => (l.id === id ? { ...l, ...fields } : l)));
  const save = async (l) => {
    try { await api('/api/leads', apiKey, { id: l.id, fields: { phone: l.phone || '', status: l.status || 'new', notes: l.notes || '' } }, 'PATCH'); } catch (e) { setErr(e.message); }
  };
  const generate = async (l, type) => {
    setBusyId(l.id); setErr('');
    try { patch(l.id, { outreach: (await api('/api/outreach', apiKey, { id: l.id, type })).outreach }); } catch (e) { setErr(e.message); }
    setBusyId(null);
  };
  const scan = async () => {
    setErr('');
    try { await api('/api/tasks', apiKey, { type: 'leadscan' }); onQueued(); } catch (e) { setErr(e.message); }
  };

  const view = useMemo(() => leads.filter((l) => {
    const cat = l.category || (l.source === 'places' ? 'cold' : 'cold');
    if (!cats.includes(cat)) return false;
    if (!statuses.includes(l.status || 'new')) return false;
    if ((l.score || 0) < minScore && l.source !== 'places') return false;
    if (q && !`${l.title || l.name} ${l.intent_summary || ''} ${l.username || ''}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  }), [leads, cats, statuses, minScore, q]);

  const exportCsv = () => {
    const cols = ['created_at', 'source', 'name', 'username', 'subreddit', 'title', 'url', 'phone', 'website', 'score', 'category', 'status', 'intent_summary', 'keyword', 'notes'];
    const csv = [cols.join(','), ...view.map((l) => cols.map((c) => csvCell(l[c])).join(','))].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'leads.csv'; a.click();
  };
  const toggle = (list, setList, v) => setList(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const count = (cat) => leads.filter((l) => l.category === cat).length;

  return (
    <div>
      {!st.config?.leadsReady && <p className="err">Reddit leads are off. Add BUSINESS_CONTEXT, REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET in Vercel, then redeploy.</p>}
      <div className="stats">
        <div className="stat"><b>{leads.length}</b><span>Total</span></div>
        <div className="stat"><b>{count('hot')}</b><span>🔥 Hot</span></div>
        <div className="stat"><b>{count('warm')}</b><span>🟠 Warm</span></div>
      </div>
      <div className="row">
        <button className="btn" onClick={scan}>🔎 Scan Reddit now</button>
        <button className="btn ghost" onClick={exportCsv}>⬇️ Export CSV</button>
      </div>
      {err && <p className="err">{err}</p>}

      <div className="chips">
        {['hot', 'warm', 'cold'].map((c) => <button key={c} className={`tab ${cats.includes(c) ? 'on' : ''}`} onClick={() => toggle(cats, setCats, c)}>{ICON[c]} {c}</button>)}
        {STATUSES.map((s) => <button key={s} className={`tab ${statuses.includes(s) ? 'on' : ''}`} onClick={() => toggle(statuses, setStatuses, s)}>{s}</button>)}
      </div>
      <div className="grid2">
        <div><label>Min score: {minScore}</label><input type="range" min="1" max="10" value={minScore} onChange={(e) => setMinScore(Number(e.target.value))} /></div>
        <div><label>Search</label><input type="text" value={q} onChange={(e) => setQ(e.target.value)} placeholder="title, summary, user" /></div>
      </div>
      <p className="sub">Reddit people have no phone number. Add one only if they shared it; otherwise the WhatsApp button opens a pick-a-contact chat. You tap Send yourself, nothing is automated.</p>

      {view.length ? view.map((l) => (
        <details className="card" key={l.id}>
          <summary>
            <span className={`badge ${l.category || 'cold'}`}>{l.score ? `${l.score}/10` : '—'}</span>{' '}
            {(l.title || l.name || '').slice(0, 80)}
          </summary>
          <p>{l.intent_summary}</p>
          <small>{l.username ? `u/${l.username} · r/${l.subreddit} · ` : ''}{l.keyword}{l.address && !l.url ? l.address : ''}</small><br />
          {l.url && <a href={l.url} target="_blank" rel="noreferrer">Open post</a>}
          {l.website && <> <a href={l.website} target="_blank" rel="noreferrer">Website</a></>}
          <div className="grid2">
            <div><label>Phone (with country code)</label><input type="text" value={l.phone || ''} onChange={(e) => patch(l.id, { phone: e.target.value })} /></div>
            <div><label>Status</label><select value={l.status || 'new'} onChange={(e) => patch(l.id, { status: e.target.value })}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select></div>
          </div>
          <p><button className="btn small" onClick={() => save(l)}>💾 Save</button></p>

          {l.outreach?.pitch ? (
            <div>
              <label>Pitch (edit if needed)</label>
              <textarea rows={4} value={l.outreach.pitch} onChange={(e) => patch(l.id, { outreach: { ...l.outreach, pitch: e.target.value } })} />
              <a className="btn small" href={waLink(l.phone, l.outreach.pitch, cc)} target="_blank" rel="noreferrer">📲 Send via WhatsApp</a>
              {(l.outreach.followups || []).map((f, i) => (
                <div key={i}>
                  <label>Follow-up {i + 1} (day {f.day})</label>
                  <textarea rows={3} value={f.text} onChange={(e) => patch(l.id, { outreach: { ...l.outreach, followups: l.outreach.followups.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)) } })} />
                  <a className="btn small ghost" href={waLink(l.phone, f.text, cc)} target="_blank" rel="noreferrer">📲 Send follow-up {i + 1}</a>
                </div>
              ))}
            </div>
          ) : (
            <p>
              <button className="btn small" disabled={busyId === l.id} onClick={() => generate(l, 'service')}>{busyId === l.id ? 'Writing…' : '✨ Service pitch + follow-ups'}</button>{' '}
              <button className="btn small ghost" disabled={busyId === l.id} onClick={() => generate(l, 'course')}>🎓 Course pitch</button>
            </p>
          )}
        </details>
      )) : <p className="empty">No leads yet. Tap “Scan Reddit now”.</p>}
    </div>
  );
}
