import React from "react";
import { Menu, Bell, Store, Search } from "lucide-react";

export default function Header({ onOpenSidebar, title, subtitle }) {
  return (
    <header className="flex items-center justify-between py-4 px-4 sm:px-6 lg:px-8 border-b border-[#f0f3f1] bg-white sticky top-0 z-30 lg:hidden">
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenSidebar}
          className="p-2 -ml-1 text-gray-600 hover:text-gray-900 hover:bg-[#f4f7f5] rounded-xl transition"
          aria-label="Open navigation menu"
        >
          <Menu size={22} />
        </button>

        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-[#08764e] flex items-center justify-center text-white">
            <Store size={15} />
          </div>
          <span className="font-bold text-gray-900 text-base">HeatVision</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-[#08764e] bg-[#f2f8f4] px-2.5 py-1 rounded-full border border-[#a1c9b3]/50">
          Live System
        </span>
      </div>
    </header>
  );
}
