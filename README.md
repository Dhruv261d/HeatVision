# HeatVision AI 🎯📊

HeatVision AI is an end-to-end spatial analytics and store intelligence platform. It converts multi-angle CCTV footage and POS transaction data into actionable spatial insights, dynamic footfall heatmaps, and AI-driven layout recommendations.

---

## 🌟 Core Features

- **Multi-Camera Processing:** Ingests and auto-stitches multi-angle CCTV footage using `ffmpeg`.
- **4-Point Calibration Tool:** Interactive homography alignment mapping video frames to a 2D floorplan.
- **Object Detection & Tracking:** Person detection using **YOLOv8** (`class_id == 0`) and trajectory tracking via **ByteTrack**.
- **Spatial Analytics:** Footfall counting, dwell time estimation, and thermal heatmap overlays rendered with **Leaflet.js** and **Heatmap.js**.
- **POS Data Integration:** Correlates spatial movement with cashier transaction records to measure zone conversion rates.
- **AI Recommendations & Alerts:** 
  - **AI Store Layout Optimizer:** Identifies dead zones and underperforming display sections.
  - **Explainable AI Engine:** Provides natural-language reasoning behind store layout suggestions.
  - **Lost Sales Opportunity Detector:** Flags high dwell time zones with zero corresponding purchases.

---

## 🛠️ Tech Stack

- **Frontend:** React.js, Vite, Tailwind CSS, Leaflet.js, Recharts, Socket.io-client
- **Backend Orchestrator:** Node.js, Express.js, Socket.io, Multer
- **AI & CV Microservice:** Python 3.10+, OpenCV, PyTorch, Ultralytics YOLOv8, ByteTrack, Shapely, NumPy
- **Database:** MongoDB Atlas (Mongoose)
- **Media Processing:** `ffmpeg`

---

## 📁 Repository Structure

```text
HeatVision/
├── client/              # React frontend (Vite + Tailwind)
├── server/              # Node.js Express backend
├── cv_service/          # Python Computer Vision & AI scripts
├── data/                # Local sample clips, blueprints, and POS CSVs
├── .env.example         # Template environment variables
└── README.md            # Project documentation
