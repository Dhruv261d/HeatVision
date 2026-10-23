/**
 * Mock data for HeatVision Frontend
 * Strictly aligned with Figma UI screenshots and retail analytics pipeline.
 */

export const MOCK_POS_UPLOADS = [
  {
    id: "upload-1",
    fileName: "pos_data_sep.csv",
    uploadedOn: "Sep 29, 2026",
    fileSize: "4.2 MB",
    recordsCount: 1420,
    progress: 100,
    status: "Completed",
  },
  {
    id: "upload-2",
    fileName: "sales_aug.xlsx",
    uploadedOn: "Aug 28, 2026",
    fileSize: "6.8 MB",
    recordsCount: 2310,
    progress: 100,
    status: "Completed",
  },
];

export const MOCK_SAMPLE_POS_RECORDS = [
  {
    id: "TX-1001",
    date: "2026-09-29",
    time: "14:23:10",
    product: "Cotton Casual Shirt",
    category: "Apparel",
    zone: "Zone A",
    quantity: 2,
    price: 1899,
  },
  {
    id: "TX-1002",
    date: "2026-09-29",
    time: "14:35:45",
    product: "Denim Slim Jeans",
    category: "Apparel",
    zone: "Zone A",
    quantity: 1,
    price: 2499,
  },
  {
    id: "TX-1003",
    date: "2026-09-29",
    time: "15:10:22",
    product: "Leather Wallet",
    category: "Accessories",
    zone: "Zone B",
    quantity: 1,
    price: 899,
  },
  {
    id: "TX-1004",
    date: "2026-09-29",
    time: "15:42:01",
    product: "Canvas Sneakers",
    category: "Footwear",
    zone: "Zone C",
    quantity: 1,
    price: 3299,
  },
  {
    id: "TX-1005",
    date: "2026-09-29",
    time: "16:05:18",
    product: "Polarized Sunglasses",
    category: "Accessories",
    zone: "Zone B",
    quantity: 1,
    price: 1450,
  },
  {
    id: "TX-1006",
    date: "2026-09-29",
    time: "16:30:50",
    product: "Silk Blend Scarf",
    category: "Apparel",
    zone: "Zone A",
    quantity: 1,
    price: 799,
  },
];

export const MOCK_AI_INSIGHTS = {
  header: {
    title: "AI Layout Insights",
    subtitle: "Smart recommendations from store activity",
  },
  insights: [
    {
      id: "insight-1",
      type: "Opportunity",
      badgeClass: "purple",
      title: "High traffic, low conversion in Zone A",
      description:
        "Visitors are spending more time in Zone A, but purchases remain below average.",
      impact: "+12% potential conversion",
      icon: "ArrowUpRight",
      iconTheme: "teal",
    },
    {
      id: "insight-2",
      type: "Recommendation",
      badgeClass: "purple",
      title: "Product placement can be improved",
      description:
        "Frequently visited products are positioned away from the highest-traffic area.",
      impact: "Potential revenue increase",
      icon: "Store",
      iconTheme: "purple",
    },
  ],
  lostSales: {
    title: "Lost Sales Opportunities",
    subtitle: "Areas where potential revenue may be lost",
    totalLostValue: "₹26,300",
    zones: [
      {
        id: "lost-zone-a",
        zone: "Zone A",
        priority: "High",
        reason: "High traffic but low purchases",
        value: "₹12,500",
        label: "Lost opportunity",
      },
      {
        id: "lost-zone-c",
        zone: "Zone C",
        priority: "Medium",
        reason: "Customers leave before reaching products",
        value: "₹8,200",
        label: "Lost opportunity",
      },
      {
        id: "lost-zone-b",
        zone: "Zone B",
        priority: "Medium",
        reason: "Long waiting time",
        value: "₹5,600",
        label: "Lost opportunity",
      },
    ],
  },
};

export const MOCK_REPORTS_CONFIG = {
  defaultDateRange: "Sep 22, 2026 - Sep 29, 2026",
  checklist: [
    "Store overview",
    "Visitor trends",
    "Conversion metrics",
    "Top performing zones",
    "Lost sales opportunities",
    "AI recommendations",
  ],
  salesChecklist: [
    "Total revenue breakdown",
    "Basket size & transaction value",
    "Zone-wise sales attribution",
    "Product category performance",
    "Peak sales hours vs footfall",
    "Staff efficiency at checkout",
  ],
};

export const MOCK_DASHBOARD_METRICS = {
  totalFootfall: {
    value: "1,248",
    change: "+12.4%",
    period: "today",
    positive: true,
  },
  dwellTime: {
    value: "4.2 min",
    subtitle: "Aisle A peak",
    change: "+0.6 min",
    positive: true,
  },
  conversionRate: {
    value: "24.8%",
    change: "+3.2%",
    period: "vs yesterday",
    positive: true,
  },
  lostRevenue: {
    value: "₹26,300",
    subtitle: "3 high-dwell zones",
    change: "Opportunity",
    positive: false,
  },
  activeCameras: "4 / 4",
  systemStatus: "Live Tracking Active",
};

export const MOCK_VISITOR_TRENDS = [
  { time: "9 AM", visitors: 120, conversion: 18 },
  { time: "10 AM", visitors: 180, conversion: 22 },
  { time: "11 AM", visitors: 260, conversion: 25 },
  { time: "12 PM", visitors: 340, conversion: 29 },
  { time: "1 PM", visitors: 410, conversion: 28 },
  { time: "2 PM", visitors: 370, conversion: 26 },
  { time: "3 PM", visitors: 450, conversion: 31 },
  { time: "4 PM", visitors: 520, conversion: 35 },
  { time: "5 PM", visitors: 610, conversion: 38 },
  { time: "6 PM", visitors: 570, conversion: 34 },
  { time: "7 PM", visitors: 680, conversion: 40 },
  { time: "8 PM", visitors: 620, conversion: 32 },
];

export const MOCK_WEEKLY_CONVERSION = [
  { day: "Mon", conversion: 22, footfall: 1120 },
  { day: "Tue", conversion: 25, footfall: 1190 },
  { day: "Wed", conversion: 24, footfall: 1150 },
  { day: "Thu", conversion: 28, footfall: 1280 },
  { day: "Fri", conversion: 31, footfall: 1450 },
  { day: "Sat", conversion: 35, footfall: 1890 },
  { day: "Sun", conversion: 32, footfall: 1720 },
];

export const MOCK_ZONE_PERFORMANCE = [
  {
    id: "zone-a",
    name: "Zone A — Left Shelves",
    footfall: 512,
    avgDwell: "5.4 min",
    purchases: 62,
    conversion: "12.1%",
    status: "High Traffic / Low Conv",
    statusColor: "text-amber-700 bg-amber-50 border-amber-200",
  },
  {
    id: "zone-b",
    name: "Zone B — Display / Checkout",
    footfall: 489,
    avgDwell: "3.1 min",
    purchases: 184,
    conversion: "37.6%",
    status: "Optimal Flow",
    statusColor: "text-[#08764e] bg-[#f2f8f4] border-[#a1c9b3]",
  },
  {
    id: "zone-c",
    name: "Zone C — Back Wall Shelves",
    footfall: 310,
    avgDwell: "2.2 min",
    purchases: 45,
    conversion: "14.5%",
    status: "Bottleneck Detected",
    statusColor: "text-amber-700 bg-amber-50 border-amber-200",
  },
  {
    id: "zone-d",
    name: "Zone D — Main Entrance",
    footfall: 1248,
    avgDwell: "0.8 min",
    purchases: 0,
    conversion: "—",
    status: "Transit Zone",
    statusColor: "text-slate-600 bg-slate-50 border-slate-200",
  },
];

export const MOCK_LIVE_PROCESSING = {
  activeJob: {
    id: "JOB-2026-0929",
    videoName: "cctv_batch_04.mp4",
    status: "Processing",
    fps: 28.4,
    resolution: "1920x1080",
    currentFrame: 1420,
    totalFrames: 1800,
    progress: 78.8,
    detectedPersons: 7,
    homographyStatus: "Calibrated (4 Points)",
    tracker: "ByteTrack + YOLOv11",
    pipelineLatencyMs: 34,
  },
  recentBatches: [
    {
      id: "BATCH-003",
      name: "cctv_evening_rush.mp4",
      date: "Sep 29, 2026 18:30",
      duration: "15m 00s",
      personsCount: 680,
      status: "Completed",
    },
    {
      id: "BATCH-002",
      name: "cctv_afternoon_02.mp4",
      date: "Sep 29, 2026 14:00",
      duration: "15m 00s",
      personsCount: 410,
      status: "Completed",
    },
    {
      id: "BATCH-001",
      name: "cctv_morning_open.mp4",
      date: "Sep 29, 2026 09:15",
      duration: "15m 00s",
      personsCount: 180,
      status: "Completed",
    },
  ],
};
