import React, { useState, useEffect } from "react";
import {
  Sparkles,
  ArrowUpRight,
  Store,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  TrendingDown,
  Gauge,
  TrendingUp,
  Clock,
  Compass,
} from "lucide-react";
import { getAIInsights } from "../../services/api.js";

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

  const { header, insights, lostSales, efficiencyScore, zoneConversion } = data;

  const scoreVal = efficiencyScore?.compositeScore ?? 78.5;
  const grade = efficiencyScore?.grade ?? "A";
  const subScores = efficiencyScore?.subScores ?? {
    conversionPerformance: 76.0,
    trafficDistributionBalance: 82.0,
    shopperEngagement: 80.0,
  };

  return (
    <div className="space-y-6 animate-fadeIn max-w-6xl">
      {/* Page Header with Mint Sparkle Circle */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-[#dcf2e6] text-[#08764e] flex items-center justify-center shrink-0 shadow-xs">
          <Sparkles size={26} strokeWidth={2.2} />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
            {header?.title || "AI Layout Insights"}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {header?.subtitle || "Smart layout, lost sales & merchandising recommendations from store activity"}
          </p>
        </div>
      </div>

      {/* Issue #39: Composite Store Floorplan Layout Efficiency Score Banner */}
      <div className="rounded-2xl border border-gray-100 bg-gradient-to-br from-white via-[#fcfefd] to-[#f4f9f6] p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          {/* Left: Overall Composite Gauge & Grade */}
          <div className="flex items-center gap-5">
            <div className="relative w-20 h-20 rounded-2xl bg-[#f2f8f4] border border-[#a1c9b3]/50 flex flex-col items-center justify-center shrink-0">
              <span className="text-2xl font-black text-[#08764e] tracking-tight">
                {scoreVal}
              </span>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                out of 100
              </span>
              <div className="absolute -top-2 -right-2 bg-[#08764e] text-white text-[11px] font-extrabold px-2 py-0.5 rounded-full shadow-xs">
                Grade {grade}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <Gauge size={18} className="text-[#08764e]" />
                <h2 className="text-base sm:text-lg font-bold text-gray-900">
                  Store Floorplan Layout Efficiency Score
                </h2>
              </div>
              <p className="text-xs text-gray-500 mt-1 max-w-md">
                Composite AI score calculated from conversion yield (40%), spatial traffic balance (30%), and shopper dwell engagement (30%).
              </p>
            </div>
          </div>

          {/* Right: 3 Sub-scores with animated progress bars */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:w-[480px]">
            <div className="bg-white p-3.5 rounded-xl border border-gray-100 shadow-2xs">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-gray-500 font-medium">Conversion Yield</span>
                <span className="font-bold text-gray-900">{subScores.conversionPerformance}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-[#08764e] h-1.5 rounded-full"
                  style={{ width: `${Math.min(100, subScores.conversionPerformance)}%` }}
                />
              </div>
              <span className="text-[10px] text-gray-400 mt-1 block">40% weight</span>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-gray-100 shadow-2xs">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-gray-500 font-medium">Traffic Balance</span>
                <span className="font-bold text-gray-900">{subScores.trafficDistributionBalance}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-[#6355d8] h-1.5 rounded-full"
                  style={{ width: `${Math.min(100, subScores.trafficDistributionBalance)}%` }}
                />
              </div>
              <span className="text-[10px] text-gray-400 mt-1 block">30% weight</span>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-gray-100 shadow-2xs">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-gray-500 font-medium">Dwell Engagement</span>
                <span className="font-bold text-gray-900">{subScores.shopperEngagement}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-[#d97706] h-1.5 rounded-full"
                  style={{ width: `${Math.min(100, subScores.shopperEngagement)}%` }}
                />
              </div>
              <span className="text-[10px] text-gray-400 mt-1 block">30% weight</span>
            </div>
          </div>
        </div>
      </div>

      {/* Issue #38: Rule-Based Explainable AI Layout Recommendations Grid */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 tracking-tight mb-4">
          Actionable Layout & Merchandising Recommendations
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {(insights || []).map((item) => {
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

                  {item.action && (
                    <div className="mt-3 bg-[#f8faf9] border border-gray-100 rounded-xl p-3 text-xs text-gray-700 leading-relaxed">
                      <strong className="text-[#08764e] font-semibold">Recommended Action: </strong>
                      {item.action}
                    </div>
                  )}
                </div>

                {/* Badges Footer */}
                <div className="flex items-center gap-4 mt-6 pt-2 border-t border-gray-50">
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
      </div>

      {/* Issue #37: Lost Sales Opportunities Detector */}
      {lostSales && (
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xs">
          {/* Header with Red Warning Circle */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3.5">
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

            {lostSales.totalLostValue && (
              <div className="text-right">
                <span className="text-xs text-gray-400 font-medium block">Total Unrealized Revenue</span>
                <span className="text-xl font-extrabold text-[#ef4444]">{lostSales.totalLostValue}</span>
              </div>
            )}
          </div>

          {/* Zone Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {(lostSales.zones || []).map((zone) => {
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
                        {zone.priority} Priority
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
      )}
    </div>
  );
}
