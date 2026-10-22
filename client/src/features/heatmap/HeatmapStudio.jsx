import { useEffect, useMemo, useRef, useState } from "react";
import { ZONES, HOURS, makeMockData } from "./mockData";
import "./heatmap.css";

const W = 1000, H = 620;

// Thermal palette: 256 colours, quiet indigo -> teal -> amber -> crimson
const PAL = (() => {
  const c = document.createElement("canvas");
  c.width = 256; c.height = 1;
  const x = c.getContext("2d");
  const g = x.createLinearGradient(0, 0, 256, 0);
  [[0, "#3b3a8f"], [0.35, "#1fa0aa"], [0.62, "#f6c344"], [0.85, "#ef5a28"], [1, "#b8143c"]]
    .forEach(([s, col]) => g.addColorStop(s, col));
  x.fillStyle = g; x.fillRect(0, 0, 256, 1);
  return x.getImageData(0, 0, 256, 1).data;
})();

function paint(canvas, bg, pts, radius, opacity) {
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, W, H);
  if (bg) ctx.drawImage(bg, 0, 0, W, H);
  else {
    ctx.fillStyle = "#e4eaf0"; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "#c5d0db"; ctx.lineWidth = 1;
    for (let i = 0; i <= W; i += 50) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, H); ctx.stroke(); }
    for (let j = 0; j <= H; j += 50) { ctx.beginPath(); ctx.moveTo(0, j); ctx.lineTo(W, j); ctx.stroke(); }
  }
  const off = document.createElement("canvas");
  off.width = W; off.height = H;
  const o = off.getContext("2d");
  pts.forEach((p) => {
    const x = p.x * W, y = p.y * H;
    const g = o.createRadialGradient(x, y, 0, x, y, radius);
    g.addColorStop(0, `rgba(0,0,0,${0.1 * p.w})`);
    g.addColorStop(1, "rgba(0,0,0,0)");
    o.fillStyle = g;
    o.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  });
  const img = o.getImageData(0, 0, W, H), d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const a = d[i + 3];
    if (!a) continue;
    const k = Math.min(255, a * 3) * 4;
    d[i] = PAL[k]; d[i + 1] = PAL[k + 1]; d[i + 2] = PAL[k + 2];
    d[i + 3] = Math.min(255, a * 3.2) * opacity;
  }
  o.putImageData(img, 0, 0);
  ctx.drawImage(off, 0, 0);
}

const fmt = (h) => `${h > 12 ? h - 12 : h}${h >= 12 ? " pm" : " am"}`;

// Pass `points` from the real API when ready. Without it, demo data is used.
export default function HeatmapStudio({ points, blueprint = "/sample-blueprint.jpg", storeName = "Store floor 1" }) {
  const data = useMemo(() => points ?? makeMockData(), [points]);
  const [hour, setHour] = useState(null); // null = whole day
  const [playing, setPlaying] = useState(false);
  const [spread, setSpread] = useState(46);
  const [bg, setBg] = useState(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const img = new Image();
    img.onload = () => setBg(img);
    img.src = blueprint;
  }, [blueprint]);

  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => setHour((h) => (h == null || h >= 21 ? 9 : h + 1)), 900);
    return () => clearInterval(t);
  }, [playing]);

  const shown = useMemo(() => (hour == null ? data : data.filter((p) => p.hour === hour)), [data, hour]);
  const opacity = hour == null ? 0.82 : 0.92;

  useEffect(() => {
    paint(canvasRef.current, bg, shown, spread, opacity);
  }, [bg, shown, spread, opacity]);

  const zoneCounts = useMemo(() => {
    const m = Object.fromEntries(ZONES.map((z) => [z.id, 0]));
    shown.forEach((p) => { if (m[p.zone] !== undefined) m[p.zone]++; });
    return m;
  }, [shown]);
  const ranked = [...ZONES].sort((a, b) => zoneCounts[b.id] - zoneCounts[a.id]);
  const top = zoneCounts[ranked[0].id] || 1;

  const peak = useMemo(() => {
    const m = {};
    data.forEach((p) => (m[p.hour] = (m[p.hour] || 0) + 1));
    return +Object.keys(m).sort((a, b) => m[b] - m[a])[0];
  }, [data]);

  return (
    <section className="hm">
      <header className="hm-head">
        <div>
          <h1>Where shoppers spend their time</h1>
          <p>{storeName}. Warmer colours mean more people stood or walked there.</p>
        </div>
        <button className="hm-btn" onClick={() => { setPlaying(false); setHour(null); }} aria-pressed={hour == null}>
          Whole day
        </button>
      </header>

      <div className="hm-grid">
        <div className="hm-stage">
          <canvas ref={canvasRef} width={W} height={H} aria-label="Store heatmap" />
          {ZONES.map((z) => (
            <span key={z.id} className="hm-pin" style={{ left: `${z.x * 100}%`, top: `${z.y * 100}%` }}>
              {z.name}
            </span>
          ))}
          <div className="hm-legend">
            <span>Quieter</span><i /><span>Busier</span>
          </div>
        </div>

        <aside className="hm-side">
          <dl className="hm-facts">
            <div><dt>Visits recorded</dt><dd>{shown.length.toLocaleString()}</dd></div>
            <div><dt>Busiest zone</dt><dd>{ranked[0].name}</dd></div>
            <div><dt>Busiest hour</dt><dd>{fmt(peak)}</dd></div>
          </dl>
          <h2>Zones by footfall</h2>
          <ol className="hm-zones">
            {ranked.map((z) => (
              <li key={z.id}>
                <div className="hm-zrow"><span>{z.name}</span><b>{zoneCounts[z.id]}</b></div>
                <div className="hm-bar"><span style={{ width: `${(zoneCounts[z.id] / top) * 100}%` }} /></div>
              </li>
            ))}
          </ol>
          <label className="hm-range">
            Heat spread
            <input type="range" min="20" max="90" value={spread} onChange={(e) => setSpread(+e.target.value)} />
          </label>
        </aside>
      </div>

      <div className="hm-time">
        <button className="hm-play" onClick={() => { setPlaying((p) => !p); if (hour == null) setHour(9); }}>
          {playing ? "Pause" : "Play day"}
        </button>
        <div className="hm-track">
          <input type="range" min="9" max="21" value={hour ?? 9}
            onChange={(e) => { setPlaying(false); setHour(+e.target.value); }} />
          <div className="hm-ticks">{HOURS.filter((h) => h % 2 === 1).map((h) => <span key={h}>{fmt(h)}</span>)}</div>
        </div>
        <output>{hour == null ? "All day" : `${fmt(hour)} to ${fmt(hour + 1)}`}</output>
      </div>
    </section>
  );
}