// Browser-side 9:16 video renderer: canvas slideshow (slow zoom + captions) recorded with MediaRecorder.
// Runs on the user's phone/PC, so it works on Vercel (no ffmpeg needed on the server).
const W = 720, H = 1280, FPS = 30;

export function pickMime() {
  if (typeof MediaRecorder === 'undefined') return '';
  const list = ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
  return list.find((m) => MediaRecorder.isTypeSupported(m)) || '';
}

export function loadImage(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

const wordsToSeconds = (text) => Math.max(2.5, String(text || '').trim().split(/\s+/).length / 2.6);
export { wordsToSeconds };

function wrap(ctx, text, maxWidth) {
  const lines = [];
  let line = '';
  for (const word of String(text).split(/\s+/)) {
    const trial = line ? `${line} ${word}` : word;
    if (ctx.measureText(trial).width <= maxWidth || !line) line = trial;
    else { lines.push(line); line = word; }
  }
  if (line) lines.push(line);
  return lines;
}

function drawScene(ctx, scene, progress, fade) {
  if (scene.img) {
    const zoom = 1 + 0.08 * progress;
    const scale = Math.max(W / scene.img.width, H / scene.img.height) * zoom;
    const dw = scene.img.width * scale, dh = scene.img.height * scale;
    ctx.drawImage(scene.img, (W - dw) / 2, (H - dh) / 2, dw, dh);
  } else {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#12263a'); g.addColorStop(1, '#4f46e5');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  if (scene.caption) {
    ctx.font = 'bold 46px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    const lines = wrap(ctx, scene.caption, W - 120).slice(0, 4);
    const boxH = lines.length * 60 + 50, top = H - 250 - boxH;
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(30, top, W - 60, boxH);
    ctx.fillStyle = '#fff';
    lines.forEach((l, i) => ctx.fillText(l, W / 2, top + 25 + i * 60));
  }
  if (fade < 1) { ctx.fillStyle = `rgba(0,0,0,${1 - fade})`; ctx.fillRect(0, 0, W, H); }
}

/** scenes: [{caption, img (HTMLImageElement|null), seconds}]. Returns {blob, ext}. Takes as long as the video itself. */
export async function renderVideo({ scenes, audioFile, onProgress }) {
  if (typeof MediaRecorder === 'undefined') throw new Error('This browser cannot record video. Please use Chrome.');
  const mime = pickMime();
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  const stream = canvas.captureStream(FPS);

  let audioCtx = null, source = null, audioLen = 0;
  if (audioFile) {
    const AC = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AC();
    const buffer = await audioCtx.decodeAudioData(await audioFile.arrayBuffer());
    audioLen = buffer.duration;
    source = audioCtx.createBufferSource();
    source.buffer = buffer;
    const dest = audioCtx.createMediaStreamDestination();
    source.connect(dest);
    dest.stream.getAudioTracks().forEach((t) => stream.addTrack(t));
  }

  let durs = scenes.map((s) => Math.max(2.5, s.seconds || 3));
  const sum = durs.reduce((a, b) => a + b, 0);
  const total = audioLen ? audioLen + 0.6 : sum;
  durs = durs.map((d) => (d / sum) * total);
  const starts = durs.map((_, i) => durs.slice(0, i).reduce((a, b) => a + b, 0));

  drawScene(ctx, scenes[0], 0, 1);
  const rec = new MediaRecorder(stream, mime ? { mimeType: mime, videoBitsPerSecond: 3000000 } : undefined);
  const chunks = [];
  rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
  const stopped = new Promise((resolve) => { rec.onstop = resolve; });
  rec.start(500);
  if (source) { if (audioCtx.state === 'suspended') await audioCtx.resume(); source.start(); }

  const t0 = performance.now();
  await new Promise((resolve) => {
    const frame = () => {
      const el = (performance.now() - t0) / 1000;
      if (el >= total) return resolve();
      let idx = 0;
      while (idx < scenes.length - 1 && el >= starts[idx + 1]) idx++;
      const local = el - starts[idx];
      drawScene(ctx, scenes[idx], Math.min(1, local / durs[idx]), Math.min(1, local / 0.35));
      if (onProgress) onProgress(Math.min(0.99, el / total));
      requestAnimationFrame(frame);
    };
    frame();
  });
  rec.stop();
  await stopped;
  if (audioCtx) audioCtx.close();
  const type = (mime || 'video/webm').split(';')[0];
  return { blob: new Blob(chunks, { type }), ext: type.includes('mp4') ? 'mp4' : 'webm' };
}
