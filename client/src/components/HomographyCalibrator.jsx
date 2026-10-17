import React, { useRef, useState, useEffect, useCallback } from "react";
import {
  RefreshCw,
  Check,
  CheckCircle2,
  Move,
  Upload,
  Image as ImageIcon,
  Calculator,
  Loader2,
  Copy,
  AlertCircle,
  Sparkles,
  ArrowRight,
  HelpCircle,
  X,
  BookmarkPlus,
  Layers,
  Video as VideoIcon,
} from "lucide-react";

const POINT_LABELS = ["Top-Left", "Top-Right", "Bottom-Right", "Bottom-Left"];
const POINT_COLORS = ["#EF4444", "#3B82F6", "#10B981", "#F59E0B"]; // Red, Blue, Green, Yellow

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

// Helper to project a single (x, y) using a 3x3 homography matrix H
const projectPointWithH = (pt, H) => {
  if (!pt || !H || !Array.isArray(H) || H.length !== 3) return null;
  const x = Number(pt.x);
  const y = Number(pt.y);
  const w = H[2][0] * x + H[2][1] * y + H[2][2];
  if (Math.abs(w) < 1e-9) return null;
  const u = (H[0][0] * x + H[0][1] * y + H[0][2]) / w;
  const v = (H[1][0] * x + H[1][1] * y + H[1][2]) / w;
  return { u: Math.round(u * 100) / 100, v: Math.round(v * 100) / 100 };
};

export default function HomographyCalibrator({
  videoItem,
  initialConfig,
  onSaveCalibration,
  onClose,
  onSaveAsPreset,
  presets = [],
}) {
  const videoCanvasRef = useRef(null);
  const blueprintCanvasRef = useRef(null);

  const videoInputRef = useRef(null);
  const blueprintInputRef = useRef(null);

  const [videoSrc, setVideoSrc] = useState(initialConfig?.videoSrc || null);
  const [blueprintSrc, setBlueprintSrc] = useState(
    initialConfig?.blueprintSrc || null,
  );

  const [videoImage, setVideoImage] = useState(null);
  const [blueprintImage, setBlueprintImage] = useState(null);

  const [videoPoints, setVideoPoints] = useState(
    initialConfig?.videoPoints || [],
  );
  const [blueprintPoints, setBlueprintPoints] = useState(
    initialConfig?.blueprintPoints || [],
  );

  const [activeCanvas, setActiveCanvas] = useState(null); // 'video' | 'blueprint'
  const [activePointIndex, setActivePointIndex] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  // Mapping identity state
  const [mappingName, setMappingName] = useState(
    initialConfig?.name ||
      (videoItem?.name ? `${videoItem.name} Mapping` : "Camera Mapping 1"),
  );
  const [saveAsPresetOption, setSaveAsPresetOption] = useState(false);

  // Caligraphy API state
  const [isCalculating, setIsCalculating] = useState(false);
  const [hMatrix, setHMatrix] = useState(initialConfig?.HMatrix || null);
  const [apiError, setApiError] = useState(null);
  const [copiedMatrix, setCopiedMatrix] = useState(false);
  const [coordinatesFinalized, setCoordinatesFinalized] = useState(
    Boolean(initialConfig?.HMatrix),
  );

  // Test point projection interactive calculator
  const [testCoords, setTestCoords] = useState({ x: 300, y: 300 });

  // Extract real frame thumbnail from videoItem file if provided
  useEffect(() => {
    if (videoItem?.file && videoItem.file.type?.startsWith("video/")) {
      try {
        const videoEl = document.createElement("video");
        const videoUrl = URL.createObjectURL(videoItem.file);
        videoEl.src = videoUrl;
        videoEl.muted = true;
        videoEl.playsInline = true;
        videoEl.crossOrigin = "anonymous";

        videoEl.onloadeddata = () => {
          videoEl.currentTime = Math.min(1.0, (videoEl.duration || 2) / 3);
        };

        videoEl.onseeked = () => {
          try {
            const canvas = document.createElement("canvas");
            canvas.width = videoEl.videoWidth || 1280;
            canvas.height = videoEl.videoHeight || 720;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
            const snapshotUrl = canvas.toDataURL("image/jpeg", 0.85);
            setVideoSrc(snapshotUrl);
          } catch (canvasErr) {
            console.warn("Could not extract frame to dataUrl:", canvasErr);
          } finally {
            URL.revokeObjectURL(videoUrl);
          }
        };

        videoEl.onerror = () => {
          URL.revokeObjectURL(videoUrl);
        };
      } catch (err) {
        console.warn("Video snapshot generator exception:", err);
      }
    }
  }, [videoItem]);

  // Sync initialConfig updates
  useEffect(() => {
    if (initialConfig) {
      if (initialConfig.videoPoints?.length === 4)
        setVideoPoints(initialConfig.videoPoints);
      if (initialConfig.blueprintPoints?.length === 4)
        setBlueprintPoints(initialConfig.blueprintPoints);
      if (initialConfig.HMatrix) {
        setHMatrix(initialConfig.HMatrix);
        setCoordinatesFinalized(true);
      }
      if (initialConfig.name) setMappingName(initialConfig.name);
      if (initialConfig.videoSrc) setVideoSrc(initialConfig.videoSrc);
      if (initialConfig.blueprintSrc)
        setBlueprintSrc(initialConfig.blueprintSrc);
    }
  }, [initialConfig]);

  // Load Video Frame Image
  useEffect(() => {
    if (!videoSrc) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = videoSrc;
    img.onload = () => {
      setVideoImage(img);
      const width = img.naturalWidth || 1280;
      const height = img.naturalHeight || 720;
      setVideoPoints((prev) => {
        if (prev && prev.length === 4) return prev;
        return [
          { x: Math.round(width * 0.15), y: Math.round(height * 0.15) },
          { x: Math.round(width * 0.85), y: Math.round(height * 0.15) },
          { x: Math.round(width * 0.85), y: Math.round(height * 0.85) },
          { x: Math.round(width * 0.15), y: Math.round(height * 0.85) },
        ];
      });
    };
    img.onerror = () => {
      setVideoImage(null);
    };
  }, [videoSrc]);

  // Load Blueprint Image
  useEffect(() => {
    if (!blueprintSrc) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = blueprintSrc;
    img.onload = () => {
      setBlueprintImage(img);
      const width = img.naturalWidth || 800;
      const height = img.naturalHeight || 600;
      setBlueprintPoints((prev) => {
        if (prev && prev.length === 4) return prev;
        return [
          { x: Math.round(width * 0.2), y: Math.round(height * 0.2) },
          { x: Math.round(width * 0.8), y: Math.round(height * 0.2) },
          { x: Math.round(width * 0.8), y: Math.round(height * 0.8) },
          { x: Math.round(width * 0.2), y: Math.round(height * 0.8) },
        ];
      });
    };
    img.onerror = () => {
      setBlueprintImage(null);
    };
  }, [blueprintSrc]);

  const handleFileUpload = (e, type) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please upload a valid image file (.png, .jpg, .jpeg)");
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    if (type === "video") {
      setVideoSrc(objectUrl);
    } else {
      setBlueprintSrc(objectUrl);
    }
    // Invalidate prior matrix when new image uploaded
    setHMatrix(null);
    setCoordinatesFinalized(false);
  };

  // Draw Canvas helper
  const drawCanvas = useCallback((canvasRef, img, points) => {
    const canvas = canvasRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext("2d");

    canvas.width = img.naturalWidth || 1280;
    canvas.height = img.naturalHeight || 720;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    if (points.length < 4) return;

    // Draw Polygon overlay
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.closePath();

    ctx.fillStyle = "rgba(59, 130, 246, 0.18)";
    ctx.fill();
    ctx.strokeStyle = "#3B82F6";
    ctx.lineWidth = Math.max(2, Math.round(canvas.width / 350));
    ctx.stroke();

    // Draw interactive handles
    const radius = Math.max(8, Math.round(canvas.width / 95));
    points.forEach((pt, idx) => {
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, radius, 0, 2 * Math.PI);
      ctx.fillStyle = POINT_COLORS[idx];
      ctx.fill();
      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.fillStyle = "#FFFFFF";
      ctx.font = `bold ${Math.max(12, Math.round(canvas.width / 65))}px sans-serif`;
      ctx.fillText(`${idx + 1}`, pt.x - 4, pt.y + 4);
    });
  }, []);

  useEffect(() => {
    if (videoImage) drawCanvas(videoCanvasRef, videoImage, videoPoints);
  }, [drawCanvas, videoImage, videoPoints]);

  useEffect(() => {
    if (blueprintImage)
      drawCanvas(blueprintCanvasRef, blueprintImage, blueprintPoints);
  }, [drawCanvas, blueprintImage, blueprintPoints]);

  const getCanvasCoordinates = (canvas, clientX, clientY) => {
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: Math.round((clientX - rect.left) * scaleX),
      y: Math.round((clientY - rect.top) * scaleY),
    };
  };

  const handlePointerDown = (canvasType, e) => {
    const canvasRef =
      canvasType === "video" ? videoCanvasRef : blueprintCanvasRef;
    const points = canvasType === "video" ? videoPoints : blueprintPoints;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);

    const mousePos = getCanvasCoordinates(canvas, clientX, clientY);
    const radiusThreshold = Math.max(30, canvas.width / 25);

    const clickedIdx = points.findIndex((pt) => {
      const dist = Math.hypot(pt.x - mousePos.x, pt.y - mousePos.y);
      return dist <= radiusThreshold;
    });

    if (clickedIdx !== -1) {
      setActiveCanvas(canvasType);
      setActivePointIndex(clickedIdx);
      setIsDragging(true);
      // Coordinate touched; indicate un-finalized until re-calibrated
      setCoordinatesFinalized(false);
    }
  };

  const handlePointerMove = (e) => {
    if (!isDragging || activePointIndex === null || !activeCanvas) return;
    const canvasRef =
      activeCanvas === "video" ? videoCanvasRef : blueprintCanvasRef;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);

    const mousePos = getCanvasCoordinates(canvas, clientX, clientY);
    const clampedX = Math.max(0, Math.min(canvas.width, mousePos.x));
    const clampedY = Math.max(0, Math.min(canvas.height, mousePos.y));

    if (activeCanvas === "video") {
      setVideoPoints((prev) => {
        const updated = [...prev];
        updated[activePointIndex] = { x: clampedX, y: clampedY };
        return updated;
      });
    } else {
      setBlueprintPoints((prev) => {
        const updated = [...prev];
        updated[activePointIndex] = { x: clampedX, y: clampedY };
        return updated;
      });
    }
  };

  const handlePointerUp = () => {
    setIsDragging(false);
    setActivePointIndex(null);
    setActiveCanvas(null);
  };

  const handleReset = () => {
    if (videoImage && videoCanvasRef.current) {
      const width = videoCanvasRef.current.width;
      const height = videoCanvasRef.current.height;
      setVideoPoints([
        { x: Math.round(width * 0.15), y: Math.round(height * 0.15) },
        { x: Math.round(width * 0.85), y: Math.round(height * 0.15) },
        { x: Math.round(width * 0.85), y: Math.round(height * 0.85) },
        { x: Math.round(width * 0.15), y: Math.round(height * 0.85) },
      ]);
    }
    if (blueprintImage && blueprintCanvasRef.current) {
      const width = blueprintCanvasRef.current.width;
      const height = blueprintCanvasRef.current.height;
      setBlueprintPoints([
        { x: Math.round(width * 0.2), y: Math.round(height * 0.2) },
        { x: Math.round(width * 0.8), y: Math.round(height * 0.2) },
        { x: Math.round(width * 0.8), y: Math.round(height * 0.8) },
        { x: Math.round(width * 0.2), y: Math.round(height * 0.8) },
      ]);
    }
    setHMatrix(null);
    setApiError(null);
    setCoordinatesFinalized(false);
  };

  /**
   * Finalizes both video and floorplan coordinates and calls the Caligraphy API
   * to compute and return the 3x3 Homography (H) matrix.
   */
  const handleFinalizeAndCalibrate = async () => {
    if (videoPoints.length !== 4 || blueprintPoints.length !== 4) {
      alert(
        "Please ensure 4 coordinates are defined on both the Video Frame and Floorplan Blueprint.",
      );
      return;
    }

    setIsCalculating(true);
    setApiError(null);

    try {
      // Primary route: /api/caligraphy/calibrate, fallback: /api/calibrate
      const endpoint = `${API_BASE_URL}/api/caligraphy/calibrate`;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          videoPoints,
          blueprintPoints,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || data.error || "Caligraphy API calculation failed",
        );
      }

      const calculatedH = data.HMatrix;
      setHMatrix(calculatedH);
      setCoordinatesFinalized(true);

      const payload = {
        id: initialConfig?.id || `map_${Date.now()}`,
        name: mappingName.trim() || `Mapping for ${videoItem?.name || "Video"}`,
        camera: videoItem?.camera || "cam_1_entrance",

        videoResolution: {
          width: videoCanvasRef.current?.width || 1280,
          height: videoCanvasRef.current?.height || 720,
        },

        blueprintResolution: {
          width: blueprintCanvasRef.current?.width || 800,
          height: blueprintCanvasRef.current?.height || 600,
        },

        // Four calibration correspondence points
        videoPoints,
        blueprintPoints,

        pairs: videoPoints.map((vPt, idx) => ({
          label: POINT_LABELS[idx],
          source: vPt,
          destination: blueprintPoints[idx],
        })),

        HMatrix: calculatedH,
        videoSrc,
        blueprintSrc,
        appliedAt: new Date().toISOString(),
      };

      if (onSaveCalibration) {
        onSaveCalibration(payload);
      }
      console.log(
        "[Caligraphy API]: H Matrix Calculated Successfully:",
        calculatedH,
      );
    } catch (err) {
      console.error("[Caligraphy API Error]:", err);
      setApiError(err.message || "Failed to reach caligraphy API service");
    } finally {
      setIsCalculating(false);
    }
  };

  const handleSave = () => {
    if (!videoCanvasRef.current || !blueprintCanvasRef.current) return;
    if (videoPoints.length !== 4 || blueprintPoints.length !== 4) {
      alert(
        "Please ensure 4 coordinates are placed on both the Video Frame and Floorplan Blueprint.",
      );
      return;
    }

    if (!hMatrix) {
      // Automatically calculate and finalize H matrix on save
      handleFinalizeAndCalibrate();
      return;
    }

    const payload = {
      id: initialConfig?.id || `map_${Date.now()}`,
      name: mappingName.trim() || `Mapping for ${videoItem?.name || "Video"}`,
      camera: videoItem?.camera || "cam_1_entrance",
      videoResolution: {
        width: videoCanvasRef.current.width,
        height: videoCanvasRef.current.height,
      },
      blueprintResolution: {
        width: blueprintCanvasRef.current.width,
        height: blueprintCanvasRef.current.height,
      },
      videoPoints,
      blueprintPoints,
      pairs: videoPoints.map((vPt, idx) => ({
        label: POINT_LABELS[idx],
        source: vPt,
        destination: blueprintPoints[idx],
      })),
      HMatrix: hMatrix,
      videoSrc,
      blueprintSrc,
      appliedAt: new Date().toISOString(),
    };

    console.log("[Calibration Payload Export]:", payload);
    if (onSaveCalibration) {
      onSaveCalibration(payload);
    }
    if (saveAsPresetOption && onSaveAsPreset) {
      onSaveAsPreset(payload);
    }
    if (onClose) {
      onClose();
    }
  };

  const handleCopyMatrix = () => {
    if (!hMatrix) return;
    navigator.clipboard.writeText(JSON.stringify(hMatrix, null, 2));
    setCopiedMatrix(true);
    setTimeout(() => setCopiedMatrix(false), 2500);
  };

  const arePointsReady =
    videoPoints.length === 4 && blueprintPoints.length === 4;
  const liveProjectedTest = hMatrix
    ? projectPointWithH(testCoords, hMatrix)
    : null;

  return (
    <div className="flex flex-col gap-6 p-6 bg-slate-900 rounded-xl text-white max-w-7xl mx-auto shadow-2xl border border-slate-800">
      {/* Top Header & Actions Bar */}
      <div className="flex flex-wrap justify-between items-center gap-4 border-b border-slate-800 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Move className="w-5 h-5 text-blue-400" />
              Dual-Canvas Camera Calibration
            </h2>
            {videoItem && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1.5">
                <VideoIcon size={12} />
                {videoItem.name || videoItem.file?.name} ({videoItem.camera})
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400">
            Map 4 coordinates on the Camera Video Frame (Left) to the 2D Store
            Floorplan Blueprint (Right) to calculate the perspective homography
            (H) matrix.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Preset quick loader if available */}
          {presets.length > 0 && (
            <div className="flex items-center gap-1.5">
              <Layers size={14} className="text-slate-400" />
              <select
                onChange={(e) => {
                  const sel = presets.find((p) => p.id === e.target.value);
                  if (sel) {
                    if (sel.videoPoints?.length === 4)
                      setVideoPoints(sel.videoPoints);
                    if (sel.blueprintPoints?.length === 4)
                      setBlueprintPoints(sel.blueprintPoints);
                    if (sel.HMatrix) {
                      setHMatrix(sel.HMatrix);
                      setCoordinatesFinalized(true);
                    }
                    if (sel.name) setMappingName(sel.name);
                  }
                }}
                className="bg-slate-800 text-xs px-2.5 py-1.5 rounded-lg border border-slate-700 text-slate-200 focus:outline-none focus:border-blue-500"
                defaultValue=""
              >
                <option value="" disabled>
                  Load Preset Points...
                </option>
                {presets.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={handleReset}
            disabled={isCalculating}
            className="flex items-center gap-1.5 px-3 py-2 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition border border-slate-700 disabled:opacity-50"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Reset
          </button>

          {/* Primary Action: Finalize & Call Caligraphy API */}
          <button
            onClick={handleFinalizeAndCalibrate}
            disabled={!arePointsReady || isCalculating}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition shadow-md ${
              coordinatesFinalized && hMatrix
                ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                : "bg-blue-600 hover:bg-blue-500 text-white"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isCalculating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Calculating H Matrix...
              </>
            ) : coordinatesFinalized && hMatrix ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Coordinates Finalized & Calibrated
              </>
            ) : (
              <>
                <Calculator className="w-4 h-4" />
                Finalize & Calculate H-Matrix
              </>
            )}
          </button>

          <button
            onClick={handleSave}
            disabled={isCalculating}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition shadow-md shadow-emerald-600/30"
          >
            <Check className="w-3.5 h-3.5" />
            {videoItem ? "Apply & Save to Video" : "Save Calibration"}
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              title="Close Calibrator"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Mapping Configuration Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-lg bg-slate-950/80 border border-slate-800 text-xs">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <label className="text-slate-400 font-medium whitespace-nowrap">
            Mapping Name:
          </label>
          <input
            type="text"
            value={mappingName}
            onChange={(e) => setMappingName(e.target.value)}
            placeholder="e.g. Entrance Gate Mapping"
            className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs text-white focus:outline-none focus:border-blue-500 flex-1"
          />
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          {onSaveAsPreset && (
            <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={saveAsPresetOption}
                onChange={(e) => setSaveAsPresetOption(e.target.checked)}
                className="rounded bg-slate-900 border-slate-700 text-blue-600 focus:ring-0"
              />
              <BookmarkPlus size={14} className="text-blue-400" />
              <span>Also save as reusable store preset</span>
            </label>
          )}

          <div className="flex items-center gap-2">
            {hMatrix ? (
              <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-800/80 font-medium text-[11px]">
                <Sparkles className="w-3 h-3 text-emerald-400" /> H-Matrix
                Active (3×3)
              </span>
            ) : (
              <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-950/60 text-amber-300 border border-amber-800/60 text-[11px]">
                H-Matrix Pending
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Coordinate status & feedback strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 rounded-lg bg-slate-950/70 border border-slate-800 text-xs">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="flex items-center gap-1.5 text-slate-300 font-medium">
            <span
              className={`w-2 h-2 rounded-full ${
                videoPoints.length === 4 ? "bg-emerald-400" : "bg-amber-400"
              }`}
            />
            Video Coordinates:{" "}
            <span className="font-mono text-blue-400 font-semibold">
              {videoPoints.length}/4
            </span>
          </span>
          <span className="flex items-center gap-1.5 text-slate-300 font-medium">
            <span
              className={`w-2 h-2 rounded-full ${
                blueprintPoints.length === 4 ? "bg-emerald-400" : "bg-amber-400"
              }`}
            />
            Blueprint Coordinates:{" "}
            <span className="font-mono text-emerald-400 font-semibold">
              {blueprintPoints.length}/4
            </span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          {hMatrix ? (
            <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-800/80 font-medium text-[11px]">
              <Sparkles className="w-3 h-3 text-emerald-400" /> H-Matrix Active
              (3x3)
            </span>
          ) : (
            <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 text-[11px]">
              Pending Finalization
            </span>
          )}
        </div>
      </div>

      {/* API Error Notification */}
      {apiError && (
        <div className="flex items-center justify-between gap-3 p-3.5 rounded-lg bg-red-950/60 border border-red-800/80 text-red-200 text-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span>
              <strong>Caligraphy API Error:</strong> {apiError}
            </span>
          </div>
          <button
            onClick={handleFinalizeAndCalibrate}
            className="px-2.5 py-1 text-[11px] bg-red-800/80 hover:bg-red-700 rounded text-white transition font-medium"
          >
            Retry
          </button>
        </div>
      )}

      {/* Grid containing side-by-side canvases */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Side: Video Frame */}
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center px-1">
            <span className="text-sm font-semibold text-slate-300 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
              1. Camera Video Frame Capture
            </span>
            <input
              type="file"
              ref={videoInputRef}
              onChange={(e) => handleFileUpload(e, "video")}
              accept="image/*"
              className="hidden"
            />
            <button
              onClick={() => videoInputRef.current?.click()}
              className="flex items-center gap-1 px-2.5 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 rounded transition border border-slate-700 text-slate-300"
            >
              <Upload className="w-3 h-3 text-blue-400" /> Upload Frame
            </button>
          </div>
          <div className="relative overflow-hidden bg-slate-950 rounded-lg border border-slate-800 flex justify-center items-center aspect-video min-h-[300px]">
            {!videoImage && (
              <div className="flex flex-col items-center gap-2 text-slate-500">
                <ImageIcon className="w-8 h-8 stroke-1" />
                <p className="text-xs">No video frame snapshot loaded.</p>
                <button
                  onClick={() => videoInputRef.current?.click()}
                  className="px-3 py-1.5 text-[11px] bg-blue-600 hover:bg-blue-500 text-white rounded transition"
                >
                  Upload Frame
                </button>
              </div>
            )}
            <canvas
              ref={videoCanvasRef}
              onMouseDown={(e) => handlePointerDown("video", e)}
              onMouseMove={handlePointerMove}
              onMouseUp={handlePointerUp}
              onMouseLeave={handlePointerUp}
              onTouchStart={(e) => handlePointerDown("video", e)}
              onTouchMove={handlePointerMove}
              onTouchEnd={handlePointerUp}
              className={`max-w-full max-h-full object-contain cursor-crosshair select-none ${
                !videoImage ? "hidden" : "block"
              }`}
            />
          </div>
          <p className="text-[11px] text-slate-400 px-1">
            Drag the 4 handles to match the 4 reference corners of your camera
            floor area.
          </p>
        </div>

        {/* Right Side: Blueprint */}
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center px-1">
            <span className="text-sm font-semibold text-slate-300 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              2. 2D Floorplan Blueprint
            </span>
            <input
              type="file"
              ref={blueprintInputRef}
              onChange={(e) => handleFileUpload(e, "blueprint")}
              accept="image/*"
              className="hidden"
            />
            <button
              onClick={() => blueprintInputRef.current?.click()}
              className="flex items-center gap-1 px-2.5 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 rounded transition border border-slate-700 text-slate-300"
            >
              <Upload className="w-3 h-3 text-emerald-400" /> Upload Floorplan
            </button>
          </div>
          <div className="relative overflow-hidden bg-slate-950 rounded-lg border border-slate-800 flex justify-center items-center aspect-video min-h-[300px]">
            {!blueprintImage && (
              <div className="flex flex-col items-center gap-2 text-slate-500">
                <ImageIcon className="w-8 h-8 stroke-1" />
                <p className="text-xs">No floorplan blueprint loaded.</p>
                <button
                  onClick={() => blueprintInputRef.current?.click()}
                  className="px-3 py-1.5 text-[11px] bg-blue-600 hover:bg-blue-500 text-white rounded transition"
                >
                  Upload Floorplan
                </button>
              </div>
            )}
            <canvas
              ref={blueprintCanvasRef}
              onMouseDown={(e) => handlePointerDown("blueprint", e)}
              onMouseMove={handlePointerMove}
              onMouseUp={handlePointerUp}
              onMouseLeave={handlePointerUp}
              onTouchStart={(e) => handlePointerDown("blueprint", e)}
              onTouchMove={handlePointerMove}
              onTouchEnd={handlePointerUp}
              className={`max-w-full max-h-full object-contain cursor-crosshair select-none ${
                !blueprintImage ? "hidden" : "block"
              }`}
            />
          </div>
          <p className="text-[11px] text-slate-400 px-1">
            Position each corresponding point at the identical store landmark on
            the blueprint.
          </p>
        </div>
      </div>

      {/* Corresponding Points List */}
      <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-800/80">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-blue-400 flex items-center gap-1.5">
            <Move className="w-4 h-4" />
            Homography Mapping Coordinates
          </h3>
          <span className="text-[11px] text-slate-400">
            Source (Video) &rarr; Destination (Floorplan)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {POINT_LABELS.map((label, idx) => {
            const vPt = videoPoints[idx];
            const bPt = blueprintPoints[idx];
            const predicted =
              hMatrix && vPt ? projectPointWithH(vPt, hMatrix) : null;
            const errorDist =
              predicted && bPt
                ? Math.hypot(predicted.u - bPt.x, predicted.v - bPt.y).toFixed(
                    2,
                  )
                : null;

            return (
              <div
                key={idx}
                className="bg-slate-900/80 p-3 rounded-lg border border-slate-800 flex flex-col gap-1.5"
              >
                <div className="flex items-center justify-between">
                  <span
                    className="text-xs font-bold flex items-center gap-1.5"
                    style={{ color: POINT_COLORS[idx] }}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full inline-block"
                      style={{ backgroundColor: POINT_COLORS[idx] }}
                    />
                    Point {idx + 1}: {label}
                  </span>
                  {errorDist && (
                    <span className="text-[10px] text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/60">
                      &Delta; {errorDist}px
                    </span>
                  )}
                </div>

                <div className="flex flex-col text-[11px] font-mono text-slate-400 gap-0.5">
                  <div>
                    <span className="text-blue-400 font-sans">
                      Frame (X,Y):
                    </span>{" "}
                    {vPt ? `${vPt.x}, ${vPt.y}` : "Not set"}
                  </div>
                  <div>
                    <span className="text-emerald-400 font-sans">
                      Blueprint (U,V):
                    </span>{" "}
                    {bPt ? `${bPt.x}, ${bPt.y}` : "Not set"}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Homography Matrix Result Panel */}
      {hMatrix && (
        <div className="bg-gradient-to-br from-slate-900 to-slate-950 p-5 rounded-xl border border-emerald-500/30 shadow-xl flex flex-col gap-4 animate-in fade-in duration-300">
          <div className="flex flex-wrap justify-between items-center gap-3 border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  Caligraphy API Result: 3&times;3 Homography Matrix (H)
                  <span className="text-[10px] font-normal px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                    H &times; [x, y, 1]&supT; = [u', v', w']&supT;
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  Perspective transformation matrix computed from 4
                  correspondence points.
                </p>
              </div>
            </div>

            <button
              onClick={handleCopyMatrix}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition border border-slate-700 font-medium"
            >
              <Copy className="w-3.5 h-3.5 text-blue-400" />
              {copiedMatrix ? "Copied JSON!" : "Copy Matrix"}
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 3x3 Matrix Grid Table */}
            <div className="lg:col-span-2 flex flex-col gap-2">
              <span className="text-xs font-semibold text-slate-300">
                Homography Transformation Matrix [H]
              </span>
              <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800 font-mono text-xs overflow-x-auto">
                <table className="w-full text-center border-collapse">
                  <tbody>
                    {hMatrix.map((row, rIdx) => (
                      <tr
                        key={rIdx}
                        className="border-b border-slate-800/50 last:border-0"
                      >
                        {row.map((val, cIdx) => (
                          <td key={cIdx} className="p-2.5">
                            <span className="text-[10px] text-slate-500 block">
                              h{rIdx}
                              {cIdx}
                            </span>
                            <span
                              className={`font-semibold ${
                                rIdx === 2 && cIdx === 2
                                  ? "text-blue-400"
                                  : "text-emerald-300"
                              }`}
                            >
                              {typeof val === "number"
                                ? val.toFixed(6)
                                : String(val)}
                            </span>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Live Interactive Projection Verifier */}
            <div className="flex flex-col gap-2 bg-slate-950/60 p-3.5 rounded-lg border border-slate-800">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                Live Coordinate Projection Verifier
              </span>
              <p className="text-[11px] text-slate-400">
                Input any camera frame coordinate to test its projected
                floorplan coordinate.
              </p>

              <div className="grid grid-cols-2 gap-2 mt-1">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">
                    Frame X
                  </label>
                  <input
                    type="number"
                    value={testCoords.x}
                    onChange={(e) =>
                      setTestCoords((prev) => ({
                        ...prev,
                        x: Number(e.target.value) || 0,
                      }))
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs font-mono text-blue-300 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">
                    Frame Y
                  </label>
                  <input
                    type="number"
                    value={testCoords.y}
                    onChange={(e) =>
                      setTestCoords((prev) => ({
                        ...prev,
                        y: Number(e.target.value) || 0,
                      }))
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs font-mono text-blue-300 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="mt-2 p-2.5 rounded bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  Floorplan:
                  <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                </span>
                <span className="text-xs font-mono font-bold text-emerald-400">
                  {liveProjectedTest
                    ? `U: ${liveProjectedTest.u} | V: ${liveProjectedTest.v}`
                    : "Invalid projection"}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
