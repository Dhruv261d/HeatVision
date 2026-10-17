import React, { useRef, useState, useEffect } from "react";
import { io } from "socket.io-client";
import {
  Upload,
  Video,
  Info,
  HardDrive,
  FolderOpen,
  FileVideo,
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
  ChevronDown,
  Check,
  X,
  PlusCircle,
} from "lucide-react";
import HomographyCalibrator from "./HomographyCalibrator";

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

export default function VideoUploader() {
  const fileInputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);
  const [files, setFiles] = useState([]);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState("info"); // 'info' | 'success' | 'error'

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
      socket.disconnect();
    };
  }, [activeJobs]);

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
              mapping: calibrationPayload,
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
   * Save a newly defined mapping to reusable store presets
   */
  const handleSaveNewPreset = async (newPreset) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/caligraphy/presets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newPreset),
      });

      if (res.ok) {
        const data = await res.json();
        setStorePresets((prev) => [...prev, data.preset]);
      } else {
        // Fallback local persistence
        setStorePresets((prev) => [...prev, newPreset]);
      }
    } catch (err) {
      console.warn("Could not save preset to server, storing locally:", err);
      setStorePresets((prev) => [...prev, newPreset]);
    }
  };

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
    <div className="w-full relative">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div
          className={`fixed top-24 left-1/2 -translate-x-1/2 z-50 min-w-[340px] max-w-xl px-5 py-3.5 rounded-xl shadow-2xl text-sm font-semibold text-center border transition-all animate-fadeIn ${
            toastType === "success"
              ? "bg-emerald-600 text-white border-emerald-500 shadow-emerald-950/40"
              : toastType === "error"
                ? "bg-rose-600 text-white border-rose-500 shadow-rose-950/40"
                : "bg-slate-800 text-white border-slate-700 shadow-black/50"
          }`}
        >
          {toastMessage}
        </div>
      )}

      {/* Hero Header Section */}
      <section className="hero-section mb-8">
        <div className="hero-content">
          <div className="hero-main">
            <h4>Welcome to</h4>
            <h1>HEATVISION</h1>
            <p className="hero-description">
              Upload CCTV footage, configure camera perspective homography per
              video, and process individual retail spatial heatmaps.
            </p>
          </div>
        </div>
      </section>

      {/* Active Jobs Real-time Processing Strip */}
      {Object.values(activeJobs).length > 0 && (
        <div className="space-y-4 mb-8">
          <h3 className="text-sm font-bold uppercase tracking-wider text-blue-400 flex items-center gap-2">
            <Loader2 className="animate-spin" size={16} /> Active Processing
            Pipeline ({Object.values(activeJobs).length})
          </h3>
          {Object.values(activeJobs).map((job) => (
            <div
              key={job.id}
              className="bg-slate-800/90 border border-blue-500/40 p-5 rounded-xl shadow-xl transition-all"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <Loader2 className="animate-spin text-blue-400" size={18} />
                  <span className="font-semibold text-sm text-white">
                    Processing Job ({job.cameraId}):{" "}
                    <code className="text-blue-300 font-mono text-xs">
                      {job.id}
                    </code>
                  </span>
                  {job.mappingName && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 font-mono">
                      <Sparkles size={11} />
                      Mapping: {job.mappingName}
                    </span>
                  )}
                </div>
                <span className="text-xs text-blue-400 font-bold">
                  {(job.progress || 0).toFixed(0)}%
                </span>
              </div>
              <div className="w-full bg-slate-700 h-2.5 rounded-full overflow-hidden mb-2">
                <div
                  className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full transition-all duration-300 ease-out"
                  style={{ width: `${job.progress || 0}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-xs text-slate-400">
                <span className="italic">
                  {job.videoName ? `Source: ${job.videoName}` : ""}
                </span>
                <span className="text-slate-300 font-medium">
                  {job.statusMsg || "Processing pipeline active..."}
                </span>
              </div>

              {/* Real-time Video Trajectory Monitor */}
              {job.previewFrame && !job.completed && (
                <div className="mt-4 relative rounded-xl overflow-hidden border border-slate-700 bg-slate-950 max-w-xl mx-auto shadow-2xl">
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
                    <span className="text-emerald-400 font-mono">
                      Drawing live motion trails
                    </span>
                  </div>
                </div>
              )}

              {/* Finished Processed Video Action Bar */}
              {job.completed && job.annotatedVideoUrl && (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 p-3.5 bg-emerald-950/40 border border-emerald-500/30 rounded-xl">
                  <div className="flex items-center gap-2 text-emerald-300 text-xs sm:text-sm font-semibold">
                    <CheckCircle2
                      size={18}
                      className="text-emerald-400 shrink-0"
                    />
                    <span>
                      Processing completed! All trajectory trails were drawn &
                      saved.
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        setPreviewVideoModal(
                          `${API_BASE_URL}${job.annotatedVideoUrl}`,
                        )
                      }
                      className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-900/30 transition cursor-pointer"
                    >
                      <Play size={14} className="fill-current" />
                      Watch Video with Trajectories
                    </button>
                    <a
                      href={`${API_BASE_URL}${job.annotatedVideoUrl}`}
                      download={`annotated_${job.id}.mp4`}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
                    >
                      Download MP4
                    </a>
                    <button
                      onClick={() => {
                        setActiveJobs((prev) => {
                          const updated = { ...prev };
                          delete updated[job.id];
                          return updated;
                        });
                      }}
                      className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-700 transition"
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
                ? "border-blue-500 bg-blue-500/10"
                : "border-slate-700 bg-slate-800/40 hover:border-slate-600"
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <Upload className="mx-auto mb-4 text-slate-400" size={48} />
            <h2 className="text-xl font-bold mb-2">
              Drag & Drop your CCTV videos here
            </h2>
            <p className="text-slate-400 text-sm mb-4">
              or{" "}
              <span
                onClick={handleBrowseClick}
                className="text-blue-400 underline cursor-pointer"
              >
                browse files
              </span>{" "}
              from your computer
            </p>
            <div className="flex justify-center gap-3">
              <button
                className="browse-button px-4 py-2 bg-blue-600 rounded-lg text-sm font-medium hover:bg-blue-500 transition shadow-lg shadow-blue-600/30"
                onClick={handleBrowseClick}
              >
                <FolderOpen size={16} className="inline mr-2" /> Browse Files
              </button>
              <button
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-sm font-medium text-slate-200 transition flex items-center gap-2"
                onClick={() => setIsStandaloneCalibratorOpen(true)}
              >
                <Target size={16} className="text-blue-400" />
                Open Calibrator Tool
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

        <section className="guidelines-card bg-slate-800/60 p-6 rounded-xl border border-slate-700/60 flex flex-col gap-3 justify-between">
          <div>
            <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
              <Info size={18} className="text-blue-400" /> Workflow Guidelines
            </h3>
            <div className="space-y-2.5 text-xs text-slate-300">
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold shrink-0 mt-0.5">
                  1
                </span>
                <span>
                  Upload videos to queue (processing won't start yet).
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold shrink-0 mt-0.5">
                  2
                </span>
                <span>
                  Select a store preset or click "Configure mapping" to
                  calibrate.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold shrink-0 mt-0.5">
                  3
                </span>
                <span>
                  Once all videos have a valid mapping, start batch processing!
                </span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-700/60 text-[11px] text-slate-400 flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-emerald-400" />
            <span>2GB max file size. MP4, AVI, MOV, MKV supported.</span>
          </div>
        </section>
      </div>

      {/* Video Queue List with Mapping Controls */}
      {files.length > 0 && (
        <section className="queue-card bg-slate-800/80 p-6 rounded-xl border border-slate-700/60 mb-6 shadow-xl">
          <div className="queue-header flex flex-wrap justify-between items-center gap-3 mb-4 pb-3 border-b border-slate-700/50">
            <div>
              <h3 className="font-bold text-lg flex items-center gap-2">
                <ListVideo size={19} className="text-blue-400" /> Upload Queue (
                {files.length})
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Associate a camera mapping with each queued video before
                starting.
              </p>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-xs text-slate-300">
                Mapped Status:{" "}
                <strong
                  className={
                    allVideosMapped ? "text-emerald-400" : "text-amber-400"
                  }
                >
                  {mappedCount} / {files.length} Ready
                </strong>
              </span>

              <button
                className="clear-button text-xs text-rose-400 hover:text-rose-300 hover:underline transition"
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
                      ? "bg-slate-900/80 border-emerald-500/30"
                      : "bg-slate-900/60 border-amber-500/30"
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Left: Video File Details */}
                    <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                      <div
                        className={`p-2.5 rounded-lg shrink-0 ${
                          isMapped
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-amber-500/10 text-amber-400"
                        }`}
                      >
                        <Video size={24} />
                      </div>

                      <div className="min-w-0">
                        <strong className="text-sm font-semibold block truncate max-w-xs sm:max-w-md text-white">
                          {item.name || item.file?.name}
                        </strong>
                        <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5 flex-wrap">
                          <span>
                            {formatFileSize(item.size || item.file?.size)}
                          </span>
                          <span>•</span>
                          <span>
                            {item.uploadStatus === "uploading" ? (
                              <span className="text-blue-400 flex items-center gap-1">
                                <Loader2 size={12} className="animate-spin" />{" "}
                                Staging on server...
                              </span>
                            ) : item.uploadStatus === "uploaded" ? (
                              <span className="text-emerald-400">
                                Staged on server (Awaiting start)
                              </span>
                            ) : (
                              <span className="text-slate-400">
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
                        <span className="text-[11px] text-slate-400">
                          Camera:
                        </span>
                        <select
                          className="bg-slate-800 text-xs px-2.5 py-1.5 rounded-lg border border-slate-700 text-slate-200 focus:outline-none focus:border-blue-500"
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
                          className="text-slate-400 hidden sm:inline"
                        />
                        <select
                          className={`text-xs px-2.5 py-1.5 rounded-lg border focus:outline-none transition ${
                            isMapped
                              ? "bg-slate-800/90 border-emerald-500/40 text-emerald-300"
                              : "bg-slate-800 border-slate-700 text-slate-300"
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
                        <div className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                          <CheckCircle2
                            size={13}
                            className="text-emerald-400"
                          />
                          <span className="truncate max-w-[130px]">
                            {item.mapping.name}
                          </span>
                        </div>
                      ) : (
                        <div className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1.5">
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
                            ? "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"
                            : "bg-blue-600/30 hover:bg-blue-600 text-blue-200 hover:text-white border-blue-500/50 shadow-md shadow-blue-500/10"
                        }`}
                        title="Configure video coordinate homography"
                      >
                        <Target size={14} className="text-blue-400" />
                        {isMapped ? "Edit Mapping" : "Configure Mapping"}
                      </button>

                      {/* Remove Video Action Button */}
                      <button
                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
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

      {/* Bottom Processing Control Footer */}
      {files.length > 0 && (
        <section className="bottom-section flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-800/50 backdrop-blur-md p-5 rounded-xl border border-slate-700/60 shadow-xl">
          <div className="stats flex flex-wrap gap-6 text-sm">
            <div>
              <span className="text-slate-400">Total Videos:</span>{" "}
              <strong>{files.length}</strong>
            </div>
            <div>
              <span className="text-slate-400">Total Size:</span>{" "}
              <strong>{formatFileSize(totalSize)}</strong>
            </div>
            <div>
              <span className="text-slate-400">Mapped Status:</span>{" "}
              <strong
                className={
                  allVideosMapped ? "text-emerald-400" : "text-amber-400"
                }
              >
                {mappedCount}/{files.length} Videos Configured
              </strong>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end">
            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer bg-slate-900/70 hover:bg-slate-900 px-3 py-2.5 rounded-xl border border-slate-700/80 hover:border-blue-500/50 transition">
              <input
                type="checkbox"
                checked={showDesktopPreview}
                onChange={(e) => setShowDesktopPreview(e.target.checked)}
                className="accent-blue-500 w-3.5 h-3.5 rounded"
              />
              <span className="font-medium">
                🖥️ Pop-up Desktop OpenCV Window
              </span>
            </label>

            {!allVideosMapped && (
              <span className="text-xs text-amber-400 flex items-center gap-1.5 font-medium hidden md:inline">
                <AlertCircle size={14} /> Configure mapping for all videos to
                start
              </span>
            )}

            <button
              className={`px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2.5 transition-all shadow-lg ${
                allVideosMapped
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-600/30 cursor-pointer"
                  : "bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60"
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
          <div className="relative w-full max-w-7xl max-h-[92vh] overflow-y-auto rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-2 sm:p-4 animate-fadeIn">
            <HomographyCalibrator
              videoItem={currentCalibratingVideo}
              initialConfig={currentCalibratingVideo.mapping}
              presets={storePresets}
              onSaveCalibration={(calibData) =>
                handleSaveCalibrationForVideo(
                  currentCalibratingVideo.id,
                  calibData,
                )
              }
              onSaveAsPreset={handleSaveNewPreset}
              onClose={() => setCalibratingVideoId(null)}
            />
          </div>
        </div>
      )}

      {/* Standalone Homography Calibrator Modal (for General Preset Creation) */}
      {isStandaloneCalibratorOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="relative w-full max-w-7xl max-h-[92vh] overflow-y-auto rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-2 sm:p-4 animate-fadeIn">
            <HomographyCalibrator
              presets={storePresets}
              onSaveCalibration={(calibData) => {
                handleSaveNewPreset(calibData);
                setIsStandaloneCalibratorOpen(false);
                showToast(`Saved preset "${calibData.name}"!`, "success");
              }}
              onSaveAsPreset={handleSaveNewPreset}
              onClose={() => setIsStandaloneCalibratorOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Processed Video with Trajectories Modal Player */}
      {previewVideoModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-2xl flex flex-col gap-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-700/60 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Play size={18} className="text-emerald-400" />
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

            <div className="flex flex-wrap justify-between items-center text-xs text-slate-400 pt-1 gap-2">
              <span>
                Includes YOLO person detections, ByteTrack IDs, foot points, and
                motion trajectory polylines.
              </span>
              <div className="flex items-center gap-2">
                <a
                  href={previewVideoModal}
                  download="annotated_trajectories.mp4"
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-lg font-medium transition"
                >
                  Download Video
                </a>
                <button
                  onClick={() => setPreviewVideoModal(null)}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition cursor-pointer"
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
