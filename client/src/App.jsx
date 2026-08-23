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
} from "lucide-react";
import HomographyCalibrator from "./components/HomographyCalibrator";
import "./App.css";

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("home"); // 'home' | 'calibration'

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
            <span className="font-bold text-lg tracking-wide bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              HeatVision
            </span>
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
        className={`sidebar fixed top-0 left-0 h-full w-72 bg-slate-800/95 border-r border-slate-700/80 z-50 transform transition-transform duration-300 ease-in-out p-5 flex flex-col justify-between shadow-2xl ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
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
              <span className="font-bold text-base tracking-wide text-white">
                HeatVision AI
              </span>
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
              className={`nav-item flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === "home"
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
              className={`nav-item flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === "calibration"
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

            <button className="nav-item flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm text-slate-400 hover:bg-slate-700/40 hover:text-slate-200 transition-all">
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
      <main className="flex-1 p-6 md:p-10 flex flex-col items-center justify-center">
        {/* Minimal Homepage View */}
        {activeTab === "home" && (
          <div className="max-w-xl text-center flex flex-col items-center gap-4 my-auto">
            <div className="p-4 bg-slate-800/80 rounded-2xl border border-slate-700/50 shadow-xl inline-flex text-blue-400">
              <Sparkles size={36} />
            </div>

            <div className="space-y-2">
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                HeatVision Workspace
              </h1>
              <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
                Open the sidebar menu to navigate between video tools, camera
                settings, and spatial analytics.
              </p>
            </div>
          </div>
        )}

        {/* Camera Calibration Tool View */}
        {activeTab === "calibration" && (
          <div className="w-full max-w-5xl">
            <HomographyCalibrator />
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
