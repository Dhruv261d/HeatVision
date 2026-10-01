import React, { useRef, useState, useEffect, useCallback } from 'react';
import { RefreshCw, Check, Move, Upload, Image as ImageIcon } from 'lucide-react';

const POINT_LABELS = ['Top-Left', 'Top-Right', 'Bottom-Right', 'Bottom-Left'];
const POINT_COLORS = ['#EF4444', '#3B82F6', '#10B981', '#F59E0B']; // Red, Blue, Green, Yellow

export default function HomographyCalibrator({ onSaveCalibration }) {
  const videoCanvasRef = useRef(null);
  const blueprintCanvasRef = useRef(null);
  
  const videoInputRef = useRef(null);
  const blueprintInputRef = useRef(null);

  const [videoSrc, setVideoSrc] = useState('/sample-frame.jpg');
  const [blueprintSrc, setBlueprintSrc] = useState('/sample-blueprint.jpg');

  const [videoImage, setVideoImage] = useState(null);
  const [blueprintImage, setBlueprintImage] = useState(null);

  const [videoPoints, setVideoPoints] = useState([]);
  const [blueprintPoints, setBlueprintPoints] = useState([]);

  const [activeCanvas, setActiveCanvas] = useState(null); // 'video' | 'blueprint'
  const [activePointIndex, setActivePointIndex] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  // Load Video Frame Image
  useEffect(() => {
    if (!videoSrc) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = videoSrc;
    img.onload = () => {
      setVideoImage(img);
      const width = img.naturalWidth || 1280;
      const height = img.naturalHeight || 720;
      setVideoPoints([
        { x: Math.round(width * 0.15), y: Math.round(height * 0.15) },
        { x: Math.round(width * 0.85), y: Math.round(height * 0.15) },
        { x: Math.round(width * 0.85), y: Math.round(height * 0.85) },
        { x: Math.round(width * 0.15), y: Math.round(height * 0.85) },
      ]);
    };
    img.onerror = () => {
      // Fallback if sample image not found
      setVideoImage(null);
    };
  }, [videoSrc]);

  // Load Blueprint Image
  useEffect(() => {
    if (!blueprintSrc) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = blueprintSrc;
    img.onload = () => {
      setBlueprintImage(img);
      const width = img.naturalWidth || 800;
      const height = img.naturalHeight || 600;
      setBlueprintPoints([
        { x: Math.round(width * 0.20), y: Math.round(height * 0.20) },
        { x: Math.round(width * 0.80), y: Math.round(height * 0.20) },
        { x: Math.round(width * 0.80), y: Math.round(height * 0.80) },
        { x: Math.round(width * 0.20), y: Math.round(height * 0.80) },
      ]);
    };
    img.onerror = () => {
      setBlueprintImage(null);
    };
  }, [blueprintSrc]);

  const handleFileUpload = (e, type) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file (.png, .jpg, .jpeg)');
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    if (type === 'video') {
      setVideoSrc(objectUrl);
    } else {
      setBlueprintSrc(objectUrl);
    }
  };

  // Draw Canvas helper
  const drawCanvas = useCallback((canvasRef, img, points, title) => {
    const canvas = canvasRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext('2d');

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

    ctx.fillStyle = 'rgba(59, 130, 246, 0.2)';
    ctx.fill();
    ctx.strokeStyle = '#3B82F6';
    ctx.lineWidth = Math.max(2, Math.round(canvas.width / 300));
    ctx.stroke();

    // Draw interactive handles
    const radius = Math.max(8, Math.round(canvas.width / 100));
    points.forEach((pt, idx) => {
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, radius, 0, 2 * Math.PI);
      ctx.fillStyle = POINT_COLORS[idx];
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = `bold ${Math.max(12, Math.round(canvas.width / 60))}px sans-serif`;
      ctx.fillText(`${idx + 1}`, pt.x - 4, pt.y + 4);
    });
  }, []);

  useEffect(() => {
    if (videoImage) drawCanvas(videoCanvasRef, videoImage, videoPoints, 'Video Frame');
  }, [drawCanvas, videoImage, videoPoints]);

  useEffect(() => {
    if (blueprintImage) drawCanvas(blueprintCanvasRef, blueprintImage, blueprintPoints, 'Floorplan Blueprint');
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
    const canvasRef = canvasType === 'video' ? videoCanvasRef : blueprintCanvasRef;
    const points = canvasType === 'video' ? videoPoints : blueprintPoints;
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
    }
  };

  const handlePointerMove = (e) => {
    if (!isDragging || activePointIndex === null || !activeCanvas) return;
    const canvasRef = activeCanvas === 'video' ? videoCanvasRef : blueprintCanvasRef;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);

    const mousePos = getCanvasCoordinates(canvas, clientX, clientY);
    const clampedX = Math.max(0, Math.min(canvas.width, mousePos.x));
    const clampedY = Math.max(0, Math.min(canvas.height, mousePos.y));

    if (activeCanvas === 'video') {
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
        { x: Math.round(width * 0.20), y: Math.round(height * 0.20) },
        { x: Math.round(width * 0.80), y: Math.round(height * 0.20) },
        { x: Math.round(width * 0.80), y: Math.round(height * 0.80) },
        { x: Math.round(width * 0.20), y: Math.round(height * 0.80) },
      ]);
    }
  };

  const handleSave = () => {
    if (!videoCanvasRef.current || !blueprintCanvasRef.current) return;
    if (videoPoints.length !== 4 || blueprintPoints.length !== 4) return;

    const payload = {
      videoResolution: {
        width: videoCanvasRef.current.width,
        height: videoCanvasRef.current.height,
      },
      blueprintResolution: {
        width: blueprintCanvasRef.current.width,
        height: blueprintCanvasRef.current.height,
      },
      pairs: videoPoints.map((vPt, idx) => ({
        label: POINT_LABELS[idx],
        source: vPt,
        destination: blueprintPoints[idx],
      })),
    };

    console.log('[Calibration Payload Export]:', payload);
    alert('Calibration configuration saved and logged successfully!');
    if (onSaveCalibration) {
      onSaveCalibration(payload);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6 bg-slate-900 rounded-xl text-white max-w-7xl mx-auto shadow-2xl">
      <div className="flex flex-wrap justify-between items-center gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Move className="w-5 h-5 text-blue-400" />
            Dual-Canvas Camera Calibration
          </h2>
          <p className="text-xs text-slate-400">
            Map 4 coordinates on the Camera Video Frame (Left) to the 2D Store Floorplan Blueprint (Right) for spatial perspective alignment.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition border border-slate-700"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Reset
          </button>

          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-500 rounded-lg transition shadow-md"
          >
            <Check className="w-3.5 h-3.5" /> Save Calibration
          </button>
        </div>
      </div>

      {/* Grid containing side-by-side canvases */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Side: Video Frame */}
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center px-1">
            <span className="text-sm font-semibold text-slate-300">1. Video Frame Capture</span>
            <input
              type="file"
              ref={videoInputRef}
              onChange={(e) => handleFileUpload(e, 'video')}
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
                <p className="text-xs">No video frame snapshot uploaded.</p>
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
              onMouseDown={(e) => handlePointerDown('video', e)}
              onMouseMove={handlePointerMove}
              onMouseUp={handlePointerUp}
              onMouseLeave={handlePointerUp}
              onTouchStart={(e) => handlePointerDown('video', e)}
              onTouchMove={handlePointerMove}
              onTouchEnd={handlePointerUp}
              className={`max-w-full max-h-full object-contain cursor-crosshair ${
                !videoImage ? 'hidden' : 'block'
              }`}
            />
          </div>
        </div>

        {/* Right Side: Blueprint */}
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center px-1">
            <span className="text-sm font-semibold text-slate-300">2. 2D Floorplan Blueprint</span>
            <input
              type="file"
              ref={blueprintInputRef}
              onChange={(e) => handleFileUpload(e, 'blueprint')}
              accept="image/*"
              className="hidden"
            />
            <button
              onClick={() => blueprintInputRef.current?.click()}
              className="flex items-center gap-1 px-2.5 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 rounded transition border border-slate-700 text-slate-300"
            >
              <Upload className="w-3 h-3 text-blue-400" /> Upload Floorplan
            </button>
          </div>
          <div className="relative overflow-hidden bg-slate-950 rounded-lg border border-slate-800 flex justify-center items-center aspect-video min-h-[300px]">
            {!blueprintImage && (
              <div className="flex flex-col items-center gap-2 text-slate-500">
                <ImageIcon className="w-8 h-8 stroke-1" />
                <p className="text-xs">No floorplan blueprint uploaded.</p>
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
              onMouseDown={(e) => handlePointerDown('blueprint', e)}
              onMouseMove={handlePointerMove}
              onMouseUp={handlePointerUp}
              onMouseLeave={handlePointerUp}
              onTouchStart={(e) => handlePointerDown('blueprint', e)}
              onTouchMove={handlePointerMove}
              onTouchEnd={handlePointerUp}
              className={`max-w-full max-h-full object-contain cursor-crosshair ${
                !blueprintImage ? 'hidden' : 'block'
              }`}
            />
          </div>
        </div>
      </div>

      {/* Corresponding Points List & Connection lines info */}
      <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-800/80">
        <h3 className="text-sm font-semibold mb-3 text-blue-400">Homography Mapping Coordinates</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {POINT_LABELS.map((label, idx) => {
            const vPt = videoPoints[idx];
            const bPt = blueprintPoints[idx];
            return (
              <div
                key={idx}
                className="bg-slate-900/60 p-3 rounded-lg border border-slate-800 flex flex-col gap-1.5"
              >
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
                <div className="flex flex-col text-[11px] font-mono text-slate-400 gap-0.5">
                  <div>
                    <span className="text-blue-400">Frame:</span> {vPt ? `X: ${vPt.x} | Y: ${vPt.y}` : 'Not set'}
                  </div>
                  <div>
                    <span className="text-emerald-400">Blueprint:</span> {bPt ? `X: ${bPt.x} | Y: ${bPt.y}` : 'Not set'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}