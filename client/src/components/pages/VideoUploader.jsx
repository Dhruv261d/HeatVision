import React, { useRef, useState, useEffect } from "react";
import { io } from "socket.io-client";
import {
  Upload,
  Video,
  Info,
  FolderOpen,
  ShieldCheck,
  ListVideo,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Target,
  Play,
  Sparkles,
  Layers,
  X,
  Activity,
  Flame,
} from "lucide-react";
import UnifiedCalibrationZoneEditor from "../modals/UnifiedCalibrationZoneEditor";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const socket = io(API_BASE_URL, { autoConnect: false });

// Standard default retail camera store mapping presets
const DEFAULT_PRESETS = [
  {
    id: "preset_entrance",
    name: "Ground Floor - Main Entrance",
    camera: "cam_1_entrance",
    description: "Entrance corridor wide-angle perspective mapping",
    videoResolution: { width: 1280, height: 720 },
    blueprintResolution: { width: 800, height: 600 },
    videoPoints: [
      { x: 192, y: 108 },
      { x: 1088, y: 108 },
      { x: 1088, y: 612 },
      { x: 192, y: 612 },
    ],
    blueprintPoints: [
      { x: 160, y: 120 },
      { x: 640, y: 120 },
      { x: 640, y: 480 },
      { x: 160, y: 480 },
    ],
    HMatrix: [
      [0.5357, 0.0, 57.14],
      [0.0, 0.7142, 42.85],
      [0.0, 0.0, 1.0],
    ],
  },
  {
    id: "preset_aisle_a",
    name: "Retail Corridor - Aisle A",
    camera: "cam_2_aisle_a",
    description: "Retail shelving perspective mapping for corridor A",
    videoResolution: { width: 1280, height: 720 },
    blueprintResolution: { width: 800, height: 600 },
    videoPoints: [
      { x: 320, y: 140 },
      { x: 960, y: 140 },
      { x: 1150, y: 650 },
      { x: 130, y: 650 },
    ],
    blueprintPoints: [
      { x: 200, y: 100 },
      { x: 600, y: 100 },
      { x: 600, y: 550 },
      { x: 200, y: 550 },
    ],
    HMatrix: [
      [0.625, 0.0, 0.0],
      [0.0, 0.88, -23.2],
      [0.0, 0.0001, 1.0],
    ],
  },
  {
    id: "preset_checkout",
    name: "Checkout Counter & Cashier 1",
    camera: "cam_3_checkout",
    description: "POS cashier desk perspective angle",
    videoResolution: { width: 1280, height: 720 },
    blueprintResolution: { width: 800, height: 600 },
    videoPoints: [
      { x: 250, y: 180 },
      { x: 1020, y: 180 },
      { x: 920, y: 680 },
      { x: 180, y: 680 },
    ],
    blueprintPoints: [
      { x: 180, y: 150 },
      { x: 680, y: 150 },
      { x: 680, y: 500 },
      { x: 180, y: 500 },
    ],
    HMatrix: [
      [0.6493, 0.0, 17.53],
      [0.0, 0.7, 24.0],
      [0.0, 0.0, 1.0],
    ],
  },
  {
    id: "preset_backroom",
    name: "Backroom & Loading Bay",
    camera: "cam_4_backroom",
    description: "Logistics and stock inventory entry perspective",
    videoResolution: { width: 1280, height: 720 },
    blueprintResolution: { width: 800, height: 600 },
    videoPoints: [
      { x: 210, y: 120 },
      { x: 1060, y: 120 },
      { x: 1010, y: 640 },
      { x: 240, y: 640 },
    ],
    blueprintPoints: [
      { x: 150, y: 100 },
      { x: 650, y: 100 },
      { x: 650, y: 520 },
      { x: 150, y: 520 },
    ],
    HMatrix: [
      [0.5882, 0.0, 26.47],
      [0.0, 0.8076, 3.07],
      [0.0, 0.0, 1.0],
    ],
  },
];

export default function VideoUploader({ onNavigate, showToast: externalShowToast }) {
  const fileInputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);
  const [files, setFiles] = useState([]);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState("info"); // 'info' | 'success' | 'error'

  const handleViewHeatmap = () => {
    if (onNavigate) {
      onNavigate("heatmap");
    } else {
      window.location.href = "/heatmap";
    }
  };

  // Store presets state (fetched from backend + custom saved)
  const [storePresets, setStorePresets] = useState(DEFAULT_PRESETS);

  // Active video calibrating in modal
  const [calibratingVideoId, setCalibratingVideoId] = useState(null);

  // Standalone calibrator modal state (for general blueprint mapping setup)
  const [isStandaloneCalibratorOpen, setIsStandaloneCalibratorOpen] =
    useState(false);

  // Processing jobs state
  const [activeJobs, setActiveJobs] = useState({});
  const [processingBatch, setProcessingBatch] = useState(false);
  const [showDesktopPreview, setShowDesktopPreview] = useState(true);
  const [previewVideoModal, setPreviewVideoModal] = useState(null);

  const allowedTypes = [
    "video/mp4",
    "video/x-msvideo",
    "video/quicktime",
    "video/x-matroska",
  ];
  const allowedExtensions = [".mp4", ".avi", ".mov", ".mkv"];
  const maxFileSize = 2 * 1024 * 1024 * 1024; // 2 GB

  // Show a disappearing banner notification
  const showToast = (message, type = "info", duration = 4000) => {
    setToastMessage(message);
    setToastType(type);
    if (duration > 0) {
      setTimeout(() => {
        setToastMessage("");
      }, duration);
    }
  };

  // Fetch presets from API on load
  useEffect(() => {
    const fetchPresets = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/caligraphy/presets`);
        if (res.ok) {
          const data = await res.json();
          if (data.presets && Array.isArray(data.presets)) {
            setStorePresets(data.presets);
          }
        }
      } catch (err) {
        console.warn("Could not fetch remote presets, using defaults:", err);
      }
    };
    fetchPresets();
  }, []);

  // Socket.io Real-time Event Subscriptions
  useEffect(() => {
    socket.connect();

    socket.on("processing:status", (data) => {
      setActiveJobs((prev) => ({
        ...prev,
        [data.id]: {
          ...prev[data.id],
          id: data.id,
          cameraId: data.cameraId,
          mappingName:
            data.mappingConfig?.name ||
            prev[data.id]?.mappingName ||
            "Homography",
          statusMsg: data.message || `Status: ${data.status}`,
          progress: data.progress || prev[data.id]?.progress || 0,
        },
      }));
    });

    socket.on("processing:frame", (data) => {
      setActiveJobs((prev) => {
        if (!prev[data.jobId]) return prev;
        return {
          ...prev,
          [data.jobId]: {
            ...prev[data.jobId],
            previewFrame: `data:image/jpeg;base64,${data.image}`,
            currentFrame: data.frame,
          },
        };
      });
    });

    socket.on("processing:progress", (data) => {
      setActiveJobs((prev) => ({
        ...prev,
        [data.jobId]: {
          ...prev[data.jobId],
          progress: data.progress || 0,
          currentFrame: data.frame,
          totalFrames: data.totalFrames,
          mappingName:
            data.mappingName || prev[data.jobId]?.mappingName || "Homography",
          statusMsg: `Processing frame ${data.frame}/${data.totalFrames}`,
        },
      }));
    });

    socket.on("processing:complete", (data) => {
      // const queueItemId = jobQueueItemIdsRef.current[data.jobId];

      // if (queueItemId) {
      //   setFiles((prev) => prev.filter((file) => file.id !== queueItemId));

      //   // delete jobQueueItemIdsRef.current[data.jobId];
      // }
      setActiveJobs((prev) => ({
        ...prev,
        [data.jobId]: {
          ...prev[data.jobId],
          progress: 100,
          statusMsg: "Processing complete with trajectories!",
          completed: true,
          annotatedVideoUrl: data.annotatedVideoUrl,
        },
      }));
    });

    socket.on("processing:error", (data) => {
      setActiveJobs((prev) => ({
        ...prev,
        [data.jobId]: {
          ...prev[data.jobId],
          statusMsg: `Processing error: ${data.error}`,
          failed: true,
        },
      }));
    });

    return () => {
      socket.off("processing:status");
      socket.off("processing:frame");
      socket.off("processing:progress");
      socket.off("processing:complete");
      socket.off("processing:error");
      socket.disconnect();
    };
  }, []);

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const validateFile = (file) => {
    const extension = "." + file.name.split(".").pop().toLowerCase();
    const validType =
      allowedTypes.includes(file.type) || allowedExtensions.includes(extension);

    if (!validType) {
      alert(
        `${file.name} is not supported.\nPlease upload MP4, AVI, MOV, or MKV files.`,
      );
      return false;
    }

    if (file.size > maxFileSize) {
      alert(`${file.name} exceeds the maximum size of 2 GB.`);
      return false;
    }
    return true;
  };

  /**
   * Uploads a single video file to the server queue staging folder.
   * NOTE: processing is explicitly NOT triggered (startProcessing: false).
   */
  const uploadVideoToServer = async (item) => {
    try {
      const formData = new FormData();
      formData.append("cameraId", item.camera || "cam_1_entrance");
      formData.append("video", item.file);
      formData.append("startProcessing", "false");

      setFiles((prev) =>
        prev.map((f) =>
          f.id === item.id ? { ...f, uploadStatus: "uploading" } : f,
        ),
      );

      const res = await fetch(`${API_BASE_URL}/api/videos/upload`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to upload video to queue");
      }

      const uploadedFile = data.files?.[0];
      setFiles((prev) =>
        prev.map((f) =>
          f.id === item.id
            ? {
                ...f,
                uploadStatus: "uploaded",
                serverFile: uploadedFile,
                videoPath: uploadedFile?.path || uploadedFile?.url,
              }
            : f,
        ),
      );

      showToast(
        `"${item.file.name}" staged in queue. Please configure its store mapping.`,
        "info",
      );
    } catch (err) {
      console.error("Single video upload error:", err);
      setFiles((prev) =>
        prev.map((f) =>
          f.id === item.id
            ? { ...f, uploadStatus: "error", uploadError: err.message }
            : f,
        ),
      );
      showToast(`Upload failed for ${item.file.name}: ${err.message}`, "error");
    }
  };

  /**
   * Adds videos to queue one by one and stages them on server without starting processing.
   */
  const addFiles = (selectedFiles) => {
    const validFiles = Array.from(selectedFiles).filter(validateFile);
    if (validFiles.length === 0) return;

    const newQueueItems = validFiles.map((file) => ({
      id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
      file,
      name: file.name,
      size: file.size,
      camera: "cam_1_entrance",
      uploadStatus: "idle", // 'idle' | 'uploading' | 'uploaded' | 'error'
      serverFile: null,
      videoPath: null,
      mappingStatus: "unmapped", // 'unmapped' | 'mapped'
      mapping: null,
    }));

    setFiles((prev) => [...prev, ...newQueueItems]);

    // Automatically stage each video one by one to server
    newQueueItems.forEach((item) => {
      uploadVideoToServer(item);
    });
  };

  const handleFileChange = (event) => {
    if (event.target.files) addFiles(event.target.files);
    event.target.value = "";
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files) addFiles(e.dataTransfer.files);
  };

  const removeFile = (id) =>
    setFiles((prev) => prev.filter((i) => i.id !== id));

  const clearFiles = () => setFiles([]);

  const updateCamera = (id, camera) => {
    setFiles((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;

        // Auto-match default preset for this camera if video is unmapped
        const matchedPreset = storePresets.find((p) => p.camera === camera);
        return {
          ...item,
          camera,
          ...(item.mappingStatus === "unmapped" && matchedPreset
            ? { mapping: matchedPreset, mappingStatus: "mapped" }
            : {}),
        };
      }),
    );
  };

  /**
   * Associate an existing store mapping preset with a queued video
   */
  const handleSelectPreset = (videoId, presetId) => {
    if (!presetId) {
      setFiles((prev) =>
        prev.map((f) =>
          f.id === videoId
            ? { ...f, mapping: null, mappingStatus: "unmapped" }
            : f,
        ),
      );
      return;
    }

    const selected = storePresets.find((p) => p.id === presetId);
    if (!selected) return;

    setFiles((prev) =>
      prev.map((f) =>
        f.id === videoId
          ? {
              ...f,
              mapping: selected,
              mappingStatus: "mapped",
              camera: selected.camera || f.camera,
            }
          : f,
      ),
    );

    showToast(`Assigned mapping "${selected.name}" to video.`, "success");
  };

  /**
   * Callback when calibrator finishes and saves mapping for a specific queued video
   */
  const handleSaveCalibrationForVideo = (videoId, calibrationPayload) => {
    setFiles((prev) =>
      prev.map((f) =>
        f.id === videoId
          ? {
              ...f,
              mapping: {
                ...(f.mapping || {}),
                ...calibrationPayload,
                zones:
                  calibrationPayload.zones || f.mapping?.zones || f.zones || [],
              },
              mappingStatus: "mapped",
              camera: calibrationPayload.camera || f.camera,
            }
          : f,
      ),
    );
    setCalibratingVideoId(null);
    showToast(
      `Calibration "${calibrationPayload.name}" successfully configured for video!`,
      "success",
    );
  };

  /**
   * Callback when zones are updated for a specific queued video
   */
  const handleSaveZonesForVideo = (videoId, zonesList) => {
    setFiles((prev) =>
      prev.map((f) =>
        f.id === videoId
          ? {
              ...f,
              zones: zonesList,
              mapping: {
                ...(f.mapping || {}),
                zones: zonesList,
              },
            }
          : f,
      ),
    );
    showToast(`Saved ${zonesList.length} zone(s) for video!`, "success");
  };

  /**
   * Save a newly defined mapping to reusable store presets
   */
  // const handleSaveNewPreset = async (newPreset) => {
  //   try {
  //     const res = await fetch(`${API_BASE_URL}/api/caligraphy/presets`, {
  //       method: "POST",
  //       headers: { "Content-Type": "application/json" },
  //       body: JSON.stringify(newPreset),
  //     });

  //     if (res.ok) {
  //       const data = await res.json();
  //       setStorePresets((prev) => [...prev, data.preset]);
  //     } else {
  //       // Fallback local persistence
  //       setStorePresets((prev) => [...prev, newPreset]);
  //     }
  //   } catch (err) {
  //     console.warn("Could not save preset to server, storing locally:", err);
  //     setStorePresets((prev) => [...prev, newPreset]);
  //   }
  // };

  /**
   * Starts processing the batch once EVERY video has a valid mapping.
   * Each job starts with its own video path and mapping configuration.
   */
  const startProcessing = async () => {
    if (files.length === 0) {
      alert("No videos in queue to process.");
      return;
    }

    const unmapped = files.filter(
      (f) => f.mappingStatus !== "mapped" || !f.mapping?.HMatrix,
    );
    if (unmapped.length > 0) {
      alert(
        `Cannot start processing: ${unmapped.length} video(s) are missing valid homography calibration mappings.`,
      );
      return;
    }

    setProcessingBatch(true);
    showToast(
      "Launching video processing jobs with custom homography configurations...",
      "info",
    );

    try {
      for (const item of files) {
        // Ensure item is uploaded
        let serverFile = item.serverFile;
        if (!serverFile && item.uploadStatus !== "uploaded") {
          const formData = new FormData();
          formData.append("cameraId", item.camera);
          formData.append("video", item.file);
          formData.append("startProcessing", "false");

          const uploadRes = await fetch(`${API_BASE_URL}/api/videos/upload`, {
            method: "POST",
            body: formData,
          });
          const uploadData = await uploadRes.json();
          serverFile = uploadData.files?.[0];
        }

        const rawVideoPoints =
          item.mapping?.videoPoints || item.mapping?.roiPoints;
        const roiPoints =
          Array.isArray(rawVideoPoints) && rawVideoPoints.length >= 3
            ? rawVideoPoints.map((p) =>
                Array.isArray(p)
                  ? p
                  : [Math.round(p.x || 0), Math.round(p.y || 0)],
              )
            : null;

        const payload = {
          cameraId: item.camera || "cam_1_entrance",
          files: serverFile
            ? [serverFile]
            : [
                {
                  path: item.videoPath,
                  filename: item.file?.name || item.name,
                  size: item.file?.size || item.size,
                },
              ],
          homographyMatrix: item.mapping?.HMatrix,
          mappingConfig: item.mapping,
          roiPoints,
          zones: item.mapping?.zones || item.zones || [],
          blueprintSrc: item.mapping?.blueprintSrc || item.blueprintSrc || null,
          showPreview: showDesktopPreview,
        };

        const response = await fetch(`${API_BASE_URL}/api/videos/process`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(
            data.message || "Failed to start video processing job",
          );
        }

        setActiveJobs((prev) => ({
          ...prev,
          [data.jobId]: {
            id: data.jobId,
            cameraId: item.camera,
            mappingName: item.mapping?.name || "Homography",
            videoName: item.file?.name || item.name,
            progress: 0,
            statusMsg: "Queued for processing...",
          },
        }));
      }

      showToast(
        "All video jobs successfully queued with their own perspective mappings!",
        "success",
      );
    } catch (error) {
      console.error("Start processing error:", error);
      showToast(error.message || "Failed to start processing batch", "error");
    } finally {
      setProcessingBatch(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return "0 B";
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024)
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const totalSize = files.reduce(
    (total, item) => total + (item.file?.size || item.size || 0),
    0,
  );

  const allVideosMapped =
    files.length > 0 &&
    files.every(
      (f) => f.mappingStatus === "mapped" && Boolean(f.mapping?.HMatrix),
    );

  const mappedCount = files.filter(
    (f) => f.mappingStatus === "mapped" && Boolean(f.mapping?.HMatrix),
  ).length;

  const currentCalibratingVideo = files.find(
    (f) => f.id === calibratingVideoId,
  );

  return (
    <div className="w-full max-w-6xl relative space-y-6 animate-fadeIn">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div
          className={`fixed top-24 left-1/2 -translate-x-1/2 z-50 min-w-[340px] max-w-xl px-5 py-3.5 rounded-xl shadow-2xl text-sm font-semibold text-center border transition-all animate-fadeIn ${
            toastType === "success"
              ? "bg-[#08764e] text-white border-emerald-500 shadow-emerald-950/40"
              : toastType === "error"
                ? "bg-rose-600 text-white border-rose-500 shadow-rose-950/40"
                : "bg-gray-800 text-white border-gray-700 shadow-black/50"
          }`}
        >
          {toastMessage}
        </div>
      )}

      {/* Page header — aligned with Live Processing */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
            Video Upload & Processing
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Upload CCTV footage, configure camera homography, and process video
            batches.
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[#a1c9b3]/60 bg-[#f2f8f4] text-xs font-semibold text-[#08764e] w-fit">
          <span className="w-2 h-2 rounded-full bg-[#08764e] animate-pulse" />
          <span>
            {Object.values(activeJobs).some(
              (job) => !job.completed && !job.failed,
            )
              ? "Pipeline Processing"
              : "Pipeline Ready"}
          </span>
        </div>
      </div>

      {/* Active Jobs Real-time Processing Strip */}
      {Object.values(activeJobs).length > 0 && (
        <div className="space-y-4 mb-8">
          <h3 className="text-sm font-bold uppercase tracking-wider text-[#08764e] flex items-center gap-2">
            <Loader2 className="animate-spin" size={16} /> Active Processing
            Pipeline ({Object.values(activeJobs).length})
          </h3>
          {Object.values(activeJobs).map((job) => (
            <div
              key={job.id}
              className="bg-white border border-[#a1c9b3]/60 p-5 rounded-xl shadow-xl transition-all"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <Loader2 className="animate-spin text-[#08764e]" size={18} />
                  <span className="font-semibold text-sm text-gray-900">
                    Processing Job ({job.cameraId}):{" "}
                    <code className="text-[#08764e] font-mono text-xs">
                      {job.id}
                    </code>
                  </span>
                  {job.mappingName && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs bg-[#e8f5ee] text-[#08764e] border border-[#a1c9b3]/60 flex items-center gap-1 font-mono">
                      <Sparkles size={11} />
                      Mapping: {job.mappingName}
                    </span>
                  )}
                </div>
                <span className="text-xs text-[#08764e] font-bold">
                  {(job.progress || 0).toFixed(0)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 h-2.5 rounded-full overflow-hidden mb-2">
                <div
                  className="bg-gradient-to-r from-[#08764e] to-[#0b8b60] h-full transition-all duration-300 ease-out"
                  style={{ width: `${job.progress || 0}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-xs text-gray-500">
                <span className="italic">
                  {job.videoName ? `Source: ${job.videoName}` : ""}
                </span>
                <span className="text-gray-600 font-medium">
                  {job.statusMsg || "Processing pipeline active..."}
                </span>
              </div>

              {/* Real-time Video Trajectory Monitor */}
              {job.previewFrame && !job.completed && (
                <div className="mt-4 relative rounded-xl overflow-hidden border border-gray-200 bg-slate-950 max-w-xl mx-auto shadow-2xl">
                  <img
                    src={job.previewFrame}
                    alt="Real-time Trajectory Pipeline"
                    className="w-full h-auto object-contain block"
                  />
                  <div className="absolute top-2.5 left-2.5 bg-rose-600/90 backdrop-blur-xs text-white text-[11px] font-bold px-2.5 py-1 rounded-md flex items-center gap-1.5 shadow-md">
                    <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
                    LIVE CV TRAJECTORY PREVIEW
                  </div>
                  <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center text-[11px] text-white/90 bg-black/70 backdrop-blur-md px-3 py-1 rounded-lg border border-white/10">
                    <span>Frame: {job.currentFrame || "Analyzing..."}</span>
                    <span className="text-[#08764e] font-mono">
                      Drawing live motion trails
                    </span>
                  </div>
                </div>
              )}

              {/* Finished Processed Video Action Bar */}
              {job.completed && (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 p-3.5 bg-[#f2f8f4] border border-[#a1c9b3]/60 rounded-xl">
                  <div className="flex items-center gap-2 text-[#08764e] text-xs sm:text-sm font-semibold">
                    <CheckCircle2
                      size={18}
                      className="text-[#08764e] shrink-0"
                    />
                    <span>
                      Processing completed! All trajectory trails were drawn & dual heatmaps generated.
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleViewHeatmap}
                      className="px-4 py-2 bg-[#08764e] hover:bg-[#065e3e] text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-900/20 transition cursor-pointer"
                    >
                      <Flame size={14} className="fill-current" />
                      View Heatmap
                    </button>
                    {job.annotatedVideoUrl && (
                      <button
                        onClick={() =>
                          setPreviewVideoModal(
                            `${API_BASE_URL}${job.annotatedVideoUrl}`,
                          )
                        }
                        className="px-3.5 py-2 bg-white hover:bg-gray-100 border border-gray-200 text-gray-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <Play size={13} />
                        Watch Video
                      </button>
                    )}
                    {job.annotatedVideoUrl && (
                      <a
                        href={`${API_BASE_URL}${job.annotatedVideoUrl}`}
                        download={`annotated_${job.id}.mp4`}
                        className="px-3 py-2 bg-gray-50 hover:bg-gray-200 border border-gray-200 text-gray-600 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
                      >
                        Download MP4
                      </a>
                    )}
                    <button
                      onClick={() => {
                        setActiveJobs((prev) => {
                          const updated = { ...prev };
                          delete updated[job.id];
                          return updated;
                        });
                      }}
                      className="p-1.5 text-gray-500 hover:text-gray-900 rounded hover:bg-gray-200 transition cursor-pointer"
                      title="Dismiss"
                    >
                      <X size={15} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Dropzone & Guidelines Grid */}
      <div className="content-grid grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <section className="upload-card md:col-span-2">
          <div
            className={`drop-zone p-8 border-2 border-dashed rounded-xl text-center cursor-pointer transition ${
              dragActive
                ? "border-[#08764e] bg-[#e8f5ee]"
                : "border-gray-200 bg-gray-50/40 hover:border-[#a1c9b3]"
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <Upload className="mx-auto mb-4 text-gray-500" size={48} />
            <h2 className="text-xl font-bold mb-2">
              Drag & Drop your CCTV videos here
            </h2>
            <p className="text-gray-500 text-sm mb-4">
              or{" "}
              <span
                onClick={handleBrowseClick}
                className="text-[#08764e] underline cursor-pointer"
              >
                browse files
              </span>{" "}
              from your computer
            </p>
            <div className="flex justify-center gap-3">
              <button
                className="browse-button px-4 py-2 bg-[#08764e] rounded-lg text-white text-sm font-medium hover:bg-[#065e3e] transition shadow-lg shadow-emerald-900/10"
                onClick={handleBrowseClick}
              >
                <FolderOpen size={16} className="inline mr-2" /> Browse Files
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".mp4,.avi,.mov,.mkv"
              multiple
              hidden
              onChange={handleFileChange}
            />
          </div>
        </section>

        <section className="guidelines-card bg-white p-6 rounded-xl border border-gray-100 flex flex-col gap-3 justify-between">
          <div>
            <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
              <Info size={18} className="text-[#08764e]" /> Workflow Guidelines
            </h3>
            <div className="space-y-2.5 text-xs text-gray-600">
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-500/20 text-[#08764e] flex items-center justify-center font-bold shrink-0 mt-0.5">
                  1
                </span>
                <span>
                  Upload videos to queue (processing won't start yet).
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-500/20 text-[#08764e] flex items-center justify-center font-bold shrink-0 mt-0.5">
                  2
                </span>
                <span>
                  Select a store preset or click "Configure mapping" to
                  calibrate.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-500/20 text-[#08764e] flex items-center justify-center font-bold shrink-0 mt-0.5">
                  3
                </span>
                <span>
                  Once all videos have a valid mapping, start batch processing!
                </span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-gray-100 text-[11px] text-gray-500 flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-[#08764e]" />
            <span>2GB max file size. MP4, AVI, MOV, MKV supported.</span>
          </div>
        </section>
      </div>

      {/* Video Queue List with Mapping Controls */}
      {files.length > 0 && (
        <section className="queue-card bg-white p-6 rounded-xl border border-gray-100 mb-6 shadow-xl">
          <div className="queue-header flex flex-wrap justify-between items-center gap-3 mb-4 pb-3 border-b border-gray-100">
            <div>
              <h3 className="font-bold text-lg flex items-center gap-2">
                <ListVideo size={19} className="text-[#08764e]" /> Upload Queue
                ({files.length})
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Associate a camera mapping with each queued video before
                starting.
              </p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {Object.values(activeJobs).some((j) => j.completed) && (
                <button
                  onClick={handleViewHeatmap}
                  className="px-3.5 py-1.5 bg-[#08764e] hover:bg-[#065e3e] text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                  title="Open generated dual video and floorplan heatmaps"
                >
                  <Flame size={14} className="fill-current" />
                  <span>View Heatmap</span>
                </button>
              )}

              <span className="text-xs text-gray-600">
                Mapped Status:{" "}
                <strong
                  className={
                    allVideosMapped ? "text-[#08764e]" : "text-amber-700"
                  }
                >
                  {mappedCount} / {files.length} Ready
                </strong>
              </span>

              <button
                className="clear-button text-xs text-rose-600 hover:text-rose-300 hover:underline transition"
                onClick={clearFiles}
                disabled={processingBatch}
              >
                Clear Queue
              </button>
            </div>
          </div>

          <div className="space-y-3.5">
            {files.map((item) => {
              const isMapped =
                item.mappingStatus === "mapped" &&
                Boolean(item.mapping?.HMatrix);

              return (
                <div
                  key={item.id}
                  className={`queue-item p-4 rounded-xl border transition-all ${
                    isMapped
                      ? "bg-[#f8faf9] border-[#a1c9b3]/60"
                      : "bg-[#f8faf9] border-amber-200"
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Left: Video File Details */}
                    <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                      <div
                        className={`p-2.5 rounded-lg shrink-0 ${
                          isMapped
                            ? "bg-[#e8f5ee] text-[#08764e]"
                            : "bg-amber-500/10 text-amber-700"
                        }`}
                      >
                        <Video size={24} />
                      </div>

                      <div className="min-w-0">
                        <strong className="text-sm font-semibold block truncate max-w-xs sm:max-w-md text-gray-900">
                          {item.name || item.file?.name}
                        </strong>
                        <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5 flex-wrap">
                          <span>
                            {formatFileSize(item.size || item.file?.size)}
                          </span>
                          <span>•</span>
                          <span>
                            {item.uploadStatus === "uploading" ? (
                              <span className="text-[#08764e] flex items-center gap-1">
                                <Loader2 size={12} className="animate-spin" />{" "}
                                Staging on server...
                              </span>
                            ) : item.uploadStatus === "uploaded" ? (
                              <span className="text-[#08764e]">
                                Staged on server (Awaiting start)
                              </span>
                            ) : (
                              <span className="text-gray-500">
                                Ready to stage
                              </span>
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Camera Selector, Mapping Status & Action Buttons */}
                    <div className="flex flex-wrap items-center gap-3">
                      {/* Camera ID selector */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-gray-500">
                          Camera:
                        </span>
                        <select
                          className="bg-gray-50 text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-700 focus:outline-none focus:border-[#08764e]"
                          value={item.camera}
                          onChange={(e) =>
                            updateCamera(item.id, e.target.value)
                          }
                          disabled={processingBatch}
                        >
                          <option value="cam_1_entrance">
                            Camera 1 (Entrance)
                          </option>
                          <option value="cam_2_aisle_a">
                            Camera 2 (Aisle A)
                          </option>
                          <option value="cam_3_checkout">
                            Camera 3 (Checkout)
                          </option>
                          <option value="cam_4_backroom">
                            Camera 4 (Backroom)
                          </option>
                        </select>
                      </div>

                      {/* Store Presets Dropdown */}
                      <div className="flex items-center gap-1.5">
                        <Layers
                          size={13}
                          className="text-gray-500 hidden sm:inline"
                        />
                        <select
                          className={`text-xs px-2.5 py-1.5 rounded-lg border focus:outline-none transition ${
                            isMapped
                              ? "bg-white border-[#a1c9b3]/60 text-[#08764e]"
                              : "bg-gray-50 border-gray-200 text-gray-600"
                          }`}
                          value={item.mapping?.id || ""}
                          onChange={(e) =>
                            handleSelectPreset(item.id, e.target.value)
                          }
                          disabled={processingBatch}
                        >
                          <option value="">-- Select Store Mapping --</option>
                          {storePresets.map((preset) => (
                            <option key={preset.id} value={preset.id}>
                              {preset.name}
                            </option>
                          ))}
                          {item.mapping &&
                            !storePresets.some(
                              (p) => p.id === item.mapping?.id,
                            ) && (
                              <option value={item.mapping.id}>
                                Custom: {item.mapping.name}
                              </option>
                            )}
                        </select>
                      </div>

                      {/* Mapping Status Badge */}
                      {isMapped ? (
                        <div className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[#e8f5ee] text-[#08764e] border border-[#a1c9b3]/60 flex items-center gap-1.5">
                          <CheckCircle2 size={13} className="text-[#08764e]" />
                          <span className="truncate max-w-[130px]">
                            {item.mapping.name}
                          </span>
                        </div>
                      ) : (
                        <div className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1.5">
                          <AlertCircle size={13} />
                          <span>Mapping Required</span>
                        </div>
                      )}

                      {/* Configure Mapping Action Button */}
                      <button
                        onClick={() => setCalibratingVideoId(item.id)}
                        disabled={processingBatch}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition border ${
                          isMapped
                            ? "bg-gray-50 hover:bg-gray-200 text-gray-700 border-gray-200"
                            : "bg-[#f2f8f4] hover:bg-[#08764e] text-[#08764e] hover:text-white border-[#a1c9b3]/60 shadow-md shadow-emerald-900/10"
                        }`}
                        title="Configure video coordinate homography"
                      >
                        <Target size={14} className="text-[#08764e]" />
                        {isMapped ? "Edit Mapping" : "Configure Mapping"}
                      </button>

                      {/* View Heatmap Button for processed video */}
                      {Object.values(activeJobs).some(
                        (j) =>
                          j.completed &&
                          (j.id === item.id ||
                            j.videoName === item.file?.name ||
                            j.videoName === item.name),
                      ) && (
                        <button
                          onClick={handleViewHeatmap}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 bg-[#08764e] text-white hover:bg-[#065e3e] shadow-sm transition cursor-pointer"
                          title="View generated dual heatmap for this video"
                        >
                          <Flame size={13} className="fill-current" />
                          View Heatmap
                        </button>
                      )}

                      {/* Remove Video Action Button */}
                      <button
                        className="p-1.5 text-gray-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        onClick={() => removeFile(item.id)}
                        disabled={processingBatch}
                        title="Remove video from queue"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Queue pipeline telemetry */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {[
          {
            label: "Queued Videos",
            value: files.length,
            icon: Video,
            note: "Files in upload queue",
          },
          {
            label: "Mappings Ready",
            value: `${mappedCount}/${files.length}`,
            icon: Layers,
            note: "Valid homography configs",
          },
          {
            label: "Active Jobs",
            value: Object.values(activeJobs).filter(
              (job) => !job.completed && !job.failed,
            ).length,
            icon: Activity,
            note: "Processing pipeline jobs",
          },
          {
            label: "Completed Jobs",
            value: Object.values(activeJobs).filter((job) => job.completed)
              .length,
            icon: CheckCircle2,
            note: "Finished successfully",
          },
        ].map(({ label, value, icon: Icon, note }) => (
          <div
            key={label}
            className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-semibold text-gray-500">
                {label}
              </span>
              <span className="rounded-xl bg-[#e8f5ee] p-2 text-[#08764e]">
                <Icon size={17} />
              </span>
            </div>
            <div className="mt-3 text-2xl font-bold text-gray-900">{value}</div>
            <p className="mt-1 text-[11px] text-gray-500">{note}</p>
          </div>
        ))}
      </section>

      {/* Processed video batches */}
      {Object.values(activeJobs).some((job) => job.completed || job.failed) && (
        <section className="rounded-2xl border border-gray-100 bg-white p-5 sm:p-6 shadow-sm mb-6">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="text-base font-bold text-gray-900">
                Processed Video Batches
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                Results from jobs launched in this session.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[#08764e] bg-[#e8f5ee] px-2.5 py-1 rounded-full">
                {
                  Object.values(activeJobs).filter(
                    (job) => job.completed || job.failed,
                  ).length
                }{" "}
                finished
              </span>
              {Object.values(activeJobs).some((job) => job.completed) && (
                <button
                  onClick={handleViewHeatmap}
                  className="px-3 py-1 bg-[#08764e] hover:bg-[#065e3e] text-white text-xs font-semibold rounded-lg shadow-xs transition flex items-center gap-1 cursor-pointer"
                  title="View dual heatmaps generated from completed sessions"
                >
                  <Flame size={12} className="fill-current" />
                  <span>View Heatmap</span>
                </button>
              )}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-[#f2f8f4] text-gray-700">
                  <th className="py-3 px-3 rounded-l-lg">Job ID</th>
                  <th className="py-3 px-3">Video</th>
                  <th className="py-3 px-3">Camera</th>
                  <th className="py-3 px-3">Mapping</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 rounded-r-lg text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {Object.values(activeJobs)
                  .filter((job) => job.completed || job.failed)
                  .map((job) => (
                    <tr key={job.id} className="hover:bg-gray-50/70">
                      <td className="py-3 px-3 font-mono text-gray-500">
                        {job.id}
                      </td>
                      <td className="py-3 px-3 font-semibold text-gray-900">
                        {job.videoName || "CCTV video"}
                      </td>
                      <td className="py-3 px-3 text-gray-600">
                        {job.cameraId || "—"}
                      </td>
                      <td className="py-3 px-3 text-gray-600">
                        {job.mappingName || "Homography"}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-semibold ${job.failed ? "bg-rose-50 text-rose-600" : "bg-[#e8f5ee] text-[#08764e]"}`}
                        >
                          {job.failed ? (
                            <AlertCircle size={12} />
                          ) : (
                            <CheckCircle2 size={12} />
                          )}
                          {job.failed ? "Failed" : "Completed"}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right space-x-2">
                        {job.completed && (
                          <button
                            onClick={handleViewHeatmap}
                            className="px-2.5 py-1 bg-[#08764e] hover:bg-[#065e3e] text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition shadow-xs cursor-pointer"
                          >
                            <Flame size={12} className="fill-current" />
                            <span>View Heatmap</span>
                          </button>
                        )}
                        {job.annotatedVideoUrl && (
                          <button
                            onClick={() =>
                              setPreviewVideoModal(
                                `${API_BASE_URL}${job.annotatedVideoUrl}`,
                              )
                            }
                            className="px-2 py-1 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-medium transition cursor-pointer"
                          >
                            Preview
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Bottom Processing Control Footer */}
      {files.length > 0 && (
        <section className="bottom-section flex flex-col sm:flex-row justify-between items-center gap-4 bg-white backdrop-blur-md p-5 rounded-xl border border-gray-100 shadow-xl">
          <div className="stats flex flex-wrap gap-6 text-sm">
            <div>
              <span className="text-gray-500">Total Videos:</span>{" "}
              <strong>{files.length}</strong>
            </div>
            <div>
              <span className="text-gray-500">Total Size:</span>{" "}
              <strong>{formatFileSize(totalSize)}</strong>
            </div>
            <div>
              <span className="text-gray-500">Mapped Status:</span>{" "}
              <strong
                className={
                  allVideosMapped ? "text-[#08764e]" : "text-amber-700"
                }
              >
                {mappedCount}/{files.length} Videos Configured
              </strong>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end">
            <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer bg-[#f8faf9] hover:bg-gray-100 px-3 py-2.5 rounded-xl border border-gray-200 hover:border-[#a1c9b3]/60 transition">
              <input
                type="checkbox"
                checked={showDesktopPreview}
                onChange={(e) => setShowDesktopPreview(e.target.checked)}
                className="accent-[#08764e] w-3.5 h-3.5 rounded"
              />
              <span className="font-medium">
                🖥️ Pop-up Desktop OpenCV Window
              </span>
            </label>

            {!allVideosMapped && (
              <span className="text-xs text-amber-700 flex items-center gap-1.5 font-medium hidden md:inline">
                <AlertCircle size={14} /> Configure mapping for all videos to
                start
              </span>
            )}

            <button
              className={`px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2.5 transition-all shadow-lg ${
                allVideosMapped
                  ? "bg-gradient-to-r from-[#08764e] to-[#0b8b60] hover:from-[#065e3e] hover:to-[#08764e] text-white shadow-emerald-900/10 cursor-pointer"
                  : "bg-gray-50 text-slate-500 border border-gray-200 cursor-not-allowed opacity-60"
              }`}
              onClick={startProcessing}
              disabled={!allVideosMapped || processingBatch}
            >
              {processingBatch ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Starting Processing...
                </>
              ) : (
                <>
                  <Play
                    size={18}
                    className={allVideosMapped ? "fill-current" : ""}
                  />
                  Start Processing ({files.length} Video
                  {files.length > 1 ? "s" : ""})
                </>
              )}
            </button>
          </div>
        </section>
      )}

      {/* Embedded Homography Calibrator Modal for Specific Video */}
      {calibratingVideoId && currentCalibratingVideo && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="relative w-full max-w-7xl max-h-[92vh] overflow-y-auto rounded-2xl bg-white border border-[#08764e] shadow-2xl p-2 sm:p-4 animate-fadeIn">
            <UnifiedCalibrationZoneEditor
              videoItem={currentCalibratingVideo}
              onClose={() => setCalibratingVideoId(null)}
              initialConfig={{
                id: currentCalibratingVideo.mapping?.id,
                name: currentCalibratingVideo.mapping?.name,
                videoSrc: currentCalibratingVideo.mapping?.videoSrc,
                blueprintSrc: currentCalibratingVideo.mapping?.blueprintSrc,
                videoPoints: currentCalibratingVideo.mapping?.videoPoints,
                blueprintPoints:
                  currentCalibratingVideo.mapping?.blueprintPoints,
                videoResolution:
                  currentCalibratingVideo.mapping?.videoResolution,
                blueprintResolution:
                  currentCalibratingVideo.mapping?.blueprintResolution,
                HMatrix: currentCalibratingVideo.mapping?.HMatrix,
                zones:
                  currentCalibratingVideo.mapping?.zones ||
                  currentCalibratingVideo.zones ||
                  [],
              }}
              onSaveCalibration={(calibrationPayload) =>
                handleSaveCalibrationForVideo(
                  currentCalibratingVideo.id,
                  calibrationPayload,
                )
              }
              onSaveZones={(savedZones) =>
                handleSaveZonesForVideo(currentCalibratingVideo.id, savedZones)
              }
            />
          </div>
        </div>
      )}

      {/* Processed Video with Trajectories Modal Player */}
      {previewVideoModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-2xl flex flex-col gap-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Play size={18} className="text-[#08764e]" />
                Processed Video with Drawn Trajectories & Bounding Boxes
              </h3>
              <button
                onClick={() => setPreviewVideoModal(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="w-full bg-black rounded-xl overflow-hidden aspect-video flex items-center justify-center shadow-inner">
              <video
                src={previewVideoModal}
                controls
                autoPlay
                className="w-full h-full object-contain"
              >
                Your browser does not support the video tag.
              </video>
            </div>

            <div className="flex flex-wrap justify-between items-center text-xs text-gray-500 pt-1 gap-2">
              <span>
                Includes YOLO person detections, ByteTrack IDs, foot points, and
                motion trajectory polylines.
              </span>
              <div className="flex items-center gap-2">
                <a
                  href={previewVideoModal}
                  download="annotated_trajectories.mp4"
                  className="px-3 py-1.5 bg-gray-50 hover:bg-gray-200 border border-gray-200 text-gray-600 rounded-lg font-medium transition"
                >
                  Download Video
                </a>
                <button
                  onClick={() => setPreviewVideoModal(null)}
                  className="px-4 py-1.5 bg-[#08764e] hover:bg-[#065e3e] text-white rounded-lg font-medium transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
