import React, { useState, useEffect } from "react";
import {
  Sparkles,
  ArrowUpRight,
  Store,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  TrendingDown,
} from "lucide-react";
// import { getAIInsights } from "../services/api";

export default function AiInsightsPage({ showToast }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    async function loadInsights() {
      const result = await getAIInsights();
      setData(result);
    }
    loadInsights();
  }, []);

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 rounded-full border-2 border-[#08764e] border-t-transparent animate-spin" />
      </div>
    );
  }

  const { header, insights, lostSales } = data;

  return (
    <div className="space-y-6 animate-fadeIn max-w-6xl">
      {/* Page Header with Mint Sparkle Circle */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-[#dcf2e6] text-[#08764e] flex items-center justify-center shrink-0 shadow-xs">
          <Sparkles size={26} strokeWidth={2.2} />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
            {header.title}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">{header.subtitle}</p>
        </div>
      </div>

      {/* Top 2 Cards: High traffic / Product placement */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {insights.map((item) => {
          const isTeal = item.iconTheme === "teal";

          return (
            <div
              key={item.id}
              className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow duration-200"
            >
              <div>
                {/* Circular Icon */}
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center mb-4 ${
                    isTeal
                      ? "bg-[#def5ee] text-[#08764e]"
                      : "bg-[#ede9fe] text-[#7c3aed]"
                  }`}
                >
                  {isTeal ? (
                    <ArrowUpRight size={20} strokeWidth={2.4} />
                  ) : (
                    <Store size={19} strokeWidth={2} />
                  )}
                </div>

                {/* Title & Description */}
                <h2 className="text-base font-bold text-gray-900 tracking-tight">
                  {item.title}
                </h2>
                <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                  {item.description}
                </p>
              </div>

              {/* Badges Footer */}
              <div className="flex items-center gap-4 mt-6 pt-2">
                <span className="bg-[#ece8fa] text-[#6355d8] text-xs font-semibold px-3 py-1 rounded-full">
                  {item.type}
                </span>
                <span className="text-[#08764e] font-semibold text-xs">
                  {item.impact}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Section: Lost Sales Opportunities */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xs">
        {/* Header with Red Warning Circle */}
        <div className="flex items-center gap-3.5 mb-6">
          <div className="w-10 h-10 rounded-full bg-[#fee2e2] text-[#ef4444] flex items-center justify-center font-bold text-lg shrink-0">
            !
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-gray-900 tracking-tight">
              {lostSales.title}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">{lostSales.subtitle}</p>
          </div>
        </div>

        {/* 3 Zone Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {lostSales.zones.map((zone) => {
            const isHigh = zone.priority === "High";

            return (
              <div
                key={zone.id}
                className="rounded-xl border border-gray-100 bg-[#fbfdfc] p-5 flex flex-col justify-between hover:border-gray-200 transition"
              >
                <div>
                  {/* Zone Name & Priority Badge */}
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-gray-900 text-sm">
                      {zone.zone}
                    </span>
                    <span
                      className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                        isHigh
                          ? "bg-[#fee2e2] text-[#ef4444]"
                          : "bg-[#fef3c7] text-[#d97706]"
                      }`}
                    >
                      {zone.priority}
                    </span>
                  </div>

                  {/* Reason Text */}
                  <p className="text-xs text-gray-500 mt-3 min-h-[36px] leading-relaxed">
                    {zone.reason}
                  </p>
                </div>

                <div>
                  {/* Subtle Divider */}
                  <div className="border-t border-gray-100 my-4" />

                  {/* Lost Value & Label */}
                  <p className="text-xl font-bold text-gray-900 tracking-tight">
                    {zone.value}
                  </p>
                  <p className="text-xs text-[#ef4444] mt-0.5 font-medium">
                    {zone.label}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
