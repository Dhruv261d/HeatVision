import React, { useState, useEffect } from "react";
import {
  Users,
  Clock,
  TrendingUp,
  AlertTriangle,
  ArrowUpRight,
  MapPin,
  Calendar,
  ChevronRight,
  Activity,
  Sparkles,
} from "lucide-react";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
// import { getDashboardOverview } from "../services/api";

export default function Dashboard({ onNavigate, showToast }) {
  const [data, setData] = useState(null);
  const [timeFilter, setTimeFilter] = useState("today");

  //   useEffect(() => {
  //     async function loadData() {
  //       const overview = await getDashboardOverview();
  //       setData(overview);
  //     }
  //     loadData();
  //   }, []);

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 rounded-full border-2 border-[#08764e] border-t-transparent animate-spin" />
      </div>
    );
  }

  const { metrics, visitorTrends, weeklyConversion, zonePerformance } = data;

  return (
    <div className="space-y-6 animate-fadeIn max-w-6xl">
      {/* Header with Title and Quick Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
            Dashboard Overview
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Store spatial analytics, visitor dwell metrics, and conversion
            performance
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="inline-flex rounded-xl border border-gray-200 bg-white p-1 text-xs font-semibold text-gray-600">
            <button
              onClick={() => setTimeFilter("today")}
              className={`px-3 py-1.5 rounded-lg transition ${
                timeFilter === "today"
                  ? "bg-[#08764e] text-white shadow-xs"
                  : "hover:text-gray-900"
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setTimeFilter("week")}
              className={`px-3 py-1.5 rounded-lg transition ${
                timeFilter === "week"
                  ? "bg-[#08764e] text-white shadow-xs"
                  : "hover:text-gray-900"
              }`}
            >
              This Week
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[#a1c9b3]/60 bg-[#f2f8f4] text-xs font-semibold text-[#08764e]">
            <span className="w-2 h-2 rounded-full bg-[#08764e] animate-pulse" />
            <span>Store Live</span>
          </div>
        </div>
      </div>

      {/* Top 4 Key Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Footfall */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Total Footfall
            </span>
            <div className="w-8 h-8 rounded-full bg-[#e8f5ee] text-[#08764e] flex items-center justify-center">
              <Users size={16} />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-2xl font-bold text-gray-900 tracking-tight">
              {metrics.totalFootfall.value}
            </p>
            <div className="flex items-center gap-1.5 mt-1 text-xs">
              <span className="font-semibold text-[#08764e]">
                {metrics.totalFootfall.change}
              </span>
              <span className="text-gray-400">
                {metrics.totalFootfall.period}
              </span>
            </div>
          </div>
        </div>

        {/* Avg Dwell Time */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Avg Dwell Time
            </span>
            <div className="w-8 h-8 rounded-full bg-[#fef3c7] text-[#d97706] flex items-center justify-center">
              <Clock size={16} />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-2xl font-bold text-gray-900 tracking-tight">
              {metrics.dwellTime.value}
            </p>
            <div className="flex items-center gap-1.5 mt-1 text-xs">
              <span className="font-semibold text-[#d97706]">
                {metrics.dwellTime.subtitle}
              </span>
            </div>
          </div>
        </div>

        {/* Conversion Rate */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Conversion Rate
            </span>
            <div className="w-8 h-8 rounded-full bg-[#e8f5ee] text-[#08764e] flex items-center justify-center">
              <Activity size={16} />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-2xl font-bold text-gray-900 tracking-tight">
              {metrics.conversionRate.value}
            </p>
            <div className="flex items-center gap-1.5 mt-1 text-xs">
              <span className="font-semibold text-[#08764e]">
                {metrics.conversionRate.change}
              </span>
              <span className="text-gray-400">
                {metrics.conversionRate.period}
              </span>
            </div>
          </div>
        </div>

        {/* Lost Opportunity */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Lost Opportunity
            </span>
            <div className="w-8 h-8 rounded-full bg-[#fee2e2] text-[#ef4444] flex items-center justify-center">
              <AlertTriangle size={16} />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-2xl font-bold text-gray-900 tracking-tight">
              {metrics.lostRevenue.value}
            </p>
            <div className="flex items-center gap-1.5 mt-1 text-xs">
              <span className="font-semibold text-[#ef4444]">
                {metrics.lostRevenue.subtitle}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Charts: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Visitor Footfall Trend Chart */}
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-base font-bold text-gray-900">
                Visitor Trend
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Number of visitors throughout the day (9 AM - 8 PM)
              </p>
            </div>
            <span className="text-xs font-semibold text-[#08764e] bg-[#f2f8f4] px-2.5 py-1 rounded-full">
              Peak: 680 at 7 PM
            </span>
          </div>

          <div className="h-68 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={visitorTrends}
                margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#f1f5f9"
                  vertical={false}
                />
                <XAxis
                  dataKey="time"
                  tick={{ fill: "#64748b", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "#64748b", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "12px",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
                    fontSize: "12px",
                  }}
                  formatter={(value) => [`${value} visitors`, "Footfall"]}
                />
                <Line
                  type="monotone"
                  dataKey="visitors"
                  stroke="#08764e"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: "#08764e" }}
                  activeDot={{ r: 5, fill: "#065e3e" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Weekly Conversion Rate Chart */}
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-base font-bold text-gray-900">
                Conversion Rate
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Weekly visitor-to-purchase conversion curve
              </p>
            </div>
            <span className="text-xs font-semibold text-[#08764e] bg-[#f2f8f4] px-2.5 py-1 rounded-full">
              Avg: 28.1%
            </span>
          </div>

          <div className="h-68 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={weeklyConversion}
                margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
              >
                <defs>
                  <linearGradient
                    id="dashboardConversionGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="#08764e" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#08764e" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#f1f5f9"
                  vertical={false}
                />
                <XAxis
                  dataKey="day"
                  tick={{ fill: "#64748b", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 45]}
                  tickFormatter={(v) => `${v}%`}
                  tick={{ fill: "#64748b", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "12px",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
                    fontSize: "12px",
                  }}
                  formatter={(value) => [`${value}%`, "Conversion Rate"]}
                />
                <Area
                  type="monotone"
                  dataKey="conversion"
                  stroke="#08764e"
                  strokeWidth={2.5}
                  fill="url(#dashboardConversionGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Zone Performance Table */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="text-base font-bold text-gray-900">
              In-Store Zone Activity & Conversion
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Correlated CCTV homography tracking with POS register receipts
            </p>
          </div>
          <button
            onClick={() => onNavigate("heatmap")}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#08764e] hover:text-[#065e3e] transition"
          >
            <span>Open Floorplan Heatmap</span>
            <ChevronRight size={14} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#f2f8f4] text-gray-700 font-semibold rounded-lg">
                <th className="py-3 px-4 rounded-l-lg">Zone</th>
                <th className="py-3 px-4">Footfall</th>
                <th className="py-3 px-4">Avg Dwell</th>
                <th className="py-3 px-4">Purchases</th>
                <th className="py-3 px-4">Conversion</th>
                <th className="py-3 px-4 rounded-r-lg">Status & Insight</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {zonePerformance.map((zone) => (
                <tr key={zone.id} className="hover:bg-gray-50/70 transition">
                  <td className="py-3.5 px-4 font-bold text-gray-900 flex items-center gap-2">
                    <MapPin size={15} className="text-[#08764e]" />
                    <span>{zone.name}</span>
                  </td>
                  <td className="py-3.5 px-4 font-medium text-gray-800">
                    {zone.footfall}
                  </td>
                  <td className="py-3.5 px-4 text-gray-600">{zone.avgDwell}</td>
                  <td className="py-3.5 px-4 font-semibold text-gray-900">
                    {zone.purchases}
                  </td>
                  <td className="py-3.5 px-4 font-bold text-[#08764e]">
                    {zone.conversion}
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-block text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${zone.statusColor}`}
                    >
                      {zone.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
