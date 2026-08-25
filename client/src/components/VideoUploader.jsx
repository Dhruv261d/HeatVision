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
  Loader2,
} from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const socket = io(API_BASE_URL, { autoConnect: false });

export default function VideoUploader() {
  const fileInputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState(false);

  // Multiple active job processing state
  const [activeJobs, setActiveJobs] = useState({});

  const allowedTypes = [
    "video/mp4",
    "video/x-msvideo",
    "video/quicktime",
    "video/x-matroska",
  ];
  const allowedExtensions = [".mp4", ".avi", ".mov", ".mkv"];
  const maxFileSize = 2 * 1024 * 1024 * 1024; // 2 GB

  useEffect(() => {
    socket.connect();

    socket.on("processing:status", (data) => {
      setActiveJobs((prev) => ({
        ...prev,
        [data.id]: {
          ...prev[data.id],
          id: data.id,
          cameraId: data.cameraId,
          statusMsg: data.message || `Status: ${data.status}`,
          progress: data.progress || prev[data.id]?.progress || 0,
        }
      }));
    });

    socket.on("processing:progress", (data) => {
      setActiveJobs((prev) => ({
        ...prev,
        [data.jobId]: {
          ...prev[data.jobId],
          progress: data.progress || 0,
          statusMsg: `Processing frame ${data.frame}/${data.totalFrames}`,
        }
      }));
    });

    socket.on("processing:complete", (data) => {
      setActiveJobs((prev) => ({
        ...prev,
        [data.jobId]: {
          ...prev[data.jobId],
          progress: 100,
          statusMsg: "Heatmap generation complete!",
          completed: true,
        }
      }));
      setTimeout(() => {
        setActiveJobs((prev) => {
          const updated = { ...prev };
          delete updated[data.jobId];
          return updated;
        });
      }, 5000);
    });

    socket.on("processing:error", (data) => {
      setActiveJobs((prev) => ({
        ...prev,
        [data.jobId]: {
          ...prev[data.jobId],
          statusMsg: `Processing error: ${data.error}`,
          failed: true,
        }
      }));
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const validateFile = (file) => {
    const extension = "." + file.name.split(".").pop().toLowerCase();
    const validType =
      allowedTypes.includes(file.type) ||
      allowedExtensions.includes(extension);

    if (!validType) {
      alert(
        `${file.name} is not supported.\nPlease upload MP4, AVI, MOV, or MKV files.`
      );
      return false;
    }

    if (file.size > maxFileSize) {
      alert(`${file.name} exceeds the maximum size of 2 GB.`);
      return false;
    }
    return true;
  };

  const addFiles = (selectedFiles) => {
    const validFiles = Array.from(selectedFiles).filter(validateFile);
    const newFiles = validFiles.map((file) => ({
      id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
      file,
      camera: "cam_1_entrance",
    }));
    setFiles((prev) => [...prev, ...newFiles]);
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

  const uploadVideos = async () => {
    if (files.length === 0) {
      alert("Please select at least one video.");
      return;
    }

    setUploading(true);
    setUploadSuccess(false);
    setUploadMessage("Preparing batch upload...");

    // Group files by cameraId for batch upload
    const cameraGroups = files.reduce((acc, item) => {
      const cam = item.camera || "cam_1_entrance";
      if (!acc[cam]) acc[cam] = [];
      acc[cam].push(item.file);
      return acc;
    }, {});

    try {
      for (const [cameraId, fileList] of Object.entries(cameraGroups)) {
        const formData = new FormData();
        formData.append("cameraId", cameraId);

        fileList.forEach((file) => {
          formData.append("video", file);
        });

        setUploadMessage(`Uploading ${fileList.length} file(s) for ${cameraId}...`);

        const response = await fetch(`${API_BASE_URL}/api/videos/upload`, {
          method: "POST",
          body: formData,
        });

        const data = await response.json();
        if (!response.ok)
          throw new Error(data.message || "Video batch upload failed");

        setUploadSuccess(true);
        setUploadMessage("Batch uploaded successfully! Queueing processing task...");
        
        setActiveJobs((prev) => ({
          ...prev,
          [data.jobId]: {
            id: data.jobId,
            cameraId: cameraId,
            progress: 0,
            statusMsg: "Queued for processing...",
          }
        }));
      }
    } catch (error) {
      setUploadSuccess(false);
      setUploadMessage(error.message || "Failed to upload video batch");
    } finally {
      setUploading(false);
    }
  };

  const updateCamera = (id, camera) => {
    setFiles((prev) =>
      prev.map((item) => (item.id === id ? { ...item, camera } : item))
    );
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024)
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const totalSize = files.reduce((total, item) => total + item.file.size, 0);

  return (
    <div className="w-full">
      {uploadMessage && (
        <div
          style={{
            position: "fixed",
            top: "105px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 9999,
            minWidth: "360px",
            padding: "16px 28px",
            borderRadius: "12px",
            background: uploadSuccess ? "#16a34a" : "#1e293b",
            color: "#ffffff",
            boxShadow: "0 10px 30px rgba(0, 0, 0, 0.35)",
            fontSize: "15px",
            fontWeight: "600",
            textAlign: "center",
          }}
        >
          {uploadMessage}
        </div>
      )}

      {/* Hero Section */}
      <section className="hero-section mb-8">
        <div className="hero-content">
          <div className="hero-main">
            <h4>Welcome to</h4>
            <h1>HEATVISION</h1>
            <p className="hero-description">
              Upload CCTV footage, generate intelligent heatmaps, and unlock
              powerful insights.
            </p>
          </div>
        </div>
      </section>

      {/* Active Jobs Processing Indicator */}
      {Object.values(activeJobs).length > 0 && (
        <div className="space-y-4 mb-8">
          {Object.values(activeJobs).map((job) => (
            <div key={job.id} className="bg-slate-800/90 border border-blue-500/40 p-5 rounded-xl shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Loader2 className="animate-spin text-blue-400" size={20} />
                  <span className="font-semibold text-sm">
                    Processing Job ({job.cameraId}): <code className="text-blue-300">{job.id}</code>
                  </span>
                </div>
                <span className="text-xs text-blue-400 font-bold">
                  {(job.progress || 0).toFixed(0)}%
                </span>
              </div>
              <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden mb-2">
                <div
                  className="bg-blue-500 h-full transition-all duration-300 ease-out"
                  style={{ width: `${job.progress || 0}%` }}
                />
              </div>
              <p className="text-xs text-slate-300 italic text-right">
                {job.statusMsg || "Initializing pipeline..."}
              </p>
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
                : "border-slate-700 bg-slate-800/40"
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
            <button
              className="browse-button px-4 py-2 bg-blue-600 rounded-lg text-sm font-medium hover:bg-blue-500 transition"
              onClick={handleBrowseClick}
            >
              <FolderOpen size={16} className="inline mr-2" /> Browse Files
            </button>
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

        <section className="guidelines-card bg-slate-800/60 p-6 rounded-xl border border-slate-700/60 flex flex-col gap-3">
          <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
            <Info size={18} className="text-blue-400" /> Upload Guidelines
          </h3>
          <div className="guideline text-xs text-slate-300 flex items-center gap-2">
            <Video size={16} /> Accepted formats: MP4, AVI, MOV, MKV
          </div>
          <div className="guideline text-xs text-slate-300 flex items-center gap-2">
            <FileVideo size={16} /> Maximum size: 2GB per file
          </div>
          <div className="guideline text-xs text-slate-300 flex items-center gap-2">
            <HardDrive size={16} /> Batch uploads supported (up to 50 clips)
          </div>
          <div className="guideline text-xs text-slate-300 flex items-center gap-2">
            <ShieldCheck size={16} /> Higher resolutions improve accuracy
          </div>
        </section>
      </div>

      {/* Queue List */}
      {files.length > 0 && (
        <section className="queue-card bg-slate-800/80 p-6 rounded-xl border border-slate-700/60 mb-6">
          <div className="queue-header flex justify-between items-center mb-4">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <ListVideo size={18} /> Upload Queue ({files.length})
            </h3>
            <button
              className="clear-button text-xs text-rose-400 hover:underline"
              onClick={clearFiles}
              disabled={uploading}
            >
              Clear All
            </button>
          </div>

          <div className="space-y-3">
            {files.map((item) => (
              <div
                key={item.id}
                className="queue-item flex items-center justify-between p-3 bg-slate-900/60 rounded-lg border border-slate-700/50"
              >
                <div className="flex items-center gap-3">
                  <Video size={24} className="text-slate-400" />
                  <div>
                    <strong className="text-sm block truncate max-w-xs">
                      {item.file.name}
                    </strong>
                    <span className="text-xs text-slate-400">
                      {formatFileSize(item.file.size)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <select
                    className="bg-slate-800 text-xs px-2 py-1 rounded border border-slate-700 text-slate-200"
                    value={item.camera}
                    onChange={(e) => updateCamera(item.id, e.target.value)}
                    disabled={uploading}
                  >
                    <option value="cam_1_entrance">Camera 1 (Entrance)</option>
                    <option value="cam_2_aisle_a">Camera 2 (Aisle A)</option>
                    <option value="cam_3_checkout">Camera 3 (Checkout)</option>
                    <option value="cam_4_backroom">Camera 4 (Backroom)</option>
                  </select>

                  <button
                    className="text-slate-400 hover:text-rose-400 transition"
                    onClick={() => removeFile(item.id)}
                    disabled={uploading}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Action Footer */}
      {files.length > 0 && (
        <section className="bottom-section flex justify-between items-center bg-slate-800/40 p-4 rounded-xl border border-slate-700/50">
          <div className="stats flex gap-6 text-sm">
            <div>
              <span className="text-slate-400">Total Files:</span>{" "}
              <strong>{files.length}</strong>
            </div>
            <div>
              <span className="text-slate-400">Total Size:</span>{" "}
              <strong>{formatFileSize(totalSize)}</strong>
            </div>
          </div>
          <button
            className="px-6 py-2.5 bg-blue-600 rounded-lg font-semibold hover:bg-blue-500 transition disabled:opacity-50 flex items-center gap-2"
            onClick={uploadVideos}
            disabled={uploading}
          >
            {uploading && <Loader2 size={16} className="animate-spin" />}
            {uploading ? "Uploading Batch..." : "Upload Videos"}
          </button>
        </section>
      )}
    </div>
  );
}