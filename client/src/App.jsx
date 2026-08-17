import React, { useRef, useState } from "react";
import {
  Menu,
  X,
  Upload,
  HardDrive,
  FolderOpen,
  Folder,
  Database,
  Video,
  FileVideo,
  ShieldCheck,
  Info,
  ListVideo,
  Trash2,
  Users,
  Target,
  PieChart,
  TrendingUp,
  BarChart3,
  CheckCircle2,
} from "lucide-react";

import "./App.css";

function App() {
  const fileInputRef = useRef(null);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [files, setFiles] = useState([]);

  // Upload status
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const allowedTypes = [
    "video/mp4",
    "video/x-msvideo",
    "video/quicktime",
    "video/x-matroska",
  ];

  const allowedExtensions = [".mp4", ".avi", ".mov", ".mkv"];

  const maxFileSize = 2 * 1024 * 1024 * 1024;

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
      camera: "Camera 1",
    }));

    setFiles((prev) => [...prev, ...newFiles]);
  };

  const handleFileChange = (event) => {
    if (event.target.files) {
      addFiles(event.target.files);
    }

    event.target.value = "";
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    setDragActive(false);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragActive(false);

    if (event.dataTransfer.files) {
      addFiles(event.dataTransfer.files);
    }
  };

  const removeFile = (id) => {
    setFiles((prev) => prev.filter((item) => item.id !== id));
  };

  const clearFiles = () => {
    setFiles([]);
  };

  const uploadVideos = async () => {
    if (files.length === 0) {
      alert("Please select at least one video.");
      return;
    }

    setUploading(true);
    setUploadSuccess(false);
    setUploadMessage("Uploading video...");

    for (const item of files) {
      const formData = new FormData();

      formData.append("video", item.file);

      try {
        setUploadSuccess(false);
        setUploadMessage(`Uploading ${item.file.name}...`);

        const response = await fetch(
          "http://localhost:5000/api/videos/upload",
          {
            method: "POST",
            body: formData,
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Video upload failed");
        }

        console.log("Upload successful:", data);

        setUploadSuccess(true);
        setUploadMessage(`${item.file.name} uploaded successfully!`);

        await new Promise((resolve) => setTimeout(resolve, 1800));
      } catch (error) {
        console.error("Upload error:", error);

        setUploadSuccess(false);
        setUploadMessage(`Failed to upload ${item.file.name}`);

        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    setUploading(false);
    setUploadMessage("");
    setUploadSuccess(false);
  };

  const updateCamera = (id, camera) => {
    setFiles((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              camera,
            }
          : item
      )
    );
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }

    if (bytes < 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }

    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const totalSize = files.reduce(
    (total, item) => total + item.file.size,
    0
  );

  return (
    <div className="app">

      {/* Upload Status Popup */}

      {uploadMessage && (
        <div
          style={{
            position: "fixed",
            top: "105px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 9999,
            minWidth: "360px",
            maxWidth: "600px",
            padding: "16px 28px",
            borderRadius: "12px",
            background: uploadSuccess ? "#16a34a" : "#1e293b",
            color: "#ffffff",
            boxShadow: "0 10px 30px rgba(0, 0, 0, 0.35)",
            fontSize: "15px",
            fontWeight: "600",
            textAlign: "center",
            border: uploadSuccess
              ? "1px solid rgba(255,255,255,0.2)"
              : "1px solid rgba(255,255,255,0.1)",
          }}
        >
          {uploadMessage}
        </div>
      )}

      {/* Header */}

      <header className="top-header">
        <div className="header-left">
          <button
            className="menu-button"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={25} />
          </button>

          <img
            src="/heatvision-logo.png"
            alt="HeatVision"
            className="heatvision-logo"
          />
        </div>

        <div className="user-section">
          <div className="user-avatar">AM</div>

          <div className="user-info">
            <strong>Alex Morgan</strong>
            <small>Store Manager</small>
          </div>
        </div>
      </header>

      {/* Sidebar */}

      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="sidebar-header">
          <img
            src="/heatvision-logo.png"
            alt="HeatVision"
            className="sidebar-logo"
          />

          <button
            className="close-sidebar"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
          >
            <X size={22} />
          </button>
        </div>

        <nav className="side-navigation">
          <button className="nav-item active">
            <Upload size={20} />
            <span>Upload CCTV Footage</span>
          </button>

          <button className="nav-item">
            <BarChart3 size={20} />
            <span>Dashboard</span>
          </button>

          <button className="nav-item">
            <Video size={20} />
            <span>Camera Management</span>
          </button>

          <button className="nav-item">
            <Target size={20} />
            <span>Heatmap Analysis</span>
          </button>

          <button className="nav-item">
            <PieChart size={20} />
            <span>Analytics</span>
          </button>

          <button className="nav-item">
            <TrendingUp size={20} />
            <span>AI Suggestions</span>
          </button>

          <button className="nav-item">
            <FileVideo size={20} />
            <span>Reports</span>
          </button>
        </nav>

        <div className="sidebar-bottom">
          <Info size={19} />

          <div>
            <strong>HeatVision AI</strong>

            <p>
              Analyze customer movement and optimize your store performance.
            </p>
          </div>
        </div>
      </aside>

      <main>

        {/* Hero Section */}

        <section className="hero-section">
          <img
            src="/hero-img.png"
            alt="HeatVision retail heatmap"
            className="hero-image"
          />

          <div className="hero-content">

            <div className="hero-main">
              <h4>Welcome to</h4>

              <h1>HEATVISION</h1>

              <p className="hero-description">
                Upload CCTV footage, generate intelligent heatmaps,
                <br />
                and unlock powerful insights to optimize your
                <br />
                store performance.
              </p>
            </div>

            <div className="hero-bottom">

              {/* Monitor Analyze Optimize Card */}

              <div className="hero-info-card">
                <div className="hero-info-icon">
                  <BarChart3 size={48} strokeWidth={2} />
                </div>

                <div className="hero-info-content">
                  <h3>Monitor. Analyze. Optimize.</h3>

                  <p>
                    HeatVision helps you understand customer
                    <br />
                    behavior like never before.
                  </p>

                  <span>Better decisions. Higher conversions.</span>
                </div>
              </div>

              {/* Feature Card */}

              <div className="hero-features">

                <div className="hero-feature">
                  <Users size={43} strokeWidth={1.8} />

                  <span>
                    Understand
                    <br />
                    Customer Flow
                  </span>
                </div>

                <div className="hero-feature">
                  <Target size={43} strokeWidth={1.8} />

                  <span>
                    Identify
                    <br />
                    Hot Zones
                  </span>
                </div>

                <div className="hero-feature">
                  <PieChart size={43} strokeWidth={1.8} />

                  <span>
                    Detect
                    <br />
                    Patterns
                  </span>
                </div>

                <div className="hero-feature">
                  <TrendingUp size={43} strokeWidth={1.8} />

                  <span>
                    Improve
                    <br />
                    Store Performance
                  </span>
                </div>

              </div>
            </div>
          </div>
        </section>

        {/* Upload Section */}

        <div className="main-container">

          <section className="upload-heading-section">

            <div className="upload-heading">
              <Upload size={36} strokeWidth={2} />

              <h1>
                Upload <span>CCTV Footage</span>
              </h1>
            </div>

            <p>
              Upload your CCTV videos to begin intelligent store analysis and
              heatmap generation.
            </p>

          </section>

          <div className="content-grid">

            {/* Upload Card */}

            <section className="upload-card">

              <div
                className={`drop-zone ${
                  dragActive ? "drag-active" : ""
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >

                <Upload
                  className="upload-icon"
                  size={50}
                  strokeWidth={1.8}
                />

                <h2>
                  Drag &amp; Drop your CCTV videos here
                </h2>

                <p className="browse-text">
                  or{" "}
                  <span
                    onClick={handleBrowseClick}
                    role="button"
                    tabIndex={0}
                  >
                    browse files
                  </span>{" "}
                  from your computer
                </p>

                <div className="format-text">
                  <span>MP4, AVI, MOV, MKV</span>

                  <b>•</b>

                  <span>Maximum 2 GB per file</span>
                </div>

                <button
                  className="browse-button"
                  onClick={handleBrowseClick}
                >
                  <FolderOpen size={18} />
                  Browse Files
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".mp4,.avi,.mov,.mkv,video/mp4,video/x-msvideo,video/quicktime,video/x-matroska"
                  multiple
                  hidden
                  onChange={handleFileChange}
                />

              </div>

            </section>

            {/* Guidelines */}

            <section className="guidelines-card">

              <h3>
                <Info size={20} />
                Upload Guidelines
              </h3>

              <div className="guideline">
                <Video size={18} />
                <span>Accepted formats: MP4, AVI, MKV</span>
              </div>

              <div className="guideline">
                <FileVideo size={18} />
                <span>Maximum file size: 2GB per file</span>
              </div>

              <div className="guideline">
                <HardDrive size={18} />
                <span>You can upload multiple files at once</span>
              </div>

              <div className="guideline">
                <ShieldCheck size={18} />
                <span>Better quality videos give better insights</span>
              </div>

            </section>

          </div>

          {/* Upload Queue */}

          {files.length > 0 && (
            <section className="queue-card">

              <div className="queue-header">

                <h3>
                  <ListVideo size={19} />
                  Upload Queue ({files.length})
                </h3>

                <button
                  className="clear-button"
                  onClick={clearFiles}
                  disabled={uploading}
                >
                  Clear All
                </button>

              </div>

              {files.map((item) => (
                <div className="queue-item" key={item.id}>

                  <div className="file-details">

                    <div className="video-thumbnail">
                      <Video size={27} />
                    </div>

                    <div className="file-info">

                      <strong title={item.file.name}>
                        {item.file.name}
                      </strong>

                      <div className="file-meta">
                        <span>
                          {formatFileSize(item.file.size)}
                        </span>

                        <span>•</span>

                        <span>Video</span>
                      </div>

                    </div>
                  </div>

                  <div className="camera-select-wrapper">

                    <label>Camera Angle</label>

                    <select
                      value={item.camera}
                      onChange={(event) =>
                        updateCamera(
                          item.id,
                          event.target.value
                        )
                      }
                      disabled={uploading}
                    >
                      <option>Camera 1</option>
                      <option>Camera 2</option>
                      <option>Camera 3</option>
                      <option>Camera 4</option>
                      <option>Camera 5</option>
                    </select>

                  </div>

                  <button
                    className="remove-button"
                    onClick={() => removeFile(item.id)}
                    aria-label={`Remove ${item.file.name}`}
                    disabled={uploading}
                  >
                    <Trash2 size={16} />
                  </button>

                </div>
              ))}

            </section>
          )}

          {/* Bottom Statistics */}

          {files.length > 0 && (
            <section className="bottom-section">

              <div className="stats">

                {/* Total Files */}

                <div className="stat-card">

                  <div className="stat-icon">
                    <Folder size={25} />
                  </div>

                  <div>
                    <span>Total Files</span>
                    <strong>{files.length}</strong>
                  </div>

                </div>

                {/* Total Size */}

                <div className="stat-card">

                  <div className="stat-icon">
                    <Database size={25} />
                  </div>

                  <div>
                    <span>Total Size</span>
                    <strong>{formatFileSize(totalSize)}</strong>
                  </div>

                </div>

              </div>

              <div className="upload-action">

                <button
                  className="upload-button"
                  onClick={uploadVideos}
                  disabled={uploading}
                >
                  <Upload size={21} />

                  {uploading
                    ? "Uploading..."
                    : "Upload Videos"}
                </button>

                <p>
                  <CheckCircle2 size={12} />
                  Files are ready for analysis
                </p>

              </div>

            </section>
          )}

        </div>
      </main>
    </div>
  );
}

export default App;