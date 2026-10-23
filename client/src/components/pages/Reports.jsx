import React, { useState } from "react";
import {
  Calendar,
  Check,
  Download,
  FileText,
  Loader2,
  FileSpreadsheet,
} from "lucide-react";
import { MOCK_REPORTS_CONFIG } from "../../mock/mockData.js";
// import { generateReport } from "../services/api";

export default function Reports({ showToast }) {
  const [activeTab, setActiveTab] = useState("analytics"); // 'analytics' | 'sales'
  const [dateRange, setDateRange] = useState(
    MOCK_REPORTS_CONFIG.defaultDateRange,
  );
  const [format, setFormat] = useState("PDF"); // 'PDF' | 'CSV'
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const res = await generateReport({
        type: activeTab,
        dateRange,
        format,
      });

      // Simulate download
      const element = document.createElement("a");
      const file = new Blob(
        [
          `HeatVision ${activeTab.toUpperCase()} Report\n` +
            `Date Range: ${dateRange}\n` +
            `Generated: ${new Date().toLocaleString()}\n` +
            `Format: ${format}\n\n` +
            `Summary:\n` +
            `- Total Visitors: 1,248\n` +
            `- Peak Conversion: 35% (Zone B - Display/Checkout)\n` +
            `- High-Dwell Low-Conversion Opportunity: Zone A\n` +
            `- Estimated Recoverable Revenue: ₹26,300\n`,
        ],
        { type: format === "PDF" ? "application/pdf" : "text/csv" },
      );
      element.href = URL.createObjectURL(file);
      element.download =
        res.reportName || `HeatVision_Report.${format.toLowerCase()}`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);

      showToast(
        `Generated and downloaded ${res.reportName || "report"}`,
        "success",
      );
    } catch {
      showToast("Failed to generate report. Please try again.", "error");
    } finally {
      setIsGenerating(false);
    }
  };

  const checklistItems =
    activeTab === "analytics"
      ? MOCK_REPORTS_CONFIG.checklist
      : MOCK_REPORTS_CONFIG.salesChecklist;

  return (
    <div className="space-y-6 animate-fadeIn max-w-6xl">
      {/* Page Title & Subtitle */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
          Reports & Export
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Download detailed reports and analytics
        </p>
      </div>

      {/* Main Reports Card */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 sm:p-8 shadow-xs">
        {/* Top Tabs */}
        <div className="flex border-b border-gray-100 mb-8 gap-8">
          <button
            onClick={() => setActiveTab("analytics")}
            className={`pb-3 text-sm font-semibold transition relative ${
              activeTab === "analytics"
                ? "text-[#08764e]"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Analytics Report
            {activeTab === "analytics" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#08764e] rounded-full" />
            )}
          </button>

          <button
            onClick={() => setActiveTab("sales")}
            className={`pb-3 text-sm font-semibold transition relative ${
              activeTab === "sales"
                ? "text-[#08764e]"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Sales Report
            {activeTab === "sales" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#08764e] rounded-full" />
            )}
          </button>
        </div>

        {/* 2-Column Content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          {/* Left Column: Controls (col-span-7) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Select Date Range */}
            <div>
              <label
                htmlFor="date-range-input"
                className="block text-sm font-semibold text-gray-800 mb-2"
              >
                Select Date Range
              </label>
              <div className="relative">
                <input
                  id="date-range-input"
                  type="text"
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 pr-10 text-sm text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-[#08764e]/20 focus:border-[#08764e]"
                />
                <Calendar
                  size={18}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                />
              </div>
            </div>

            {/* Export Format */}
            <div>
              <span className="block text-sm font-semibold text-gray-800 mb-2">
                Export Format
              </span>
              <div className="grid grid-cols-2 gap-4">
                {/* PDF Option */}
                <div
                  onClick={() => setFormat("PDF")}
                  className={`rounded-xl px-4 py-3.5 flex items-center gap-3 cursor-pointer transition select-none ${
                    format === "PDF"
                      ? "border border-[#a1c9b3] bg-[#f2f8f4]"
                      : "border border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full flex items-center justify-center ${
                      format === "PDF"
                        ? "border-2 border-[#08764e]"
                        : "border border-gray-300"
                    }`}
                  >
                    {format === "PDF" && (
                      <div className="w-2 h-2 rounded-full bg-[#08764e]" />
                    )}
                  </div>
                  <span className="text-sm font-bold text-gray-900">PDF</span>
                </div>

                {/* CSV Option */}
                <div
                  onClick={() => setFormat("CSV")}
                  className={`rounded-xl px-4 py-3.5 flex items-center gap-3 cursor-pointer transition select-none ${
                    format === "CSV"
                      ? "border border-[#a1c9b3] bg-[#f2f8f4]"
                      : "border border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full flex items-center justify-center ${
                      format === "CSV"
                        ? "border-2 border-[#08764e]"
                        : "border border-gray-300"
                    }`}
                  >
                    {format === "CSV" && (
                      <div className="w-2 h-2 rounded-full bg-[#08764e]" />
                    )}
                  </div>
                  <span className="text-sm font-bold text-gray-900">CSV</span>
                </div>
              </div>
            </div>

            {/* Generate Report Button */}
            <div className="pt-2">
              <button
                type="button"
                disabled={isGenerating}
                onClick={handleGenerate}
                className="w-full max-w-sm bg-[#08764e] hover:bg-[#065e3e] active:scale-98 text-white font-medium py-3.5 px-6 rounded-xl flex items-center justify-between transition shadow-xs disabled:opacity-60 cursor-pointer"
              >
                <span className="text-sm font-semibold">
                  {isGenerating ? "Generating Report..." : "Generate Report"}
                </span>
                {isGenerating ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Download size={18} />
                )}
              </button>
            </div>
          </div>

          {/* Right Column: Report Includes (col-span-5) */}
          <div className="lg:col-span-5 lg:border-l lg:border-gray-100 lg:pl-10">
            <h2 className="text-sm font-semibold text-gray-800 mb-5">
              Report Includes
            </h2>

            <div className="space-y-4">
              {checklistItems.map((item, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#e8f5ee] text-[#08764e] flex items-center justify-center shrink-0">
                    <Check size={13} strokeWidth={3} />
                  </div>
                  <span className="text-sm text-gray-700 font-medium">
                    {item}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-8 p-4 rounded-xl bg-[#f8faf9] border border-[#e8efe9]">
              <div className="flex items-start gap-2.5">
                <FileText
                  size={16}
                  className="text-[#08764e] mt-0.5 shrink-0"
                />
                <div>
                  <p className="text-xs font-semibold text-gray-900">
                    Retail Audit Ready
                  </p>
                  <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">
                    Exported reports integrate CCTV spatial heatmaps with
                    registered POS cash register transactions.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
