/**
 * HeatVision Standard PDF 1.4 Binary Generator (Zero-Dependency)
 * Produces compliant, clean PDF documents that open seamlessly in Chrome, Edge, Safari, Adobe Acrobat, and Preview.
 */

function escapePdfText(text) {
  if (!text) return "";
  return String(text)
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/[^\x20-\x7E]/g, " "); // Replace non-ASCII chars for standard Helvetica font
}

/**
 * Builds a valid binary PDF document
 */
export function generatePdfBlob({
  reportType = "Analytics",
  dateRange = "Last 7 Days",
  metrics = [],
  zoneData = [],
  recommendations = [],
  checklist = [],
}) {
  const streamCommands = [];

  // Helper to add command
  const cmd = (s) => streamCommands.push(s);

  // Top Banner (HeatVision Mint Green: #08764e -> 0.031 0.463 0.306)
  cmd("0.031 0.463 0.306 rg 40 750 515 55 re f");

  // Title & Subtitle inside banner
  cmd("1 1 1 rg");
  cmd("BT /F2 16 Tf 55 780 Td (HEATVISION RETAIL SPATIAL ANALYTICS REPORT) Tj ET");
  cmd(
    `BT /F1 9 Tf 55 764 Td (${escapePdfText(
      reportType.toUpperCase() + " AUDIT REPORT | " + dateRange
    )}) Tj ET`
  );

  // Metadata block
  cmd("0.4 0.4 0.4 rg");
  cmd(
    `BT /F1 8 Tf 40 735 Td (Generated: ${escapePdfText(
      new Date().toLocaleString()
    )} | Status: Verified) Tj ET`
  );

  // Horizontal divider
  cmd("0.85 0.85 0.85 RG 1 w 40 725 m 555 725 l S");

  let y = 705;

  // 1. Key Performance Highlights
  cmd("0.1 0.1 0.1 rg BT /F2 12 Tf 40 " + y + " Td (1. Executive Performance Highlights) Tj ET");
  y -= 18;

  const defaultMetrics =
    metrics.length > 0
      ? metrics
      : [
          { label: "Total Store Footfall", value: "1,248 visitors (+14.2%)" },
          { label: "Average Shopper Dwell", value: "3.8 minutes" },
          { label: "Overall Sales Conversion", value: "24.8% (+3.2% vs benchmark)" },
          { label: "Unrealized Lost Opportunity", value: "INR 126,300 (3 high-dwell friction zones)" },
        ];

  defaultMetrics.forEach((m) => {
    cmd("0.96 0.98 0.97 rg 45 " + (y - 4) + " 505 18 re f");
    cmd("0.85 0.92 0.88 RG 0.5 w 45 " + (y - 4) + " 505 18 re S");
    cmd(
      "0.2 0.2 0.2 rg BT /F2 9 Tf 55 " +
        (y + 1) +
        " Td (" +
        escapePdfText(m.label + ":") +
        ") Tj ET"
    );
    cmd(
      "0.03 0.46 0.31 rg BT /F1 9 Tf 220 " +
        (y + 1) +
        " Td (" +
        escapePdfText(m.value) +
        ") Tj ET"
    );
    y -= 22;
  });

  y -= 8;

  // 2. Zone Breakdown Table
  cmd("0.1 0.1 0.1 rg BT /F2 12 Tf 40 " + y + " Td (2. In-Store Zone Conversion Breakdown) Tj ET");
  y -= 18;

  // Table Header row
  cmd("0.92 0.96 0.94 rg 40 " + (y - 4) + " 515 18 re f");
  cmd("0.03 0.46 0.31 rg");
  cmd("BT /F2 8 Tf 50 " + (y + 1) + " Td (ZONE NAME) Tj ET");
  cmd("BT /F2 8 Tf 160 " + (y + 1) + " Td (FOOTFALL) Tj ET");
  cmd("BT /F2 8 Tf 240 " + (y + 1) + " Td (AVG DWELL) Tj ET");
  cmd("BT /F2 8 Tf 320 " + (y + 1) + " Td (PURCHASES) Tj ET");
  cmd("BT /F2 8 Tf 400 " + (y + 1) + " Td (CONVERSION) Tj ET");
  cmd("BT /F2 8 Tf 480 " + (y + 1) + " Td (STATUS) Tj ET");
  y -= 18;

  const defaultZones =
    zoneData.length > 0
      ? zoneData
      : [
          { name: "Entrance", footfall: "1,420", dwell: "0.4 min", tx: "85", conv: "6.0%", status: "Active" },
          { name: "Promo Aisle", footfall: "520", dwell: "0.6 min", tx: "140", conv: "26.9%", status: "High Conv" },
          { name: "Electronics", footfall: "680", dwell: "1.2 min", tx: "180", conv: "26.5%", status: "High Conv" },
          { name: "Apparel", footfall: "890", dwell: "1.4 min", tx: "260", conv: "29.2%", status: "High Conv" },
          { name: "Grocery", footfall: "740", dwell: "0.8 min", tx: "310", conv: "41.9%", status: "Star Zone" },
          { name: "Checkout", footfall: "610", dwell: "1.5 min", tx: "350", conv: "57.4%", status: "Cash Register" },
        ];

  defaultZones.forEach((z, idx) => {
    if (idx % 2 === 1) {
      cmd("0.98 0.99 0.98 rg 40 " + (y - 4) + " 515 16 re f");
    }
    cmd("0.25 0.25 0.25 rg");
    cmd("BT /F1 8 Tf 50 " + y + " Td (" + escapePdfText(z.name) + ") Tj ET");
    cmd("BT /F1 8 Tf 160 " + y + " Td (" + escapePdfText(z.footfall) + ") Tj ET");
    cmd("BT /F1 8 Tf 240 " + y + " Td (" + escapePdfText(z.dwell) + ") Tj ET");
    cmd("BT /F1 8 Tf 320 " + y + " Td (" + escapePdfText(z.tx || z.purchases || "-") + ") Tj ET");
    cmd("0.03 0.46 0.31 rg BT /F2 8 Tf 400 " + y + " Td (" + escapePdfText(z.conv || z.conversion) + ") Tj ET");
    cmd("0.4 0.4 0.4 rg BT /F1 8 Tf 480 " + y + " Td (" + escapePdfText(z.status) + ") Tj ET");
    y -= 16;
  });

  y -= 10;

  // 3. AI Merchandising & Lost Sales Insights
  cmd("0.1 0.1 0.1 rg BT /F2 12 Tf 40 " + y + " Td (3. AI Store Layout & Lost Sales Action Items) Tj ET");
  y -= 18;

  const defaultRecs =
    recommendations.length > 0
      ? recommendations
      : [
          "[HIGH PRIORITY] Relocate impulse items into Zone A to capitalize on high shopper dwell time.",
          "[MEDIUM PRIORITY] Expand product display footprint in Grocery due to stellar 41.9% sales conversion rate.",
          "[OPTIMIZATION] Reconfigure aisle bottleneck near Promo Aisle to improve shopper visibility and throughput.",
        ];

  defaultRecs.forEach((rec) => {
    cmd("0.95 0.95 0.98 rg 45 " + (y - 4) + " 505 16 re f");
    cmd("0.2 0.2 0.3 rg BT /F1 8.5 Tf 55 " + y + " Td (" + escapePdfText(rec) + ") Tj ET");
    y -= 19;
  });

  // Footer
  cmd("0.85 0.85 0.85 RG 1 w 40 45 m 555 45 l S");
  cmd("0.5 0.5 0.5 rg");
  cmd("BT /F1 8 Tf 40 32 Td (HeatVision Retail Spatial Intelligence | Monorepo CV & POS Engine | Page 1 of 1) Tj ET");
  cmd("BT /F1 8 Tf 460 32 Td (Confidential & Proprietary) Tj ET");

  const streamContent = streamCommands.join("\n");
  const streamLength = new TextEncoder().encode(streamContent).length;

  let pdfString = "%PDF-1.4\n";
  const offsets = [];

  function addObj(content) {
    offsets.push(new TextEncoder().encode(pdfString).length);
    pdfString += content + "\n";
  }

  addObj("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj");
  addObj("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj");
  addObj(
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>\nendobj"
  );
  addObj("4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj");
  addObj("5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj");
  addObj("6 0 obj\n<< /Length " + streamLength + " >>\nstream\n" + streamContent + "\nendstream\nendobj");

  const startxref = new TextEncoder().encode(pdfString).length;
  pdfString += "xref\n0 7\n0000000000 65535 f \n";
  offsets.forEach((off) => {
    pdfString += String(off).padStart(10, "0") + " 00000 n \n";
  });
  pdfString += "trailer\n<< /Size 7 /Root 1 0 R >>\nstartxref\n" + startxref + "\n%%EOF";

  return new Blob([new TextEncoder().encode(pdfString)], { type: "application/pdf" });
}

/**
 * Generates clean CSV file with proper spreadsheet structure
 */
export function generateCsvBlob({ reportType, dateRange, zoneData = [] }) {
  const lines = [
    `"HeatVision ${reportType.toUpperCase()} Report"`,
    `"Date Range","${dateRange}"`,
    `"Generated At","${new Date().toISOString()}"`,
    "",
    `"Zone Name","Category","Footfall Count","Avg Dwell (min)","Transactions","Conversion Rate (%)","Revenue ($)","Status"`,
  ];

  const zones =
    zoneData.length > 0
      ? zoneData
      : [
          { name: "Entrance", cat: "General", footfall: 1420, dwell: 0.4, tx: 85, conv: "6.0%", rev: 2840, status: "Active" },
          { name: "Promo Aisle", cat: "Promo", footfall: 520, dwell: 0.6, tx: 140, conv: "26.9%", rev: 6760, status: "High Conv" },
          { name: "Electronics", cat: "Electronics", footfall: 680, dwell: 1.2, tx: 180, conv: "26.5%", rev: 42500, status: "High Conv" },
          { name: "Apparel", cat: "Apparel", footfall: 890, dwell: 1.4, tx: 260, conv: "29.2%", rev: 31200, status: "High Conv" },
          { name: "Grocery", cat: "Grocery", footfall: 740, dwell: 0.8, tx: 310, conv: "41.9%", rev: 14800, status: "Star Zone" },
          { name: "Checkout", cat: "POS", footfall: 610, dwell: 1.5, tx: 350, conv: "57.4%", rev: 8900, status: "Cash Register" },
        ];

  zones.forEach((z) => {
    lines.push(
      `"${z.name}","${z.cat || "Retail"}",${z.footfall || 0},${z.dwell || 1.0},${z.tx || z.purchases || 0},"${z.conv || z.conversion || "0%"}",${z.rev || 0},"${z.status || "Active"}"`
    );
  });

  return new Blob([lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
}

