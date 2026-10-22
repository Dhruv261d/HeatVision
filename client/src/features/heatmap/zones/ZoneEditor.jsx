import { useEffect, useMemo, useRef, useState } from "react";
import { ZONE_TYPES } from "./zoneTypes";
import "./ZoneEditor.css";


const CLOSE_DIST = 0.025;
const MIN_RECT = 0.01;
const clamp = (v) => Math.min(1, Math.max(0, v));
const typeColor = (id) => ZONE_TYPES.find((t) => t.id === id)?.color ?? "#888";
const toPoints = (pts) => pts.map(([x, y]) => `${x},${y}`).join(" ");
const centroid = (pts) => [
  pts.reduce((s, p) => s + p[0], 0) / pts.length,
  pts.reduce((s, p) => s + p[1], 0) / pts.length,
];
const nextName = (name) => {
  const m = name.match(/^(.*?)(\d+)$/);
  return m ? `${m[1]}${Number(m[2]) + 1}` : name;
};

export default function ZoneEditor({
  storeName = "Main Retail Store",
  blueprints = [],
  onUploadBlueprint,
  onSaveZones,
}) {
  const [bps, setBps] = useState(blueprints);
  const [activeId, setActiveId] = useState(() => blueprints[0]?.id ?? null);
  const [zonesByBp, setZonesByBp] = useState(() =>
    Object.fromEntries(blueprints.map((b) => [b.id, b.zones ?? []]))
  );


  const [tool, setTool] = useState("polygon");
  const [name, setName] = useState("Shelf 1");
  const [type, setType] = useState("shelf");
  const [draft, setDraft] = useState([]);
  const [hover, setHover] = useState(null);
  const [drag, setDrag] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [status, setStatus] = useState("");
  const svgRef = useRef(null);

  const active = bps.find((b) => b.id === activeId);
  const zones = zonesByBp[activeId] ?? [];

  const setZones = (fn) =>
    setZonesByBp((m) => ({ ...m, [activeId]: fn(m[activeId] ?? []) }));

  const resetDrawing = () => {
    setDraft([]);
    setHover(null);
    setDrag(null);
  };

  const chooseTool = (t) => {
    resetDrawing();
    setTool(t);
  };

  const selectBlueprint = (id) => {
    resetDrawing();
    setSelectedId(null);
    setStatus("");
    setActiveId(id);
  };

  const pointFromEvent = (e) => {
    const r = svgRef.current.getBoundingClientRect();
    return [clamp((e.clientX - r.left) / r.width), clamp((e.clientY - r.top) / r.height)];
  };

  const addZone = (points, shape) => {
    const zone = { id: crypto.randomUUID(), name: name.trim() || "Zone", type, shape, points };
    setZones((z) => [...z, zone]);
    setSelectedId(zone.id);
    setName(nextName(name));
    setStatus("");
  };

  const closePolygon = () => {
    if (draft.length >= 3) addZone(draft, "polygon");
    resetDrawing();
  };

  const undo = () => {
    if (draft.length) setDraft((d) => d.slice(0, -1));
    else setZones((z) => z.slice(0, -1));
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") resetDrawing();
      if (e.key === "Enter" && draft.length >= 3) {
        addZone(draft, "polygon");
        resetDrawing();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const onPointerDown = (e) => {
    if (!active) return;
    const p = pointFromEvent(e);
    if (tool === "rectangle") {
      e.currentTarget.setPointerCapture(e.pointerId);
      setDrag({ start: p, cur: p });
    } else if (tool === "polygon") {
      const first = draft[0];
      if (first && draft.length >= 3 && Math.hypot(p[0] - first[0], p[1] - first[1]) < CLOSE_DIST) {
        closePolygon();
      } else {
        setDraft((d) => [...d, p]);
      }
    } else {
      setSelectedId(null);
    }
  };

  const onPointerMove = (e) => {
    if (drag) setDrag({ ...drag, cur: pointFromEvent(e) });
    else if (tool === "polygon" && draft.length) setHover(pointFromEvent(e));
  };

  const onPointerUp = () => {
    if (!drag) return;
    const [x1, y1] = drag.start;
    const [x2, y2] = drag.cur;
    if (Math.abs(x2 - x1) > MIN_RECT && Math.abs(y2 - y1) > MIN_RECT) {
      const [l, r, t, b] = [Math.min(x1, x2), Math.max(x1, x2), Math.min(y1, y2), Math.max(y1, y2)];
      addZone([[l, t], [r, t], [r, b], [l, b]], "rectangle");
    }
    setDrag(null);
  };

  const rectPoints = drag
    ? (() => {
        const [x1, y1] = drag.start;
        const [x2, y2] = drag.cur;
        return [[x1, y1], [x2, y1], [x2, y2], [x1, y2]];
      })()
    : null;

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const bp = onUploadBlueprint
        ? await onUploadBlueprint(file)
        : { id: crypto.randomUUID(), name: file.name, url: URL.createObjectURL(file) };
      setBps((list) => [bp, ...list]);
      setZonesByBp((m) => ({ ...m, [bp.id]: [] }));
      selectBlueprint(bp.id);
    } catch {
      setStatus("Upload failed. Check the file and try again.");
    }
  };

  const save = async () => {
    try {
      await onSaveZones?.(activeId, zones);
      setStatus("Zones saved");
    } catch {
      setStatus("Could not save zones. Try again.");
    }
  };

  const draftShapePoints = useMemo(
    () => (hover && draft.length ? [...draft, hover] : draft),
    [draft, hover]
  );

  return (
    <div className="ze">
      <aside className="ze-side" aria-label="Blueprints">
        <h3>Blueprints</h3>
        <label className="ze-btn ze-btn--primary">
          Upload blueprint
          <input type="file" accept="image/*" hidden onChange={handleUpload} />
        </label>
        {bps.length === 0 && <p className="ze-muted">No blueprints yet. Upload one to start.</p>}
        <ul className="ze-bps">
          {bps.map((b) => (
            <li key={b.id}>
              <button
                className={`ze-bp ${b.id === activeId ? "is-active" : ""}`}
                onClick={() => selectBlueprint(b.id)}
              >
                <img src={b.url} alt="" />
                <span>{b.name}</span>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <main className="ze-main">
        <header className="ze-head">
          <div>
            <h2>Store Zone Editor</h2>
            <p className="ze-muted">Store: {storeName}</p>
          </div>
          <span className="ze-badge">Editing</span>
        </header>

        <div className="ze-toolbar" role="toolbar" aria-label="Drawing tools">
          {[
            ["select", "Select"],
            ["rectangle", "Rectangle"],
            ["polygon", "Polygon"],
          ].map(([id, label]) => (
            <button
              key={id}
              className={`ze-chip ${tool === id ? "is-on" : ""}`}
              onClick={() => chooseTool(id)}
            >
              {label}
            </button>
          ))}
          <button className="ze-chip" onClick={undo}>Undo</button>
        </div>

        <div className="ze-canvas">
          {active ? (
            <div className="ze-stage">
              <img src={active.url} alt={active.name} draggable={false} />
              <svg
                ref={svgRef}
                className={`ze-svg tool-${tool}`}
                viewBox="0 0 1 1"
                preserveAspectRatio="none"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
              >
                {zones.map((z) => (
                  <polygon
                    key={z.id}
                    points={toPoints(z.points)}
                    fill={typeColor(z.type)}
                    fillOpacity={z.id === selectedId ? 0.6 : 0.4}
                    stroke={typeColor(z.type)}
                    strokeWidth={z.id === selectedId ? 3 : 1.5}
                    vectorEffect="non-scaling-stroke"
                    style={{ pointerEvents: tool === "select" ? "auto" : "none" }}
                    onPointerDown={(e) => {
                      if (tool !== "select") return;
                      e.stopPropagation();
                      setSelectedId(z.id);
                    }}
                  />
                ))}
                {draftShapePoints.length > 0 && (
                  <polyline
                    points={toPoints(draftShapePoints)}
                    fill="none"
                    stroke={typeColor(type)}
                    strokeWidth={2}
                    strokeDasharray="6 4"
                    vectorEffect="non-scaling-stroke"
                  />
                )}
                {rectPoints && (
                  <polygon
                    points={toPoints(rectPoints)}
                    fill={typeColor(type)}
                    fillOpacity={0.3}
                    stroke={typeColor(type)}
                    strokeWidth={2}
                    strokeDasharray="6 4"
                    vectorEffect="non-scaling-stroke"
                  />
                )}
              </svg>
              {zones.map((z) => {
                const [cx, cy] = centroid(z.points);
                return (
                  <span key={`l-${z.id}`} className="ze-label" style={{ left: `${cx * 100}%`, top: `${cy * 100}%` }}>
                    {z.name}
                  </span>
                );
              })}
              {draft.map(([x, y], i) => (
                <span
                  key={i}
                  className={`ze-dot ${i === 0 && draft.length >= 3 ? "is-first" : ""}`}
                  style={{ left: `${x * 100}%`, top: `${y * 100}%`, background: typeColor(type) }}
                />
              ))}
            </div>
          ) : (
            <div className="ze-empty">
              <p>Upload a blueprint or pick one from the list to start adding zones.</p>
            </div>
          )}
        </div>
        <p className="ze-muted ze-hint">
          {tool === "polygon" && "Click to add corners. Click the first point or press Enter to close the shape. Esc cancels."}
          {tool === "rectangle" && "Drag on the blueprint to draw a rectangle."}
          {tool === "select" && "Click a zone to select it."}
        </p>
      </main>

      <section className="ze-panel" aria-label="Zone settings">
        <h3>New zone properties</h3>
        <label className="ze-field">
          <span>Zone name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </label>

        <fieldset className="ze-field">
          <legend>Zone type</legend>
          {ZONE_TYPES.map((t) => (
            <label key={t.id} className="ze-radio">
              <input type="radio" name="zone-type" checked={type === t.id} onChange={() => setType(t.id)} />
              <i style={{ background: t.color }} />
              {t.label}
            </label>
          ))}
        </fieldset>

        <fieldset className="ze-field">
          <legend>Drawing shape</legend>
          <label className="ze-radio">
            <input type="radio" name="shape" checked={tool === "rectangle"} onChange={() => chooseTool("rectangle")} />
            Rectangle: quick setup
          </label>
          <label className="ze-radio">
            <input type="radio" name="shape" checked={tool === "polygon"} onChange={() => chooseTool("polygon")} />
            Polygon: precise boundaries
          </label>
        </fieldset>

        <h3>Zones ({zones.length})</h3>
        {zones.length === 0 && <p className="ze-muted">Zones you draw will appear here.</p>}
        <ul className="ze-zones">
          {zones.map((z) => (
            <li key={z.id} className={z.id === selectedId ? "is-active" : ""} onClick={() => setSelectedId(z.id)}>
              <i style={{ background: typeColor(z.type) }} />
              <input
                value={z.name}
                aria-label="Zone name"
                onChange={(e) =>
                  setZones((all) => all.map((x) => (x.id === z.id ? { ...x, name: e.target.value } : x)))
                }
              />
              <button
                className="ze-icon"
                aria-label={`Delete ${z.name}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setZones((all) => all.filter((x) => x.id !== z.id));
                }}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>

        <button className="ze-btn ze-btn--primary" disabled={!active || zones.length === 0} onClick={save}>
          Save zones
        </button>
        {status && <p className="ze-status" role="status">{status}</p>}
      </section>
    </div>
  );
}