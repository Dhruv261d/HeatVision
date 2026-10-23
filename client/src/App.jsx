import React, { useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom";

import AppLayout from "./layouts/AppLayout";
import Dashboard from "./components/pages/Dashboard";
// import LiveProcessingPage from "./pages/LiveProcessingPage";
import HeatmapPage from "./components/pages/HeatmapPage";
import AiInsightsPage from "./components/pages/AIInsightsPage";
import VideoUploader from "./components/pages/VideoUploader";
import PosData from "./components/pages/POSData";
import Reports from "./components/pages/Reports";
import Toast from "./components/common/Toast";

function AppContent() {
  const navigate = useNavigate();
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
  };

  const navigateTo = (pageId) => {
    navigate(pageId === "dashboard" ? "/" : `/${pageId}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const renderPage = (PageComponent) => (
    <PageComponent onNavigate={navigateTo} showToast={showToast} />
  );

  const pageRoutes = [
    {
      path: "/",
      pageId: "dashboard",
      component: Dashboard,
    },
    {
      path: "/live_processing",
      pageId: "live_processing",
      component: VideoUploader,
    },
    {
      path: "/heatmap",
      pageId: "heatmap",
      component: HeatmapPage,
    },
    {
      path: "/ai_insights",
      pageId: "ai_insights",
      component: AiInsightsPage,
    },
    {
      path: "/pos_data",
      pageId: "pos_data",
      component: PosData,
    },
    {
      path: "/reports",
      pageId: "reports",
      component: Reports,
    },
  ];

  const activePage =
    pageRoutes.find((route) => route.path === window.location.pathname)
      ?.pageId ?? "dashboard";

  return (
    <AppLayout activePage={activePage} onNavigate={navigateTo}>
      <Routes>
        {pageRoutes.map(({ path, component: PageComponent }) => (
          <Route key={path} path={path} element={renderPage(PageComponent)} />
        ))}

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </AppLayout>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
