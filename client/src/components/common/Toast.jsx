import React, { useEffect } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

export default function Toast({ message, type = "success", onClose }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const icons = {
    success: <CheckCircle2 size={18} className="text-[#08764e] shrink-0" />,
    error: <AlertCircle size={18} className="text-red-500 shrink-0" />,
    info: <Info size={18} className="text-blue-500 shrink-0" />,
  };

  const bgStyles = {
    success: "bg-[#f2f8f4] border-[#a1c9b3] text-gray-900",
    error: "bg-red-50 border-red-200 text-gray-900",
    info: "bg-blue-50 border-blue-200 text-gray-900",
  };

  return (
    <div
      role="alert"
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg transition-all animate-bounce-short ${bgStyles[type] || bgStyles.info}`}
    >
      {icons[type]}
      <p className="text-sm font-medium pr-2">{message}</p>
      <button
        onClick={onClose}
        className="p-1 hover:bg-black/5 rounded-lg text-gray-400 hover:text-gray-700 transition"
        aria-label="Dismiss toast"
      >
        <X size={15} />
      </button>
    </div>
  );
}
