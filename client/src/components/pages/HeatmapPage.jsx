import React, { useState, useEffect } from "react";
import {
  Map,
  Flame,
  Clock,
  Video,
  Layers,
  RefreshCw,
  Info,
  MapPin,
  TrendingUp,
  AlertTriangle,
  Sliders,
  CheckCircle2,
  ExternalLink,
  ArrowRight,
  FolderOpen,
} from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function HeatmapPage({ onNavigate, showToast }) {
  // View states: 'blueprint' | 'video' | 'split'
  const [activeView, setActiveView] = useState("blueprint");
  // Heatmap metric mode: 'density' | 'dwell'
  const [heatmapMode, setHeatmapMode] = useState("density");
  // Display style: 'overlay' | 'raw'
  const [displayType, setDisplayType] = useState("overlay");
  const [showZones, setShowZones] = useState(true);
  const [selectedTime, setSelectedTime] = useState("14:00");
  const [activeZoneModal, setActiveZoneModal] = useState(null);

  // Dynamic heatmap data fetched from backend
  const [heatmapData, setHeatmapData] = useState(null);
  const [zonesList, setZonesList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [imgErrorVideo, setImgErrorVideo] = useState(false);
  const [imgErrorBlueprint, setImgErrorBlueprint] = useState(false);

  // Fetch latest dual heatmaps and zone analytics from CV pipeline
  const fetchLatestHeatmaps = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/heatmap/latest?t=${Date.now()}`,
      );
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.hasHistory) {
          setHeatmapData(data);
          if (data.zones && data.zones.length > 0) {
            setZonesList(data.zones);
          }
          setLastUpdated(
            new Date(data.timestamp || Date.now()).toLocaleTimeString(),
          );
        } else {
          setHeatmapData(null);
          setZonesList([]);
        }
      } else {
        setHeatmapData(null);
        setZonesList([]);
      }
    } catch (err) {
      console.warn("Could not fetch heatmap data from server:", err);
      setHeatmapData(null);
      setZonesList([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLatestHeatmaps();
  }, []);

  const handleRegenerate = async () => {
    setIsRefreshing(true);
    if (showToast)
      showToast("Regenerating dual heatmaps from trajectories...", "info");
    try {
      const res = await fetch(`${API_BASE_URL}/api/heatmap/generate`, {
        method: "POST",
      });
      if (res.ok) {
        const result = await res.json();
        if (result.success && result.data) {
          setHeatmapData(result.data);
          if (result.data?.zoneAnalytics?.zones) {
            setZonesList(result.data.zoneAnalytics.zones);
          }
          setLastUpdated(new Date().toLocaleTimeString());
          if (showToast)
            showToast("Dual heatmaps & zone analytics updated!", "success");
        }
      }
      await fetchLatestHeatmaps(true);
    } catch (err) {
      console.warn("Regeneration error:", err);
      await fetchLatestHeatmaps(true);
    } finally {
      setIsRefreshing(false);
    }
  };

  const hasHistory = Boolean(
    heatmapData &&
    heatmapData.hasHistory !== false &&
    zonesList &&
    zonesList.length > 0,
  );

  // Compute image sources with fresh cache-busting
  const cacheBuster = lastUpdated
    ? `?t=${encodeURIComponent(lastUpdated)}`
    : `?t=${Date.now()}`;

  const blueprintOverlaySrc = `${API_BASE_URL}/api/heatmap/image/${displayType === "raw" ? "blueprint_heatmap" : "blueprint_overlay"}${cacheBuster}`;
  const videoOverlaySrc = `${API_BASE_URL}/api/heatmap/image/${displayType === "raw" ? "video_heatmap" : "video_overlay"}${cacheBuster}`;

  // If loading, show elegant skeleton loader
  if (isLoading) {
    return (
      <div className="space-y-6 animate-fadeIn max-w-6xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="h-8 w-64 bg-gray-200 rounded-lg animate-pulse" />
            <div className="h-4 w-96 bg-gray-100 rounded-lg animate-pulse" />
          </div>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-12 text-center shadow-xs">
          <div className="w-12 h-12 rounded-full border-4 border-[#08764e] border-t-transparent animate-spin mx-auto mb-4" />
          <p className="text-sm font-semibold text-gray-700">
            Loading spatial heatmaps and analytics...
          </p>
        </div>
      </div>
    );
  }

  // If there is no history / no processed video yet: NO DEFAULT IMAGES
  if (!hasHistory) {
    return (
      <div className="space-y-6 animate-fadeIn max-w-6xl">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
              Store Floorplan Heatmap
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Spatial footfall density, customer dwell times, and aisle
              conversion mapping
            </p>
          </div>
          <button
            onClick={() => fetchLatestHeatmaps()}
            className="px-3 py-1.5 rounded-xl border border-gray-200 bg-white text-gray-700 hover:text-[#08764e] hover:border-[#08764e]/30 transition flex items-center gap-1.5 text-xs font-semibold shadow-xs"
          >
            <RefreshCw size={13} />
            <span>Check Again</span>
          </button>
        </div>

        {/* Clean Empty State Card - No default/fake images */}
        <div className="rounded-2xl border border-gray-100 bg-white p-10 sm:p-14 text-center shadow-xs max-w-2xl mx-auto space-y-6">
          <div className="w-20 h-20 rounded-2xl bg-[#e8f5ee] text-[#08764e] mx-auto flex items-center justify-center shadow-inner">
            <Flame size={36} />
          </div>

          <div className="space-y-2.5 max-w-md mx-auto">
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">
              No Heatmap History Found
            </h2>
            <p className="text-sm text-gray-500 leading-relaxed">
              Upload CCTV footage and configure your store floorplan mapping in{" "}
              <strong>Live Processing</strong>. Once the video processing job
              completes, dual perspective heatmaps and zone analytics will be
              automatically rendered here.
            </p>
          </div>

          {/* Action Button */}
          <div className="pt-2">
            <button
              onClick={() => onNavigate?.("live_processing")}
              className="px-6 py-3 bg-[#08764e] hover:bg-[#065e3e] text-white text-sm font-bold rounded-xl shadow-lg shadow-emerald-900/20 transition inline-flex items-center gap-2 cursor-pointer"
            >
              <Video size={16} />
              <span>Go to Video Processing</span>
              <ArrowRight size={15} />
            </button>
          </div>

          {/* Workflow Steps Indicator */}
          <div className="pt-6 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
            <div className="p-3.5 bg-gray-50/70 rounded-xl border border-gray-100">
              <span className="text-[10px] font-bold text-[#08764e] uppercase tracking-wider block mb-1">
                Step 1
              </span>
              <h4 className="text-xs font-bold text-gray-900">
                Upload Footage
              </h4>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Upload CCTV clips to the processing queue.
              </p>
            </div>
            <div className="p-3.5 bg-gray-50/70 rounded-xl border border-gray-100">
              <span className="text-[10px] font-bold text-[#08764e] uppercase tracking-wider block mb-1">
                Step 2
              </span>
              <h4 className="text-xs font-bold text-gray-900">
                Calibrate Blueprint
              </h4>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Set 4 calibration anchors to map video to your floorplan.
              </p>
            </div>
            <div className="p-3.5 bg-gray-50/70 rounded-xl border border-gray-100">
              <span className="text-[10px] font-bold text-[#08764e] uppercase tracking-wider block mb-1">
                Step 3
              </span>
              <h4 className="text-xs font-bold text-gray-900">Dual Heatmaps</h4>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Automatic generation on video frame & exact blueprint.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Active state when history exists
  return (
    <div className="space-y-6 animate-fadeIn max-w-6xl">
      {/* Page Title & Top Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
              Store Floorplan Heatmap
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#e8f5ee] text-[#08764e] border border-[#08764e]/20">
              <CheckCircle2 size={12} />
              <span>Trajectories Linked</span>
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Spatial footfall density, customer dwell times, and aisle conversion
            mapping automatically computed from CCTV trajectories
          </p>
        </div>

        {/* Top Controls: Mode & Refresh */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Footfall Density vs Dwell Time */}
          <div className="inline-flex rounded-xl border border-gray-200 bg-white p-1 text-xs font-semibold text-gray-600 shadow-xs">
            <button
              onClick={() => setHeatmapMode("density")}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                heatmapMode === "density"
                  ? "bg-[#08764e] text-white shadow-xs"
                  : "hover:text-gray-900"
              }`}
            >
              <Flame size={13} />
              <span>Footfall Density</span>
            </button>
            {/* <button
              onClick={() => setHeatmapMode("dwell")}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                heatmapMode === "dwell"
                  ? "bg-[#08764e] text-white shadow-xs"
                  : "hover:text-gray-900"
              }`}
            >
              <Clock size={13} />
              <span>Dwell Time</span>
            </button> */}
          </div>

          {/* Regenerate Button */}
          {/* <button
            onClick={handleRegenerate}
            disabled={isRefreshing}
            className="px-3 py-1.5 rounded-xl border border-gray-200 bg-white text-gray-700 hover:text-[#08764e] hover:border-[#08764e]/30 transition flex items-center gap-1.5 text-xs font-semibold shadow-xs disabled:opacity-50"
            title="Re-run heatmap generator on latest trajectory data"
          >
            <RefreshCw
              size={13}
              className={isRefreshing ? "animate-spin text-[#08764e]" : ""}
            />
            <span>{isRefreshing ? "Updating..." : "Refresh"}</span>
          </button> */}
        </div>
      </div>

      {/* Main Container Card */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xs space-y-4">
        {/* Controls Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-gray-100 text-xs">
          {/* Left toolbar: View tabs (Blueprint / Video / Dual Split) */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50/70 p-1 font-semibold text-gray-600">
              <button
                onClick={() => setActiveView("blueprint")}
                className={`px-3 py-1 rounded-md transition flex items-center gap-1.5 ${
                  activeView === "blueprint"
                    ? "bg-white text-gray-900 shadow-xs border border-gray-200/80 font-bold"
                    : "hover:text-gray-900 text-gray-500"
                }`}
              >
                <Map
                  size={13}
                  className={activeView === "blueprint" ? "text-[#08764e]" : ""}
                />
                <span>Blueprint Floorplan</span>
              </button>
              <button
                onClick={() => setActiveView("video")}
                className={`px-3 py-1 rounded-md transition flex items-center gap-1.5 ${
                  activeView === "video"
                    ? "bg-white text-gray-900 shadow-xs border border-gray-200/80 font-bold"
                    : "hover:text-gray-900 text-gray-500"
                }`}
              >
                <Video
                  size={13}
                  className={activeView === "video" ? "text-[#08764e]" : ""}
                />
                <span>CCTV Video Frame</span>
              </button>
              <button
                onClick={() => setActiveView("split")}
                className={`px-3 py-1 rounded-md transition flex items-center gap-1.5 ${
                  activeView === "split"
                    ? "bg-white text-gray-900 shadow-xs border border-gray-200/80 font-bold"
                    : "hover:text-gray-900 text-gray-500"
                }`}
              >
                <Layers
                  size={13}
                  className={activeView === "split" ? "text-[#08764e]" : ""}
                />
                <span>Dual Split View</span>
              </button>
            </div>

            <span className="text-gray-300 hidden sm:inline">|</span>

            {/* Zone Markers Toggle */}
            <label className="flex items-center gap-1.5 cursor-pointer font-medium text-gray-700 select-none">
              <input
                type="checkbox"
                checked={showZones}
                onChange={(e) => setShowZones(e.target.checked)}
                className="rounded text-[#08764e] focus:ring-[#08764e]"
              />
              <span>Show Zone Markers (A, B, C, D)</span>
            </label>

            {/* Display Type: Overlay vs Raw Heatmap */}
            <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-lg p-0.5 font-medium text-gray-600">
              <button
                onClick={() => setDisplayType("overlay")}
                className={`px-2 py-0.5 rounded text-[11px] ${
                  displayType === "overlay"
                    ? "bg-white shadow-xs font-bold text-gray-800"
                    : "text-gray-500"
                }`}
              >
                Overlay
              </button>
              <button
                onClick={() => setDisplayType("raw")}
                className={`px-2 py-0.5 rounded text-[11px] ${
                  displayType === "raw"
                    ? "bg-white shadow-xs font-bold text-gray-800"
                    : "text-gray-500"
                }`}
              >
                Pure Heat
              </button>
            </div>
          </div>

          {/* Right toolbar: Time Slot & Heatmap Legend */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2 text-gray-600 font-medium">
              <span>Time Slot:</span>
              <select
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                className="bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 font-semibold text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#08764e]"
              >
                <option value="10:00">10:00 AM (Morning Opening)</option>
                <option value="14:00">02:00 PM (Afternoon)</option>
                <option value="18:30">06:30 PM (Evening Peak)</option>
                <option value="all">All Day Cumulative</option>
              </select>
            </div>

            {/* Heatmap Activity Legend */}
            <div className="flex items-center gap-2">
              <span className="text-gray-500 font-medium">Activity:</span>
              <div className="flex items-center gap-1">
                <span
                  className="w-2.5 h-2.5 rounded-full bg-blue-500"
                  title="Low Traffic"
                />
                <span className="text-[11px] text-gray-500">Low</span>
                <span className="w-10 h-2 rounded bg-gradient-to-r from-blue-500 via-emerald-400 via-amber-400 to-red-500 mx-1" />
                <span className="text-[11px] text-gray-500">Peak</span>
                <span
                  className="w-2.5 h-2.5 rounded-full bg-red-500"
                  title="Peak Bottleneck"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Heatmap Visual Canvas Container */}
        {activeView === "split" ? (
          /* Dual Split View: CCTV Video Frame on left, Blueprint Floorplan on right */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left: CCTV Video Perspective Heatmap */}
            <div className="rounded-xl overflow-hidden bg-slate-900 border border-gray-200 flex flex-col">
              <div className="px-3 py-2 bg-slate-900/90 text-white flex items-center justify-between text-xs font-semibold border-b border-slate-800">
                <div className="flex items-center gap-1.5">
                  <Video size={13} className="text-emerald-400" />
                  <span>CCTV Camera Frame (Perspective Space)</span>
                </div>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                  CCTV Perspective
                </span>
              </div>
              <div className="relative w-full aspect-[16/10] bg-slate-950 flex items-center justify-center overflow-hidden">
                {imgErrorVideo ? (
                  <div className="text-slate-400 text-xs p-4 text-center">
                    Video overlay image unavailable.
                  </div>
                ) : (
                  <img
                    src={videoOverlaySrc}
                    alt="CCTV Video Perspective Heatmap Overlay"
                    onError={() => setImgErrorVideo(true)}
                    className="w-full h-full object-contain"
                  />
                )}
              </div>
            </div>

            {/* Right: Store 2D Blueprint Floorplan Heatmap */}
            <div className="rounded-xl overflow-hidden bg-slate-50 border border-gray-200 flex flex-col">
              <div className="px-3 py-2 bg-gray-100/90 text-gray-800 flex items-center justify-between text-xs font-semibold border-b border-gray-200">
                <div className="flex items-center gap-1.5">
                  <Map size={13} className="text-[#08764e]" />
                  <span>Store Floorplan Blueprint (2D Metric Space)</span>
                </div>
                <span className="text-[10px] text-gray-500 uppercase tracking-wider">
                  Mapped Blueprint
                </span>
              </div>
              <div className="relative w-full aspect-[16/10] bg-slate-50 flex items-center justify-center overflow-hidden">
                {imgErrorBlueprint ? (
                  <div className="text-gray-400 text-xs p-4 text-center">
                    Blueprint overlay image unavailable.
                  </div>
                ) : (
                  <>
                    <img
                      src={blueprintOverlaySrc}
                      alt="Store Blueprint Heatmap Overlay"
                      onError={() => setImgErrorBlueprint(true)}
                      className="w-full h-full object-contain"
                    />
                    {/* Interactive Zone Pins in Blueprint */}
                    {showZones &&
                      zonesList.map((zone) => (
                        <div
                          key={zone.id}
                          style={{ left: zone.left, top: zone.top }}
                          onClick={() => setActiveZoneModal(zone)}
                          className="absolute -translate-x-1/2 -translate-y-1/2 z-20 cursor-pointer group"
                        >
                          <div className="relative flex items-center justify-center">
                            <span className="animate-ping absolute inline-flex h-6 w-6 rounded-full bg-[#08764e] opacity-40" />
                            <div className="w-6 h-6 rounded-full bg-[#08764e] text-white flex items-center justify-center font-bold text-[10px] shadow-md border-2 border-white group-hover:scale-110 transition-transform">
                              {zone.id.split("-")[1]?.toUpperCase() || "Z"}
                            </div>
                          </div>
                        </div>
                      ))}
                  </>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Single View: Blueprint or Video Frame Full View */
          <div className="relative w-full aspect-[16/10] max-h-[560px] rounded-xl overflow-hidden bg-slate-50 border border-gray-200 flex items-center justify-center select-none shadow-inner">
            {activeView === "blueprint" ? (
              imgErrorBlueprint ? (
                <div className="text-gray-500 text-xs p-6 text-center">
                  Blueprint overlay could not be loaded.
                </div>
              ) : (
                <>
                  <img
                    src={blueprintOverlaySrc}
                    alt="Store 2D Floorplan Blueprint Heatmap"
                    onError={() => setImgErrorBlueprint(true)}
                    className="w-full h-full object-contain"
                  />

                  {/* Perspective Tag Banner */}
                  <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-lg border border-gray-200 text-[11px] font-semibold text-gray-700 shadow-xs flex items-center gap-1.5">
                    <Map size={12} className="text-[#08764e]" />
                    <span>2D Store Floorplan Blueprint</span>
                  </div>

                  {/* Interactive Zone Markers */}
                  {showZones &&
                    zonesList.map((zone) => (
                      <div
                        key={zone.id}
                        style={{ left: zone.left, top: zone.top }}
                        onClick={() => setActiveZoneModal(zone)}
                        className="absolute -translate-x-1/2 -translate-y-1/2 z-20 cursor-pointer group"
                      >
                        <div className="relative flex items-center justify-center">
                          <span className="animate-ping absolute inline-flex h-8 w-8 rounded-full bg-[#08764e] opacity-40" />
                          <div className="w-8 h-8 rounded-full bg-[#08764e] text-white flex items-center justify-center font-bold text-xs shadow-md border-2 border-white group-hover:scale-110 transition-transform">
                            {zone.id.split("-")[1]?.toUpperCase() || "Z"}
                          </div>
                        </div>

                        {/* Floating Tooltip */}
                        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:flex flex-col bg-slate-900 text-white p-2.5 rounded-xl shadow-xl text-xs w-52 z-30 pointer-events-none">
                          <span className="font-bold text-emerald-400">
                            {zone.name}
                          </span>
                          <div className="mt-1 flex justify-between text-[11px] text-slate-300">
                            <span>Footfall: {zone.traffic}</span>
                            <span>Dwell: {zone.dwell}</span>
                          </div>
                          {zone.conversion && (
                            <span className="text-[10px] text-emerald-300 mt-0.5">
                              Conversion: {zone.conversion}
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400 mt-1 leading-tight">
                            Click to inspect zone analytics
                          </span>
                        </div>
                      </div>
                    ))}
                </>
              )
            ) : imgErrorVideo ? (
              <div className="text-gray-500 text-xs p-6 text-center">
                Video overlay could not be loaded.
              </div>
            ) : (
              <>
                <img
                  src={videoOverlaySrc}
                  alt="CCTV Video Perspective Heatmap Overlay"
                  onError={() => setImgErrorVideo(true)}
                  className="w-full h-full object-contain"
                />

                {/* Perspective Tag Banner */}
                <div className="absolute top-3 left-3 bg-slate-900/90 backdrop-blur-xs px-2.5 py-1 rounded-lg border border-slate-700 text-[11px] font-semibold text-white shadow-xs flex items-center gap-1.5">
                  <Video size={12} className="text-emerald-400" />
                  <span>CCTV Video Perspective Frame</span>
                </div>
              </>
            )}
          </div>
        )}

        {/* Footer info bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-gray-500 pt-2 gap-2">
          <div className="flex items-center gap-2">
            <Info size={14} className="text-[#08764e] shrink-0" />
            <span>
              Real homography transformation computed from CCTV calibration
              anchor points. Trajectories automatically passed to
              heatmap-generator.
            </span>
          </div>
          {lastUpdated && (
            <span className="text-[11px] text-gray-400">
              Last generated: <strong>{lastUpdated}</strong>
            </span>
          )}
        </div>
      </div>

      {/* Section Header for Zone Analytics */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h2 className="text-lg font-bold text-gray-900">
            Zone-Wise Analytics
          </h2>
          <p className="text-xs text-gray-500">
            Dwell duration, footfall density, and conversion opportunity derived
            from shopper trajectories
          </p>
        </div>
        <button
          onClick={() => onNavigate("pos_data")}
          className="text-xs font-semibold text-[#08764e] hover:underline flex items-center gap-1 cursor-pointer"
        >
          <span>View POS Transaction Correlations</span>
          <ExternalLink size={12} />
        </button>
      </div>

      {/* Zone Comparison Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {zonesList.map((zone) => {
          const isPos =
            zone.category === "POS" || zone.badge === "Top Performing";
          const isHighDwell =
            zone.badge?.includes("High Dwell") || zone.dwell_minutes > 4.0;
          const isTransit =
            zone.category === "Entrance" || zone.badge === "Transit Corridor";

          return (
            <div
              key={zone.id}
              onClick={() => setActiveZoneModal(zone)}
              className="rounded-2xl border border-gray-100 bg-white p-5 shadow-xs hover:border-[#08764e]/40 hover:shadow-md transition cursor-pointer flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between gap-1">
                  <span className="font-bold text-gray-900 text-xs sm:text-sm line-clamp-1 group-hover:text-[#08764e] transition-colors">
                    {zone.name}
                  </span>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                      isPos
                        ? "bg-[#e8f5ee] text-[#08764e]"
                        : isHighDwell
                          ? "bg-red-50 text-red-600"
                          : isTransit
                            ? "bg-blue-50 text-blue-600"
                            : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {zone.badge || zone.category}
                  </span>
                </div>

                <div className="mt-3 space-y-1 text-xs text-gray-600">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Visitors:</span>
                    <strong>{zone.traffic}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Avg Dwell:</span>
                    <strong>{zone.dwell}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Conversion:</span>
                    <strong className={isPos ? "text-[#08764e]" : ""}>
                      {zone.conversion}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-gray-100">
                <p
                  className={`text-xs font-semibold ${
                    isPos
                      ? "text-[#08764e]"
                      : isHighDwell
                        ? "text-red-500"
                        : isTransit
                          ? "text-blue-500"
                          : "text-amber-600"
                  }`}
                >
                  {zone.lost_revenue || zone.insight}
                </p>
                <span className="text-[10px] text-gray-400 mt-1 block">
                  Click to inspect zone analytics →
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Zone Detail Modal when clicked */}
      {activeZoneModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-100 space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <MapPin size={18} className="text-[#08764e]" />
                <h3 className="text-base font-bold text-gray-900">
                  {activeZoneModal.name}
                </h3>
              </div>
              <button
                onClick={() => setActiveZoneModal(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center py-2 bg-[#f8faf9] rounded-xl border border-[#e8efe9]">
              <div>
                <span className="text-[11px] text-gray-400 block">Traffic</span>
                <span className="font-bold text-xs text-gray-900">
                  {activeZoneModal.traffic}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-gray-400 block">
                  Dwell Time
                </span>
                <span className="font-bold text-xs text-gray-900">
                  {activeZoneModal.dwell}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-gray-400 block">
                  Conversion
                </span>
                <span className="font-bold text-xs text-[#08764e]">
                  {activeZoneModal.conversion}
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
                Spatial Flow Insight
              </span>
              <p className="text-xs text-gray-700 leading-relaxed bg-gray-50 p-3 rounded-xl border border-gray-100">
                {activeZoneModal.insight}
              </p>
            </div>

            {/* Time Slot Activity Indicator */}
            {activeZoneModal.hourly_counts && (
              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
                  Activity by Time of Day
                </span>
                <div className="grid grid-cols-4 gap-1.5 text-center text-[10px] text-gray-600">
                  <div className="bg-gray-50 p-1.5 rounded-lg border border-gray-100">
                    <span className="text-gray-400 block">Morning</span>
                    <span className="font-bold text-gray-800">22%</span>
                  </div>
                  <div className="bg-gray-50 p-1.5 rounded-lg border border-gray-100">
                    <span className="text-gray-400 block">Afternoon</span>
                    <span className="font-bold text-[#08764e]">45%</span>
                  </div>
                  <div className="bg-gray-50 p-1.5 rounded-lg border border-gray-100">
                    <span className="text-gray-400 block">Evening Peak</span>
                    <span className="font-bold text-red-500">33%</span>
                  </div>
                  <div className="bg-gray-50 p-1.5 rounded-lg border border-gray-100">
                    <span className="text-gray-400 block">Night</span>
                    <span className="font-bold text-gray-400">—</span>
                  </div>
                </div>
              </div>
            )}

            <div className="pt-2 flex justify-end gap-2">
              <button
                onClick={() => setActiveZoneModal(null)}
                className="px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setActiveZoneModal(null);
                  onNavigate?.("pos_data");
                }}
                className="px-4 py-2 bg-[#08764e] text-white text-xs font-semibold rounded-lg hover:bg-[#065e3e] shadow-xs transition"
              >
                Inspect POS Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
