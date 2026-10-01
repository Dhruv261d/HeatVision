import React, { useState } from "react";
import {
  Menu,
  X,
  Upload,
  BarChart3,
  Video,
  Target,
  PieChart,
  Info,
  Sparkles,
  TrendingUp,
  FileVideo,
  Users,
  Clock,
  Activity,
  ArrowUpRight,
} from "lucide-react";
import HomographyCalibrator from "./components/HomographyCalibrator";
import VideoUploader from "./components/VideoUploader";
// import "./App.css";

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("home"); // 'home' | 'calibration' | 'upload'

  return (
    <div className="app min-h-screen bg-slate-900 text-white flex flex-col font-sans">
      {/* Top Header */}
      <header className="top-header flex items-center justify-between px-6 py-4 bg-slate-800/80 backdrop-blur-md border-b border-slate-700/60 sticky top-0 z-30">
        <div className="header-left flex items-center gap-4">
          <button
            className="menu-button p-2 -ml-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700/50 transition"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>
          <div
            className="flex items-center gap-2.5 cursor-pointer"
            onClick={() => setActiveTab("home")}
          >
            <img
              src="/heatvision-logo.png"
              alt="HeatVision"
              className="heatvision-logo h-7 w-auto"
            />
            {/* <span className="font-bold text-lg tracking-wide bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              HeatVision
            </span> */}
          </div>
        </div>

        <div className="user-section flex items-center gap-3">
          <div className="user-avatar bg-gradient-to-tr from-blue-600 to-indigo-500 text-white rounded-full w-9 h-9 flex items-center justify-center font-bold text-sm shadow-md">
            AM
          </div>
          <div className="user-info text-right hidden sm:block">
            <strong className="block text-sm text-slate-200 leading-tight">
              Alex Morgan
            </strong>
            <small className="text-xs text-slate-400">Store Manager</small>
          </div>
        </div>
      </header>

      {/* Navigation Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay fixed inset-0 bg-black/60 backdrop-blur-xs z-40 transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Navigation Sidebar */}
      <aside
        className={`sidebar fixed top-0 left-0 h-full w-72 bg-slate-800/95 border-r border-slate-700/80 z-50 transform transition-transform duration-300 ease-in-out p-5 flex flex-col justify-between shadow-2xl ${sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
      >
        <div>
          <div className="sidebar-header flex items-center justify-between pb-4 border-b border-slate-700/60 mb-6">
            <div className="flex items-center gap-2">
              <img
                src="/heatvision-logo.png"
                alt="HeatVision"
                className="sidebar-logo h-7"
              />
              {/* <span className="font-bold text-base tracking-wide text-white">
                HeatVision AI
              </span> */}
            </div>
            <button
              className="close-sidebar p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700/50 transition"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close menu"
            >
              <X size={20} />
            </button>
          </div>

          <nav className="side-navigation flex flex-col gap-1.5">
            <button
              className={`nav-item flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === "home"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                : "text-slate-300 hover:bg-slate-700/50 hover:text-white"
                }`}
              onClick={() => {
                setActiveTab("home");
                setSidebarOpen(false);
              }}
            >
              <BarChart3 size={19} />
              <span>Dashboard Overview</span>
            </button>

            <button
              className={`nav-item flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === "calibration"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                : "text-slate-300 hover:bg-slate-700/50 hover:text-white"
                }`}
              onClick={() => {
                setActiveTab("calibration");
                setSidebarOpen(false);
              }}
            >
              <Target size={19} className="text-blue-400" />
              <span>Camera Calibration</span>
            </button>

            <button
              className={`nav-item flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === "upload"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                : "text-slate-300 hover:bg-slate-700/50 hover:text-white"
                }`}
              onClick={() => {
                setActiveTab("upload");
                setSidebarOpen(false);
              }}
            >
              <Upload size={19} />
              <span>Upload CCTV Footage</span>
            </button>

            <button className="nav-item flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm text-slate-400 hover:bg-slate-700/40 hover:text-slate-200 transition-all">
              <Video size={19} />
              <span>Camera Management</span>
            </button>

            <button className="nav-item flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm text-slate-400 hover:bg-slate-700/40 hover:text-slate-200 transition-all">
              <PieChart size={19} />
              <span>Analytics</span>
            </button>

            <button className="nav-item flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm text-slate-400 hover:bg-slate-700/40 hover:text-slate-200 transition-all">
              <TrendingUp size={19} />
              <span>AI Suggestions</span>
            </button>

            <button className="nav-item flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm text-slate-400 hover:bg-slate-700/40 hover:text-slate-200 transition-all">
              <FileVideo size={19} />
              <span>Reports</span>
            </button>
          </nav>
        </div>

        <div className="sidebar-bottom flex items-start gap-3 p-3.5 bg-slate-900/60 rounded-xl border border-slate-700/50 text-xs text-slate-400">
          <Info size={18} className="shrink-0 text-blue-400 mt-0.5" />
          <div>
            <strong className="block text-slate-200 mb-0.5 font-semibold">
              HeatVision Engine
            </strong>
            <p className="leading-relaxed">
              Perspective mapping & retail spatial analytics active.
            </p>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-10 w-full flex flex-col items-center">
        {/* Minimal Homepage View */}
        {activeTab === "home" && (
          <div className="w-full max-w-5xl space-y-8 animate-fadeIn">
            {/* Top Header Card */}
            <div className="bg-slate-800/50 backdrop-blur-md p-8 rounded-2xl border border-slate-700/50 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2 text-left">
                <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
                  <Sparkles className="text-blue-400" size={28} />
                  Spatial Analytics Dashboard
                </h1>
                <p className="text-slate-400 text-sm max-w-xl leading-relaxed">
                  Welcome to HeatVision AI. Review live store metrics, calibrate cameras, or process new CCTV video batches below.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setActiveTab("calibration")}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-sm font-semibold rounded-xl transition flex items-center gap-2"
                >
                  <Target size={16} className="text-blue-400" />
                  Calibrate
                </button>
                <button
                  onClick={() => setActiveTab("upload")}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl transition shadow-lg shadow-blue-500/20 flex items-center gap-2"
                >
                  <Upload size={16} />
                  Upload Video
                </button>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-800/40 p-5 rounded-xl border border-slate-700/40 text-left space-y-3">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-xs font-semibold uppercase tracking-wider">Active Cameras</span>
                  <Video size={18} className="text-blue-400" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold">4 / 4</span>
                  <span className="text-xs text-emerald-400 font-medium">100% Online</span>
                </div>
              </div>

              <div className="bg-slate-800/40 p-5 rounded-xl border border-slate-700/40 text-left space-y-3">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-xs font-semibold uppercase tracking-wider">Footfall Count</span>
                  <Users size={18} className="text-purple-400" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold">1,248</span>
                  <span className="text-xs text-emerald-400 font-medium">+12.4% today</span>
                </div>
              </div>

              <div className="bg-slate-800/40 p-5 rounded-xl border border-slate-700/40 text-left space-y-3">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-xs font-semibold uppercase tracking-wider">Avg Dwell Time</span>
                  <Clock size={18} className="text-amber-400" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold">4.2 min</span>
                  <span className="text-xs text-slate-400 font-medium">Aisle A peak</span>
                </div>
              </div>

              <div className="bg-slate-800/40 p-5 rounded-xl border border-slate-700/40 text-left space-y-3">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-xs font-semibold uppercase tracking-wider">Conversion Rate</span>
                  <Activity size={18} className="text-emerald-400" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold">24.8%</span>
                  <span className="text-xs text-emerald-400 font-medium">+3.2% vs yesterday</span>
                </div>
              </div>
            </div>

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div
                onClick={() => setActiveTab("calibration")}
                className="bg-slate-800/30 hover:bg-slate-800/50 p-6 rounded-2xl border border-slate-700/30 hover:border-blue-500/40 transition cursor-pointer text-left flex justify-between items-start group"
              >
                <div className="space-y-2">
                  <div className="p-3 bg-blue-500/10 rounded-xl inline-flex text-blue-400 group-hover:bg-blue-500/20 transition">
                    <Target size={24} />
                  </div>
                  <h3 className="text-lg font-bold text-white">Camera Homography Calibration</h3>
                  <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
                    Configure and map video coordinates directly to a 2D floorplan blueprint for real-world coordinate tracking.
                  </p>
                </div>
                <ArrowUpRight size={20} className="text-slate-500 group-hover:text-white transition" />
              </div>

              <div
                onClick={() => setActiveTab("upload")}
                className="bg-slate-800/30 hover:bg-slate-800/50 p-6 rounded-2xl border border-slate-700/30 hover:border-blue-500/40 transition cursor-pointer text-left flex justify-between items-start group"
              >
                <div className="space-y-2">
                  <div className="p-3 bg-purple-500/10 rounded-xl inline-flex text-purple-400 group-hover:bg-purple-500/20 transition">
                    <Upload size={24} />
                  </div>
                  <h3 className="text-lg font-bold text-white">Upload CCTV Video clips</h3>
                  <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
                    Batch-upload camera clips, join them using FFmpeg, and send them to the YOLOv8 person detection pipeline.
                  </p>
                </div>
                <ArrowUpRight size={20} className="text-slate-500 group-hover:text-white transition" />
              </div>
            </div>
          </div>
        )}

        {/* Camera Calibration Tool View */}
        {activeTab === "calibration" && (
          <div className="w-full max-w-5xl">
            <HomographyCalibrator />
          </div>
        )}

        {/* CCTV Video Uploader View */}
        {activeTab === "upload" && (
          <div className="w-full max-w-5xl">
            <VideoUploader />
          </div>
        )}
      </main>
    </div>
  );
}

export default App;