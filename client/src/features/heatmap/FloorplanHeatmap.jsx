import { useState } from "react";
import "./FloorplanHeatmap.css";

const ZONE_DATA = [
  {
    id: "zone-a",
    tag: "Zone A",
    name: "Entrance & Foyer",
    type: "Pass-through",
    visitors: 482,
    avgDwell: "2.1 min",
    conversion: "92% entry",
    dotColor: "var(--zone-a)",
  },
  {
    id: "zone-b",
    tag: "Zone B",
    name: "Billing & POS Counter",
    type: "Checkout",
    visitors: 310,
    avgDwell: "5.4 min",
    conversion: "68% purchase",
    dotColor: "var(--zone-b)",
  },
  {
    id: "zone-c",
    tag: "Zone C",
    name: "Produce & Snacks",
    type: "Promotional",
    visitors: 418,
    avgDwell: "8.2 min",
    conversion: "44% basket",
    dotColor: "var(--zone-c)",
  },
  {
    id: "zone-d",
    tag: "Zone D",
    name: "Hardware & Accessories",
    type: "Browse",
    visitors: 240,
    avgDwell: "4.0 min",
    conversion: "31% engage",
    dotColor: "var(--zone-d)",
  },
];

export default function FloorplanHeatmap() {
  const [selectedFloor, setSelectedFloor] = useState("ground");
  const [timeRange, setTimeRange] = useState("today");

  return (
    <div className="fhm">
      {/* Top Header */}
      <header className="fhm-head">
        <div>
          <h1 className="fhm-title">Store Floorplan Heatmap</h1>
          <p className="fhm-subtitle">
            CCTV footfall density analysis and zone dwell performance
          </p>
        </div>

        <div className="fhm-controls">
          <select
            className="fhm-select"
            value={selectedFloor}
            onChange={(e) => setSelectedFloor(e.target.value)}
            aria-label="Select Floor"
          >
            <option value="ground">Ground Floor - Main Store</option>
            <option value="mezzanine">Mezzanine - Electronics</option>
          </select>

          <select
            className="fhm-select"
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            aria-label="Select Time Range"
          >
            <option value="today">Today (Peak Hours)</option>
            <option value="yesterday">Yesterday</option>
            <option value="week">Past 7 Days</option>
          </select>
        </div>
      </header>

      {/* Main Grid */}
      <div className="fhm-grid">
        {/* Visual Picture Card */}
        <section className="fhm-visual-card" aria-label="Floorplan Heatmap Visual">
          <div className="fhm-img-wrapper">
            <img
              src="/floorplan-heatmap.png"
              alt="Store Floorplan Heatmap"
              onError={(e) => {
                // Fallback to sample-blueprint if needed
                if (!e.currentTarget.src.includes("sample_blueprint")) {
                  e.currentTarget.src = "/sample_blueprint 2.png";
                }
              }}
            />
          </div>

          <div className="fhm-legend">
            <div className="fhm-legend-header">
              <span>Low Footfall</span>
              <span>Medium Density</span>
              <span>High Footfall</span>
            </div>
            <div className="fhm-legend-bar" />
          </div>
        </section>

        {/* Zone Performance Card */}
        <section className="fhm-perf-card" aria-label="Zone Performance Metrics">
          <div className="fhm-card-header">
            <h3>Zone Performance</h3>
            <span className="fhm-tag">Live Analytics</span>
          </div>

          <ul className="fhm-zone-list">
            {ZONE_DATA.map((z) => (
              <li key={z.id} className="fhm-zone-row">
                <div className="fhm-zone-left">
                  <span
                    className="fhm-zone-dot"
                    style={{ backgroundColor: z.dotColor }}
                  />
                  <div>
                    <div className="fhm-zone-title">{z.tag}: {z.name}</div>
                    <div className="fhm-zone-subtitle">{z.type}</div>
                  </div>
                </div>

                <div className="fhm-zone-right">
                  <div>
                    <div className="fhm-stat-num">{z.visitors}</div>
                    <div className="fhm-stat-label">visitors</div>
                  </div>
                  <div>
                    <div className="fhm-stat-num">{z.avgDwell}</div>
                    <div className="fhm-stat-label">avg dwell</div>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <div className="fhm-summary-banner">
            <span>Overall Shopper Conversion</span>
            <strong>+18.4% vs last week</strong>
          </div>
        </section>
      </div>
    </div>
  );
}
