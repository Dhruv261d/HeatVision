import React from "react";
import {
  Home,
  Radio,
  Map,
  Sparkles,
  CreditCard,
  FileText,
  X,
  Store,
  Layers,
} from "lucide-react";

const NAV_ITEMS = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: Home,
    badge: "MAIN",
  },
  {
    id: "live_processing",
    label: "Live Processing",
    icon: Radio,
  },
  {
    id: "heatmap",
    label: "Floorplan Heatmap",
    icon: Map,
  },
  {
    id: "ai_insights",
    label: "AI Insights",
    icon: Sparkles,
  },
  {
    id: "pos_data",
    label: "POS Data",
    icon: CreditCard,
  },
  {
    id: "reports",
    label: "Reports",
    icon: FileText,
  },
];

export default function Sidebar({ activePage, onNavigate, isOpen, onClose }) {
  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 lg:hidden transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed lg:static top-0 left-0 z-50 h-full w-64 md:w-68 bg-[#ffffff] border-r border-[#f0f3f1] flex flex-col justify-between py-6 px-4 shrink-0 transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div>
          {/* Brand Logo & Close button for mobile */}
          <div className="flex items-center justify-between px-3 mb-8">
            <div
              className="flex items-center gap-3 cursor-pointer select-none"
              onClick={() => onNavigate("dashboard")}
            >
              <div className="w-8 h-8 rounded-full bg-[#08764e] flex items-center justify-center text-white shadow-xs">
                <Store size={18} strokeWidth={2.2} />
              </div>
              <span className="text-xl font-bold text-gray-900 tracking-tight">
                HeatVision
              </span>
            </div>

            <button
              onClick={onClose}
              className="lg:hidden p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
              aria-label="Close menu"
            >
              <X size={20} />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5" aria-label="Main Navigation">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activePage === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onNavigate(item.id);
                    if (onClose) onClose();
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-medium transition-all duration-150 text-left ${
                    isActive
                      ? "bg-[#08764e] text-white shadow-xs font-semibold"
                      : "text-gray-600 hover:text-gray-900 hover:bg-[#f4f7f5]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      size={18}
                      strokeWidth={isActive ? 2.4 : 2}
                      className={isActive ? "text-white" : "text-gray-400"}
                    />
                    <span>{item.label}</span>
                  </div>

                  {item.badge && (
                    <span
                      className={`text-[9px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded border ${
                        isActive
                          ? "border-white/30 text-white/90 bg-white/10"
                          : "border-gray-200 text-gray-400 bg-white"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Store Info / System Status */}
        <div className="pt-4 border-t border-[#f0f3f1] px-2">
          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-[#f8faf9] border border-[#e8efe9]">
            <div className="relative">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#08764e]"></span>
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-900 truncate">
                Store Engine v1.0
              </p>
              <p className="text-[11px] text-gray-500 truncate">
                FastAPI • YOLOv11
              </p>
            </div>
            <span className="text-[10px] font-medium text-[#08764e] bg-[#e8f5ee] px-2 py-0.5 rounded-full">
              Ready
            </span>
          </div>
        </div>
      </aside>
    </>
  );
}
