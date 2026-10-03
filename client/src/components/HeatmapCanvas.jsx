import React, { useRef, useEffect, useState } from 'react';

/**
 * HeatmapCanvas Component (Issue #33)
 * Renders a smooth 2D Gaussian thermal heatmap visualization overlay
 * on top of a store floorplan image using HTML5 Canvas.
 */
export default function HeatmapCanvas({
  floorplanUrl,
  points = [],
  zones = [],
  width = 960,
  height = 540,
  opacity = 0.6,
  radius = 25
}) {
  const canvasRef = useRef(null);
  const [heatmapOpacity, setHeatmapOpacity] = useState(opacity);
  const [blurRadius, setBlurRadius] = useState(radius);
  const [showZones, setShowZones] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Create an offscreen canvas for heatmap rendering
    const offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = width;
    offscreenCanvas.height = height;
    const offscreenCtx = offscreenCanvas.getContext('2d');

    // 1. Clear main canvas
    ctx.clearRect(0, 0, width, height);

    // 2. Draw Floorplan Image if available
    const drawFloorplanAndHeatmap = (img = null) => {
      if (img) {
        ctx.drawImage(img, 0, 0, width, height);
      } else {
        // Fallback dark grid background
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, width, height);
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1;
        for (let x = 0; x < width; x += 40) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
          ctx.stroke();
        }
        for (let y = 0; y < height; y += 40) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        }
      }

      // 3. Render Radial Gaussian Density Points on Offscreen Canvas
      offscreenCtx.clearRect(0, 0, width, height);

      if (points && points.length > 0) {
        for (const pt of points) {
          if (!pt || pt.length < 2) continue;
          const x = pt[0];
          const y = pt[1];

          const gradient = offscreenCtx.createRadialGradient(x, y, 0, x, y, blurRadius);
          gradient.addColorStop(0, 'rgba(0, 0, 0, 1)');
          gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

          offscreenCtx.fillStyle = gradient;
          offscreenCtx.beginPath();
          offscreenCtx.arc(x, y, blurRadius, 0, Math.PI * 2);
          offscreenCtx.fill();
        }

        // 4. Colorize Offscreen Alpha Map with Thermal Palette (Blue -> Green -> Yellow -> Red)
        const imgData = offscreenCtx.getImageData(0, 0, width, height);
        const data = imgData.data;

        for (let i = 0; i < data.length; i += 4) {
          const alpha = data[i + 3];
          if (alpha > 0) {
            // Map alpha intensity to thermal colormap spectrum
            const value = alpha / 255;
            let r = 0, g = 0, b = 0;

            if (value < 0.25) {
              // Dark Blue to Blue
              b = Math.floor(value * 4 * 255);
            } else if (value < 0.5) {
              // Blue to Green
              b = Math.floor((0.5 - value) * 4 * 255);
              g = Math.floor((value - 0.25) * 4 * 255);
            } else if (value < 0.75) {
              // Green to Yellow
              g = 255;
              r = Math.floor((value - 0.5) * 4 * 255);
            } else {
              // Yellow to Red
              r = 255;
              g = Math.floor((1 - value) * 4 * 255);
            }

            data[i] = r;
            data[i + 1] = g;
            data[i + 2] = b;
            data[i + 3] = Math.floor(alpha * heatmapOpacity);
          }
        }

        offscreenCtx.putImageData(imgData, 0, 0);

        // 5. Draw Thermal Heatmap onto Main Canvas
        ctx.drawImage(offscreenCanvas, 0, 0);
      }

      // 6. Draw Zone Polygons & Labels if enabled
      if (showZones && zones && zones.length > 0) {
        for (const zone of zones) {
          const poly = zone.polygon || [];
          if (poly.length < 3) continue;

          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2;
          ctx.fillStyle = 'rgba(56, 189, 248, 0.15)';

          ctx.beginPath();
          ctx.moveTo(poly[0][0], poly[0][1]);
          for (let i = 1; i < poly.length; i++) {
            ctx.lineTo(poly[i][0], poly[i][1]);
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Zone Name Label
          const centerX = poly.reduce((acc, p) => acc + p[0], 0) / poly.length;
          const centerY = poly.reduce((acc, p) => acc + p[1], 0) / poly.length;

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 12px Inter, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(zone.name || zone.zone_id, centerX, centerY);
        }
      }
    };

    if (floorplanUrl) {
      const bgImg = new Image();
      bgImg.crossOrigin = 'Anonymous';
      bgImg.onload = () => drawFloorplanAndHeatmap(bgImg);
      bgImg.onerror = () => drawFloorplanAndHeatmap(null);
      bgImg.src = floorplanUrl;
    } else {
      drawFloorplanAndHeatmap(null);
    }
  }, [floorplanUrl, points, zones, width, height, heatmapOpacity, blurRadius, showZones]);

  return (
    <div className="flex flex-col items-center bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-2xl">
      <div className="w-full flex justify-between items-center mb-3 text-slate-200">
        <h3 className="text-lg font-bold flex items-center gap-2">
          🔥 Spatial Density Heatmap Overlay
        </h3>
        <div className="flex items-center gap-4 text-xs font-semibold">
          <label className="flex items-center gap-1 cursor-pointer">
            <span>Opacity:</span>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.05"
              value={heatmapOpacity}
              onChange={(e) => setHeatmapOpacity(parseFloat(e.target.value))}
              className="accent-cyan-500"
            />
            <span className="w-8">{Math.round(heatmapOpacity * 100)}%</span>
          </label>

          <label className="flex items-center gap-1 cursor-pointer">
            <span>Blur:</span>
            <input
              type="range"
              min="10"
              max="60"
              step="5"
              value={blurRadius}
              onChange={(e) => setBlurRadius(parseInt(e.target.value))}
              className="accent-cyan-500"
            />
            <span className="w-6">{blurRadius}px</span>
          </label>

          <button
            onClick={() => setShowZones(!showZones)}
            className={`px-3 py-1 rounded transition-colors ${
              showZones ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-400'
            }`}
          >
            {showZones ? 'Zones On' : 'Zones Off'}
          </button>
        </div>
      </div>

      <div className="relative border border-slate-700 rounded-lg overflow-hidden shadow-inner bg-slate-950">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="block max-w-full h-auto cursor-crosshair"
        />
      </div>
    </div>
  );
}
