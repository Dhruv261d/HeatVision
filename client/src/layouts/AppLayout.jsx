import React, { useState } from "react";
import Sidebar from "../components/common/Sidebar";
import Header from "../components/common/Header";

export default function AppLayout({ activePage, onNavigate, children }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#f4f6f5] p-2 sm:p-4 md:p-6 lg:p-8 flex items-center justify-center font-sans">
      {/* Outer rounded app frame matching Figma screenshots */}
      <div className="w-full max-w-[1600px] min-h-[92vh] bg-white rounded-2xl md:rounded-3xl border border-[#e5ebe7] shadow-sm flex flex-col lg:flex-row overflow-hidden">
        {/* Responsive Sidebar */}
        <Sidebar
          activePage={activePage}
          onNavigate={onNavigate}
          isOpen={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
        />

        {/* Content Wrapper */}
        <div className="flex-1 flex flex-col min-w-0 bg-white">
          <Header
            onOpenSidebar={() => setMobileMenuOpen(true)}
            activePage={activePage}
          />

          <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 lg:p-10">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
