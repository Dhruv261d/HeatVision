import React, { useRef, useState, useEffect, useCallback } from 'react';
import { RefreshCw, Check, Move, Upload, Image as ImageIcon } from 'lucide-react';

const POINT_LABELS = ['Top-Left', 'Top-Right', 'Bottom-Right', 'Bottom-Left'];
const POINT_COLORS = ['#EF4444', '#3B82F6', '#10B981', '#F59E0B']; // Red, Blue, Green, Yellow

export default function HomographyCalibrator({ imageSrc: initialImageSrc, onSaveCalibration }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const fileInputRef = useRef(null);

  const [imageSrc, setImageSrc] = useState(initialImageSrc || '');
  const [image, setImage] = useState(null);
  const [points, setPoints] = useState([]); // Selected [{x, y}] in canvas px
  const [activePointIndex, setActivePointIndex] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  // Load Image when imageSrc changes
  useEffect(() => {
    if (!imageSrc) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageSrc;
    img.onload = () => {
      setImage(img);
      setPoints([]); // Reset points for new image dimensions
    };
  }, [imageSrc]);

  // Set default inset points when image loads
  useEffect(() => {
    if (image && canvasRef.current && points.length === 0) {
      const width = canvasRef.current.width;
      const height = canvasRef.current.height;

      setPoints([
        { x: Math.round(width * 0.2), y: Math.round(height * 0.2) }, // TL
        { x: Math.round(width * 0.8), y: Math.round(height * 0.2) }, // TR
        { x: Math.round(width * 0.8), y: Math.round(height * 0.8) }, // BR
        { x: Math.round(width * 0.2), y: Math.round(height * 0.8) }  // BL
      ]);
    }
  }, [image, points]);

  // Handle local image file upload
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file (.png, .jpg, .jpeg)');
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setImageSrc(objectUrl);
  };

  // Draw Canvas
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;
    const ctx = canvas.getContext('2d');

    canvas.width = image.naturalWidth || 1280;
    canvas.height = image.naturalHeight || 720;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    if (points.length < 4) return;

    // Draw polygon overlay connecting 4 points
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.closePath();

    ctx.fillStyle = 'rgba(59, 130, 246, 0.25)';
    ctx.fill();
    ctx.strokeStyle = '#3B82F6';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Draw corner handles and labels
    points.forEach((pt, idx) => {
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 10, 0, 2 * Math.PI);
      ctx.fillStyle = POINT_COLORS[idx];
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText(`${idx + 1}. ${POINT_LABELS[idx]}`, pt.x + 14, pt.y + 5);
    });
  }, [image, points]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  const getCanvasCoordinates = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: Math.round((e.clientX - rect.left) * scaleX),
      y: Math.round((e.clientY - rect.top) * scaleY)
    };
  };

  const handleMouseDown = (e) => {
    const mousePos = getCanvasCoordinates(e);
    const clickedIdx = points.findIndex((pt) => {
      const dist = Math.hypot(pt.x - mousePos.x, pt.y - mousePos.y);
      return dist <= 25;
    });

    if (clickedIdx !== -1) {
      setActivePointIndex(clickedIdx);
      setIsDragging(true);
    }
  };

  const handleMouseMove = (e) => {
    if (!isDragging || activePointIndex === null) return;
    const mousePos = getCanvasCoordinates(e);

    const clampedX = Math.max(0, Math.min(canvasRef.current.width, mousePos.x));
    const clampedY = Math.max(0, Math.min(canvasRef.current.height, mousePos.y));

    setPoints((prev) => {
      const updated = [...prev];
      updated[activePointIndex] = { x: clampedX, y: clampedY };
      return updated;
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setActivePointIndex(null);
  };

  const handleReset = () => {
    if (!canvasRef.current) return;
    const width = canvasRef.current.width;
    const height = canvasRef.current.height;
    setPoints([
      { x: Math.round(width * 0.2), y: Math.round(height * 0.2) },
      { x: Math.round(width * 0.8), y: Math.round(height * 0.2) },
      { x: Math.round(width * 0.8), y: Math.round(height * 0.8) },
      { x: Math.round(width * 0.2), y: Math.round(height * 0.8) }
    ]);
  };

  const handleSave = () => {
    if (!canvasRef.current || points.length !== 4) return;

    const normalizedPoints = points.map((pt) => ({
      x: Number((pt.x / canvasRef.current.width).toFixed(4)),
      y: Number((pt.y / canvasRef.current.height).toFixed(4))
    }));

    const calibrationPayload = {
      imageResolution: {
        width: canvasRef.current.width,
        height: canvasRef.current.height
      },
      pixelCoordinates: points,
      normalizedCoordinates: normalizedPoints
    };

    if (onSaveCalibration) {
      onSaveCalibration(calibrationPayload);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 bg-slate-900 rounded-xl text-white max-w-5xl mx-auto shadow-2xl" ref={containerRef}>
      <div className="flex flex-wrap justify-between items-center gap-2 border-b border-slate-800 pb-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Move className="w-5 h-5 text-blue-400" />
            4-Point Homography Calibration
          </h2>
          <p className="text-xs text-slate-400">
            Upload a camera frame or blueprint snapshot and position anchors.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* File Upload Button */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/*"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition border border-slate-700"
          >
            <Upload className="w-3.5 h-3.5 text-blue-400" /> Upload Frame
          </button>

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

      {/* Canvas Viewport */}
      <div className="relative overflow-hidden bg-slate-950 rounded-lg border border-slate-800 flex justify-center items-center min-h-[300px]">
        {!image && (
          <div className="py-16 flex flex-col items-center gap-3 text-slate-500">
            <ImageIcon className="w-10 h-10 stroke-1" />
            <p className="text-sm">Upload a camera snapshot or select a sample frame to begin.</p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition"
            >
              Choose Image File
            </button>
          </div>
        )}
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className={`max-w-full h-auto cursor-crosshair ${!image ? 'hidden' : 'block'}`}
        />
      </div>

      {/* Coordinates Display */}
      {points.length === 4 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2">
          {points.map((pt, idx) => (
            <div key={idx} className="bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/50 flex flex-col gap-1">
              <span className="text-xs font-semibold flex items-center gap-1.5" style={{ color: POINT_COLORS[idx] }}>
                <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: POINT_COLORS[idx] }} />
                {POINT_LABELS[idx]}
              </span>
              <span className="font-mono text-xs text-slate-300">
                X: {pt.x}px | Y: {pt.y}px
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}