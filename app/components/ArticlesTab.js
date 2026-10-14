'use client';
import { useState } from 'react';
import { api } from '@/lib/clientApi';

export default function ArticlesTab({ apiKey, st, onQueued, openInStudio }) {
  const [topic, setTopic] = useState('');
  const [err, setErr] = useState('');

  const queue = async () => {
    setErr('');
    try {
      await api('/api/tasks', apiKey, { type: 'seo', payload: { topic: { title: topic.trim(), keyword: topic.trim() } } });
      setTopic('');
      onQueued();
    } catch (e) { setErr(e.message); }
  };

  return (
    <div>
      <label>Write an article about…</label>
      <input type="text" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Topic or keyword, e.g. best SIP plans for beginners" />
      <p><button className="btn" onClick={queue} disabled={!topic.trim()}>✍️ Write article</button></p>
      <p className="sub">Plan, writing, editing and WordPress publishing run step by step. Settings decide draft or live. Each article also gets a Reel script.</p>
      {err && <p className="err">{err}</p>}
      {st.articles.length ? st.articles.map((a) => (
        <div className="card" key={a.id}>
          <b>{a.result?.title}</b><br />
          <small>{a.result?.status === 'publish' ? 'Published' : 'Draft'} · {new Date(a.updated_at).toLocaleDateString()}</small>
          {a.result?.link && <> · <a href={a.result.link} target="_blank" rel="noreferrer">Open</a></>}
          {a.reel && (
            <details style={{ marginTop: 8 }}>
              <summary>Reel script</summary>
              {a.reel.hooks?.map((h, i) => <div key={i}>• {h}</div>)}
              <p style={{ whiteSpace: 'pre-wrap' }}>{a.reel.script}</p>
              <button className="btn small ghost" onClick={() => navigator.clipboard?.writeText(a.reel.script)}>Copy script</button>{' '}
              <button className="btn small" onClick={() => openInStudio(a.reel)}>🎞️ Make video</button>
            </details>
          )}
        </div>
      )) : <p className="empty">No articles yet.</p>}
    </div>
  );
}
