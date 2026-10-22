import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Calculator,
  Check,
  RotateCcw,
  Save,
  Plus,
  Trash2,
  Video,
  Map,
  Crosshair,
  Pentagon,
} from "lucide-react";

import "./UnifiedCalibrationZoneEditor.css";

/** Unified camera calibration and polygon-zone editor. */

const DEFAULT_VIDEO_POINTS = [
  [0.15, 0.15],

  [0.85, 0.15],

  [0.85, 0.85],

  [0.15, 0.85],
];

const DEFAULT_BLUEPRINT_POINTS = [
  [0.2, 0.2],

  [0.8, 0.2],

  [0.8, 0.8],

  [0.2, 0.8],
];

const POINT_COLORS = ["#EF4444", "#3B82F6", "#10B981", "#F59E0B"];

const POINT_LABELS = ["Top-left", "Top-right", "Bottom-right", "Bottom-left"];

const ZONE_TYPES = [
  { id: "shelf", label: "Shelf", color: "#22C55E" },

  { id: "aisle", label: "Aisle", color: "#3B82F6" },

  { id: "billing", label: "Billing counter", color: "#F59E0B" },

  { id: "entrance", label: "Entrance / Exit", color: "#A855F7" },

  { id: "custom", label: "Custom", color: "#EC4899" },
];

const clamp = (v) => Math.max(0, Math.min(1, v));

const uid = () =>
  globalThis.crypto?.randomUUID?.() ??
  `zone_${Date.now()}_${Math.random().toString(36).slice(2)}`;

const normalizeInitialPoints = (points, resolution, fallback) => {
  if (!Array.isArray(points) || points.length !== 4) return fallback;

  const width = resolution?.width || 1;

  const height = resolution?.height || 1;

  return points.map((point) => {
    // New format: normalized [x, y] pairs.

    if (Array.isArray(point))
      return [clamp(Number(point[0])), clamp(Number(point[1]))]; // Legacy HomographyCalibrator format: pixel objects { x, y }.

    if (point && typeof point === "object") {
      const x = Number(point.x);

      const y = Number(point.y); // If stored coordinates look normalized, keep them normalized.

      if (x >= 0 && x <= 1 && y >= 0 && y <= 1) return [x, y];

      return [clamp(x / width), clamp(y / height)];
    }

    return [0.5, 0.5];
  });
};

const toPixelPoints = (points, image) =>
  points.map(([x, y]) => ({
    x: Math.round(x * (image?.naturalWidth || 1)),

    y: Math.round(y * (image?.naturalHeight || 1)),
  }));

const projectPointWithH = (pt, H) => {
  if (!pt || !Array.isArray(H) || H.length !== 3) return null;

  const [x, y] = pt;

  const w = H[2][0] * x + H[2][1] * y + H[2][2];

  if (Math.abs(w) < 1e-9) return null;

  return {
    x: (H[0][0] * x + H[0][1] * y + H[0][2]) / w,

    y: (H[1][0] * x + H[1][1] * y + H[1][2]) / w,
  };
};

export default function UnifiedCalibrationZoneEditor({
  videoItem,
  initialConfig = {},
  blueprintSrc: blueprintSrcProp,
  onSaveCalibration,
  onSaveZones,
  onClose,
  apiBaseUrl = import.meta.env.VITE_API_URL || "http://localhost:5000",
}) {
  const videoInputRef = useRef(null);
  const blueprintInputRef = useRef(null);
  const videoStageRef = useRef(null);
  const blueprintStageRef = useRef(null);
  const dragRef = useRef(null);
  const [mode, setMode] = useState("calibrate"); // calibrate | zones

  const [videoSrc, setVideoSrc] = useState(
    initialConfig.videoSrc || videoItem?.videoSrc || null,
  );

  const [blueprintSrc, setBlueprintSrc] = useState(
    blueprintSrcProp || initialConfig.blueprintSrc || null,
  );

  const [videoImage, setVideoImage] = useState(null);

  const [blueprintImage, setBlueprintImage] = useState(null);

  const [videoPoints, setVideoPoints] = useState(() =>
    normalizeInitialPoints(
      initialConfig.videoPoints,
      initialConfig.videoResolution,
      DEFAULT_VIDEO_POINTS,
    ),
  );

  const [blueprintPoints, setBlueprintPoints] = useState(() =>
    normalizeInitialPoints(
      initialConfig.blueprintPoints,
      initialConfig.blueprintResolution,
      DEFAULT_BLUEPRINT_POINTS,
    ),
  );

  const [hMatrix, setHMatrix] = useState(initialConfig.HMatrix || null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [activeSide, setActiveSide] = useState("video");
  const [zoneName, setZoneName] = useState("Shelf 1");
  const [zoneType, setZoneType] = useState("shelf");
  const [zones, setZones] = useState(initialConfig.zones || []);
  const [draftVideo, setDraftVideo] = useState([]);
  const [draftBlueprint, setDraftBlueprint] = useState([]);
  const [activeZoneId, setActiveZoneId] = useState(null);

  // const selectedZoneType =
  // ZONE_TYPES.find((z) => z.id === zoneType) || ZONE_TYPES[0];

  // const activeZone = zones.find((z) => z.id === activeZoneId) || null; // Extract one representative frame from the uploaded video.

  useEffect(() => {
    const file = videoItem?.file;
    if (!file || !file.type?.startsWith("video/")) return;
    const objectUrl = URL.createObjectURL(file);
    const el = document.createElement("video");
    el.src = objectUrl;
    el.muted = true;
    el.playsInline = true;
    const cleanup = () => URL.revokeObjectURL(objectUrl);

    el.onloadedmetadata = () => {
      el.currentTime = Math.min(1, (el.duration || 2) / 3);
    };

    el.onseeked = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = el.videoWidth || 1280;
        canvas.height = el.videoHeight || 720;
        canvas
          .getContext("2d")
          ?.drawImage(el, 0, 0, canvas.width, canvas.height);

        setVideoSrc(canvas.toDataURL("image/jpeg", 0.9));
      } catch (e) {
        setError(`Could not extract video frame: ${e.message}`);
      } finally {
        cleanup();
      }
    };

    el.onerror = cleanup;

    return cleanup;
  }, [videoItem?.file]);

  useEffect(() => {
    if (!blueprintSrcProp) return;

    setBlueprintSrc(blueprintSrcProp);
  }, [blueprintSrcProp]);

  useEffect(() => {
    if (!videoSrc) {
      setVideoImage(null);

      return;
    }

    const img = new Image();

    img.onload = () => setVideoImage(img);
    img.onerror = () => setError("Could not load the video frame image.");
    img.src = videoSrc;
  }, [videoSrc]);

  useEffect(() => {
    if (!blueprintSrc) {
      setBlueprintImage(null);

      return;
    }

    const img = new Image();

    img.onload = () => setBlueprintImage(img);
    img.onerror = () => setError("Could not load the floorplan image.");

    img.src = blueprintSrc;
  }, [blueprintSrc]);

  const loadImageFile = (event, side) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please choose a valid image file.");
      return;
    }

    const url = URL.createObjectURL(file);

    if (side === "video") setVideoSrc(url);
    else setBlueprintSrc(url);

    setHMatrix(null);
    setStatus("");
    setError("");
  };

  const stagePoint = useCallback((event, side) => {
    const stage =
      side === "video" ? videoStageRef.current : blueprintStageRef.current;

    const svg = stage?.querySelector("svg.ucze-overlay");
    if (!svg) return [0, 0];
    const rect = svg.getBoundingClientRect();
    return [
      clamp((event.clientX - rect.left) / rect.width),
      clamp((event.clientY - rect.top) / rect.height),
    ];
  }, []);

  const onCalibrationPointerDown = (event, side) => {
    if (mode !== "calibrate") return;
    event.preventDefault();
    event.stopPropagation();
    const stage =
      side === "video" ? videoStageRef.current : blueprintStageRef.current;

    const svg = stage?.querySelector("svg.ucze-overlay");

    if (!svg) return;

    const rect = svg.getBoundingClientRect();

    if (!rect.width || !rect.height) return;

    const points = side === "video" ? videoPoints : blueprintPoints;
    const pointerX = event.clientX - rect.left;
    const pointerY = event.clientY - rect.top;
    const radiusThreshold = Math.max(12, rect.width / 25);
    let nearestIndex = -1;
    let nearestDistance = Infinity;

    points.forEach(([x, y], index) => {
      const pointX = x * rect.width;
      const pointY = y * rect.height;
      const distance = Math.hypot(pointX - pointerX, pointY - pointerY);
      if (distance <= radiusThreshold && distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    });

    if (nearestIndex === -1) return;

    dragRef.current = {
      side,
      index: nearestIndex,
      pointerId: event.pointerId,
    };

    try {
      stage?.setPointerCapture(event.pointerId);
    } catch {
      // Continue using the active drag state.
    }
  };

  const onStagePointerMove = (event, side) => {
    const drag = dragRef.current;

    if (mode === "calibrate" && drag) {
      if (drag.side !== side || drag.pointerId !== event.pointerId) {
        return;
      }

      const p = stagePoint(event, drag.side);

      const setter =
        drag.side === "video" ? setVideoPoints : setBlueprintPoints;

      setter((prev) => prev.map((old, i) => (i === drag.index ? p : old)));
      setHMatrix(null);
      return;
    }

    if (
      mode === "zones" &&
      activeSide === side &&
      (side === "video" ? draftVideo.length : draftBlueprint.length)
    ) {
      // Keep your existing zone behavior.
    }
  };

  const onStagePointerUp = (event) => {
    if (!dragRef.current) return;

    if (
      dragRef.current.pointerId != null &&
      event?.pointerId != null &&
      dragRef.current.pointerId !== event.pointerId
    )
      return;

    dragRef.current = null;
  };

  const onStageClick = (event, side) => {
    if (mode !== "zones") return; // Ignore clicks originating from calibration handles.

    if (event.target?.dataset?.calibrationHandle === "true") return;

    const p = stagePoint(event, side);

    setActiveSide(side);

    if (side === "video") setDraftVideo((prev) => [...prev, p]);
    else setDraftBlueprint((prev) => [...prev, p]);

    setStatus(
      `Added ${side === "video" ? "video-frame" : "floorplan"} polygon point.`,
    );

    setError("");
  };

  const resetDrafts = () => {
    setDraftVideo([]);
    setDraftBlueprint([]);
    setStatus("");
  };

  const createZone = () => {
    let finalVideo = [...draftVideo];
    let finalBlueprint = [...draftBlueprint];

    // If points drawn on video but not on floorplan, and H is available, project automatically!
    if (
      finalVideo.length >= 3 &&
      finalBlueprint.length < 3 &&
      hMatrix &&
      videoImage &&
      blueprintImage
    ) {
      finalBlueprint = finalVideo.map(([vx, vy]) => {
        const proj = projectPointWithH(
          [vx * videoImage.naturalWidth, vy * videoImage.naturalHeight],
          hMatrix,
        );
        if (proj) {
          return [
            clamp(proj.x / (blueprintImage.naturalWidth || 1)),
            clamp(proj.y / (blueprintImage.naturalHeight || 1)),
          ];
        }
        return [vx, vy];
      });
    }

    if (finalVideo.length < 3 && finalBlueprint.length < 3) {
      setError(
        "Draw at least 3 points on either the video frame or the floorplan to create a zone.",
      );
      return;
    }

    const zone = {
      id: uid(),
      name: zoneName.trim() || `Zone ${zones.length + 1}`,
      type: zoneType,
      videoPolygon: finalVideo,
      blueprintPolygon: finalBlueprint,
      points:
        finalBlueprint.length >= 3
          ? finalBlueprint.map(([x, y]) => ({ x, y }))
          : finalVideo.map(([x, y]) => ({ x, y })),
    };

    const nextZones = [...zones, zone];
    setZones(nextZones);
    onSaveZones?.(nextZones);

    setActiveZoneId(zone.id);

    setZoneName((prev) => {
      const match = prev.match(/^(.*?)(\d+)$/);
      return match ? `${match[1]}${Number(match[2]) + 1}` : `${prev} 2`;
    });

    resetDrafts();
    setError("");
    setStatus(`Zone "${zone.name}" added and saved.`);
  };

  const removeZone = (id) => {
    const nextZones = zones.filter((z) => z.id !== id);
    setZones(nextZones);
    onSaveZones?.(nextZones);

    if (activeZoneId === id) setActiveZoneId(null);
  };

  const calculateH = async () => {
    if (!videoImage || !blueprintImage) {
      setError("Load both a video frame and a floorplan before calibration.");

      return;
    }

    setIsCalculating(true);

    setError("");

    setStatus("");

    const payload = {
      videoPoints: toPixelPoints(videoPoints, videoImage),

      blueprintPoints: toPixelPoints(blueprintPoints, blueprintImage),
    };

    try {
      const response = await fetch(`${apiBaseUrl}/api/caligraphy/calibrate`, {
        method: "POST",

        headers: { "Content-Type": "application/json" },

        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || !data.success || !data.HMatrix) {
        throw new Error(
          data.message || data.error || "Calibration API failed.",
        );
      }

      setHMatrix(data.HMatrix);

      const calibration = {
        id: initialConfig.id || uid(),

        name: `${videoItem?.name || "Camera"} Mapping`,

        camera: videoItem?.camera || "cam_1_entrance",

        videoResolution: {
          width: videoImage.naturalWidth,

          height: videoImage.naturalHeight,
        },

        blueprintResolution: {
          width: blueprintImage.naturalWidth,

          height: blueprintImage.naturalHeight,
        },
        videoPoints: toPixelPoints(videoPoints, videoImage),
        blueprintPoints: toPixelPoints(blueprintPoints, blueprintImage),
        HMatrix: data.HMatrix,
        zones,
        videoSrc,
        blueprintSrc,
        appliedAt: new Date().toISOString(),
      };

      onSaveCalibration?.(calibration);

      setStatus("Calibration calculated and saved.");
    } catch (e) {
      setError(e.message || "Unable to calculate calibration.");
    } finally {
      setIsCalculating(false);
    }
  };

  const saveZones = async () => {
    if (!zones.length) {
      setError("Create at least one zone before saving.");

      return;
    }

    try {
      await onSaveZones?.(zones);

      setStatus("Zones saved.");

      setError("");
    } catch (e) {
      setError(e.message || "Could not save zones.");
    }
  };

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        if (activeSide === "video") setDraftVideo([]);
        else setDraftBlueprint([]);
      }

      if (
        event.key === "Enter" &&
        mode === "zones" &&
        activeSide === "video" &&
        draftVideo.length >= 3 &&
        draftBlueprint.length >= 3
      ) {
        createZone();
      }

      if (
        (event.key === "Backspace" || event.key === "Delete") &&
        mode === "zones" &&
        activeZoneId
      ) {
        removeZone(activeZoneId);
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    activeSide,
    activeZoneId,
    draftVideo,
    draftBlueprint,
    mode,
    zones,
    zoneName,
    zoneType,
  ]);

  const renderStage = (side) => {
    const isVideo = side === "video";
    const image = isVideo ? videoImage : blueprintImage;
    const src = isVideo ? videoSrc : blueprintSrc;
    const points = isVideo ? videoPoints : blueprintPoints;
    const draft = isVideo ? draftVideo : draftBlueprint;
    const setDraft = isVideo ? setDraftVideo : setDraftBlueprint;
    const imageName = isVideo ? "Video frame" : "Store floorplan";
    const stageRef = isVideo ? videoStageRef : blueprintStageRef;
    const color = isVideo ? "#60A5FA" : "#34D399";

    return (
      <section className="ucze-panel" key={side}>
        <div className="ucze-panel-head">
          <strong>
            {isVideo ? <Video size={16} /> : <Map size={16} />} {imageName}{" "}
          </strong>

          <button
            type="button"
            className="ucze-button ucze-button--small"
            onClick={() =>
              (isVideo ? videoInputRef : blueprintInputRef).current?.click()
            }
          >
            Upload image{" "}
          </button>

          <input
            ref={isVideo ? videoInputRef : blueprintInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => loadImageFile(e, side)}
          />
        </div>

        <div
          className={`ucze-stage ${image ? "ucze-stage--loaded" : ""} ${mode === "zones" ? "ucze-stage--draw" : ""}`}
          ref={stageRef}
          onPointerDown={(e) => {
            if (mode === "calibrate") onCalibrationPointerDown(e, side);
            else if (mode === "zones") onStageClick(e, side);
          }}
          onPointerMove={(e) => onStagePointerMove(e, side)}
          onPointerUp={onStagePointerUp}
          onPointerCancel={onStagePointerUp}
        >
          {src && image ? (
            <>
              <img src={src} alt={imageName} draggable="false" />

              <svg
                viewBox="0 0 1 1"
                preserveAspectRatio="none"
                className="ucze-overlay"
              >
                {mode === "calibrate" && points.length === 4 && (
                  <polygon
                    points={points.map(([x, y]) => `${x},${y}`).join(" ")}
                    fill="#3B82F6"
                    fillOpacity="0.16"
                    stroke="#60A5FA"
                    strokeWidth="2.5"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                    pointerEvents="none"
                  />
                )}

                {mode === "calibrate" &&
                  points.map(([x, y], i) => (
                    <g key={i} style={{ cursor: "grab" }} r={0.0001}>
                      {/* Nearest-point hit testing prevents overlapping handles from stealing selection. */}

                      <circle
                        cx={x}
                        cy={y}
                        r="0.01"
                        fill="transparent"
                        stroke="transparent"
                        pointerEvents="all"
                        data-calibration-handle="true"
                      />

                      <circle
                        cx={x}
                        cy={y}
                        r="0.01"
                        fill={POINT_COLORS[i]}
                        stroke="white"
                        strokeWidth="1"
                        vectorEffect="non-scaling-stroke"
                        pointerEvents="none"
                      />

                      <text
                        x={x}
                        y={y} // dy="0.01"
                        textAnchor="middle"
                        fill="white"
                        fontSize="0.05"
                        fontWeight="700"
                        stroke="#111c34ff"
                        strokeWidth="0.0015"
                        paintOrder="stroke"
                        pointerEvents="none"
                      >
                        {i + 1}
                      </text>
                    </g>
                  ))}

                {zones.map((z) => {
                  const polygon = isVideo ? z.videoPolygon : z.blueprintPolygon;

                  if (!polygon?.length) return null;

                  const zColor =
                    ZONE_TYPES.find((t) => t.id === z.type)?.color || "#EC4899";

                  return (
                    <polygon
                      key={z.id}
                      points={polygon.map((p) => p.join(",")).join(" ")}
                      fill={zColor}
                      fillOpacity={z.id === activeZoneId ? 0.35 : 0.18}
                      stroke={zColor}
                      strokeWidth="2"
                      vectorEffect="non-scaling-stroke"
                    />
                  );
                })}

                {draft.length > 0 && (
                  <>
                    <polyline
                      points={draft.map((p) => p.join(",")).join(" ")}
                      fill="none"
                      stroke={color}
                      strokeWidth="2"
                      strokeDasharray="5 3"
                      vectorEffect="non-scaling-stroke"
                    />

                    {draft.map(([x, y], i) => (
                      <circle
                        key={i}
                        cx={x}
                        cy={y}
                        r="0.009"
                        fill={color}
                        stroke="white"
                        strokeWidth="1"
                        vectorEffect="non-scaling-stroke"
                      />
                    ))}
                  </>
                )}
              </svg>
            </>
          ) : (
            <div className="ucze-empty">
              <p>
                {isVideo
                  ? "Upload a representative frame, or provide a videoItem.file to extract one automatically."
                  : "Upload the store floorplan image."}
              </p>

              <button
                type="button"
                className="ucze-button"
                onClick={() =>
                  (isVideo ? videoInputRef : blueprintInputRef).current?.click()
                }
              >
                Choose image{" "}
              </button>
            </div>
          )}
        </div>

        <p className="ucze-help">
          {mode === "calibrate"
            ? "Drag the large numbered handles to matching physical landmarks. The blue outline connects the four points in order."
            : `Click to add polygon corners on the ${isVideo ? "video frame" : "floorplan"}. Draw at least 3 points on each image for the same zone.`}
        </p>

        {mode === "calibrate" && image && (
          <div
            className="ucze-pixel-readout"
            aria-label={`${imageName} calibration pixel coordinates`}
          >
            <div className="ucze-pixel-readout-head">
              <strong>Pixel coordinates</strong>{" "}
              <span>
                {image.naturalWidth} × {image.naturalHeight} px
              </span>
            </div>

            <div className="ucze-pixel-grid">
              {points.map(([x, y], i) => (
                <div className="ucze-pixel-row" key={`${side}-pixel-${i}`}>
                  <span
                    className="ucze-pixel-point"
                    style={{ background: POINT_COLORS[i] }}
                  >
                    {i + 1}{" "}
                  </span>

                  <span>{POINT_LABELS[i]}</span>

                  <code>x: {Math.round(x * image.naturalWidth)} px</code>

                  <code>y: {Math.round(y * image.naturalHeight)} px</code>
                </div>
              ))}
            </div>
          </div>
        )}

        {mode === "calibrate" && (
          <div
            className="ucze-point-legend"
            aria-label="Calibration point order"
          >
            {POINT_LABELS.map((label, i) => (
              <span key={label} className="ucze-point-legend-item">
                <span
                  className="ucze-point-swatch"
                  style={{ background: POINT_COLORS[i] }}
                >
                  {i + 1}{" "}
                </span>
                <span>{label}</span>{" "}
              </span>
            ))}
          </div>
        )}

        {mode === "zones" && (
          <div className="ucze-draft-actions">
            <button
              type="button"
              className="ucze-button ucze-button--small"
              onClick={() => setDraft((prev) => prev.slice(0, -1))}
              disabled={!draft.length}
            >
              Undo point{" "}
            </button>

            <button
              type="button"
              className="ucze-button ucze-button--small"
              onClick={() => setDraft([])}
              disabled={!draft.length}
            >
              Clear polygon{" "}
            </button>
          </div>
        )}
      </section>
    );
  };

  const projectedCalibrationPoints = useMemo(() => {
    if (!hMatrix || !videoImage || !blueprintImage) return [];

    return videoPoints.map((p) =>
      projectPointWithH(
        [p[0] * videoImage.naturalWidth, p[1] * videoImage.naturalHeight],

        hMatrix,
      ),
    );
  }, [hMatrix, videoPoints, videoImage, blueprintImage]);

  return (
    <div className="ucze">
      <header className="ucze-header">
        <div>
          <h2>Camera Calibration & Zone Editor</h2>{" "}
          <p>
            Calibrate the camera-to-floorplan mapping, then define matching
            zones in both views.{" "}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="ucze-button ucze-button--primary"
            onClick={() => {
              if (hMatrix) {
                const calibration = {
                  id: initialConfig.id || uid(),
                  name:
                    initialConfig.name ||
                    `${videoItem?.name || "Camera"} Mapping`,
                  camera: videoItem?.camera || "cam_1_entrance",
                  videoResolution: videoImage
                    ? {
                        width: videoImage.naturalWidth,
                        height: videoImage.naturalHeight,
                      }
                    : initialConfig.videoResolution || {
                        width: 1280,
                        height: 720,
                      },
                  blueprintResolution: blueprintImage
                    ? {
                        width: blueprintImage.naturalWidth,
                        height: blueprintImage.naturalHeight,
                      }
                    : initialConfig.blueprintResolution || {
                        width: 800,
                        height: 600,
                      },
                  videoPoints: videoImage
                    ? toPixelPoints(videoPoints, videoImage)
                    : videoPoints,
                  blueprintPoints: blueprintImage
                    ? toPixelPoints(blueprintPoints, blueprintImage)
                    : blueprintPoints,
                  HMatrix: hMatrix,
                  zones,
                  videoSrc,
                  blueprintSrc,
                  appliedAt: new Date().toISOString(),
                };
                onSaveCalibration?.(calibration);
              }
              if (zones.length > 0) {
                onSaveZones?.(zones);
              }
              onClose?.();
            }}
          >
            <Check size={16} /> Save & Apply
          </button>
          {onClose && (
            <button type="button" className="ucze-button" onClick={onClose}>
              Close{" "}
            </button>
          )}
        </div>
      </header>

      <div className="ucze-tabs" role="tablist" aria-label="Editor mode">
        <button
          type="button"
          role="tab"
          aria-selected={mode === "calibrate"}
          className={mode === "calibrate" ? "is-active" : ""}
          onClick={() => setMode("calibrate")}
        >
          <Crosshair size={16} /> 1. Calibrate (4 points){" "}
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={mode === "zones"}
          className={mode === "zones" ? "is-active" : ""}
          onClick={() => setMode("zones")}
        >
          <Pentagon size={16} /> 2. Draw zones{" "}
        </button>
      </div>

      {mode === "calibrate" ? (
        <div className="ucze-toolbar">
          <span>
            Match the same four physical landmarks in both images. Points are
            numbered, color-coded, and connected in order.{" "}
          </span>

          <div className="ucze-actions">
            <button
              type="button"
              className="ucze-button"
              onClick={() => {
                setVideoPoints(DEFAULT_VIDEO_POINTS);
                setBlueprintPoints(DEFAULT_BLUEPRINT_POINTS);
                setHMatrix(null);
                setStatus("");
                setError("");
              }}
            >
              <RotateCcw size={15} /> Reset points
            </button>

            <button
              type="button"
              className="ucze-button ucze-button--primary"
              onClick={calculateH}
              disabled={isCalculating || !videoImage || !blueprintImage}
            >
              <Calculator size={16} />{" "}
              {isCalculating ? "Calculating..." : "Calculate H matrix"}
            </button>
          </div>

          {hMatrix && (
            <span className="ucze-success">
              <Check size={15} /> H matrix ready{" "}
            </span>
          )}
        </div>
      ) : (
        <div className="ucze-zone-form">
          <label>
            Zone name{" "}
            <input
              value={zoneName}
              onChange={(e) => setZoneName(e.target.value)}
              placeholder="e.g. Shelf 1"
            />
          </label>

          <label>
            Zone type{" "}
            <select
              value={zoneType}
              onChange={(e) => setZoneType(e.target.value)}
            >
              {ZONE_TYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}{" "}
                </option>
              ))}
            </select>
          </label>

          <label>
            Draw on{" "}
            <select
              value={activeSide}
              onChange={(e) => setActiveSide(e.target.value)}
            >
              <option value="video">Video frame</option>
              <option value="blueprint">Floorplan</option>{" "}
            </select>
          </label>

          <div className="ucze-actions">
            <button type="button" className="ucze-button" onClick={resetDrafts}>
              <RotateCcw size={15} /> Clear both drafts
            </button>

            <button
              type="button"
              className="ucze-button ucze-button--primary"
              onClick={createZone}
              disabled={draftVideo.length < 3 || draftBlueprint.length < 3}
            >
              <Plus size={15} /> Add paired zone{" "}
            </button>

            <button
              type="button"
              className="ucze-button ucze-button--primary"
              onClick={saveZones}
              disabled={!zones.length}
            >
              <Save size={15} /> Save zones{" "}
            </button>
          </div>

          <p className="ucze-help">
            Draw the same logical zone in both views: select “Draw on”, click at
            least three corners on that image, then switch views and draw the
            matching region. Add paired zone when both polygons are ready.{" "}
          </p>
        </div>
      )}

      <div className="ucze-grid">
        {renderStage("video")} {renderStage("blueprint")}
      </div>

      {mode === "calibrate" && hMatrix && (
        <details className="ucze-matrix">
          <summary>View H matrix</summary>{" "}
          <pre>{JSON.stringify(hMatrix, null, 2)}</pre>{" "}
          {projectedCalibrationPoints.length > 0 && (
            <p>
              Calibration matrix is available for trajectory projection. Confirm
              that the mapped points align with the floorplan.{" "}
            </p>
          )}
        </details>
      )}

      <section className="ucze-zone-list">
        <div className="ucze-zone-list-head">
          <h3>Defined zones ({zones.length})</h3>{" "}
          <button
            type="button"
            className="ucze-button"
            onClick={saveZones}
            disabled={!zones.length}
          >
            <Save size={15} /> Save zones{" "}
          </button>
        </div>

        {!zones.length ? (
          <p className="ucze-help">
            No zones yet. Switch to “Draw zones” and create a paired
            polygon.{" "}
          </p>
        ) : (
          <ul>
            {zones.map((z) => {
              const zColor =
                ZONE_TYPES.find((t) => t.id === z.type)?.color || "#EC4899";

              return (
                <li
                  key={z.id}
                  className={activeZoneId === z.id ? "is-active" : ""}
                >
                  <span
                    className="ucze-zone-dot"
                    style={{ background: zColor }}
                  />

                  <button
                    type="button"
                    className="ucze-zone-select"
                    onClick={() => setActiveZoneId(z.id)}
                  >
                    {z.name} <small>({z.type})</small>
                  </button>

                  <small>
                    Video: {z.videoPolygon?.length || 0} points · Floorplan:{" "}
                    {z.blueprintPolygon?.length || 0} points
                  </small>

                  <button
                    type="button"
                    className="ucze-icon-button"
                    aria-label={`Delete ${z.name}`}
                    onClick={() => removeZone(z.id)}
                  >
                    <Trash2 size={15} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {(error || status) && (
        <div
          className={
            error ? "ucze-message ucze-message--error" : "ucze-message"
          }
          role="status"
        >
          {error || status}{" "}
        </div>
      )}
    </div>
  );
}
