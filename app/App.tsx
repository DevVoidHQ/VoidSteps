import { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ToastProvider } from "@/contexts/ToastContext";
import { AppLifecycleProvider } from "@/contexts/AppLifecycleContext";
import { DataProvider } from "@/contexts/DataContext";
import { LensProvider } from "@/contexts/LensContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Layout from "@/components/Layout";
import { useEscapeFullscreenGuard } from "@/hooks/useEscapeFullscreenGuard";
import LoadingScreen from "@/components/LoadingScreen";
import Steps from "@/pages/Steps";
const Paths = lazy(() => import("@/pages/Paths"));
import Routines from "@/pages/Routines";
import Reminders from "@/pages/Reminders";
const Analytics = lazy(() => import("@/pages/Analytics"));
import Calendar from "@/pages/Calendar";
const Settings = lazy(() => import("@/pages/Settings"));
const Lenses = lazy(() => import("@/pages/Lenses"));

function AppRoutes() {
  useEscapeFullscreenGuard();
  const location = useLocation();
  // Today reads as a list; the month grid and day log need room. The view
  // lives in the URL, falling back to the one Calendar last persisted.
  const todayView =
    new URLSearchParams(location.search).get("view") ??
    localStorage.getItem("voidsteps-today-view") ??
    "today";

  return (
    <ErrorBoundary>
      <AppLifecycleProvider>
        <DataProvider>
          <LensProvider>
            <Suspense fallback={<LoadingScreen />}>
              <Routes>
                <Route
                  path="/"
                  element={
                    <Layout width={todayView === "today" ? "reading" : "wide"}>
                      <Calendar />
                    </Layout>
                  }
                />
                <Route
                  path="/steps"
                  element={
                    <Layout key={location.pathname}>
                      <Steps />
                    </Layout>
                  }
                />
                <Route
                  path="/paths"
                  element={
                    <Layout key={location.pathname} width="wide">
                      <Paths />
                    </Layout>
                  }
                />
                <Route
                  path="/routines"
                  element={
                    <Layout key={location.pathname}>
                      <Routines />
                    </Layout>
                  }
                />
                <Route
                  path="/reminders"
                  element={
                    <Layout key={location.pathname}>
                      <Reminders />
                    </Layout>
                  }
                />
                {/* Notes were removed; their data is exported from Settings > Data. */}
                <Route path="/notes" element={<Navigate to="/settings?tab=data" replace />} />
                <Route path="/pathway" element={<Navigate to="/paths" replace />} />
                <Route
                  path="/analytics"
                  element={
                    <Layout key={location.pathname} width="wide">
                      <Analytics />
                    </Layout>
                  }
                />
                <Route
                  path="/lenses"
                  element={
                    <Layout key={location.pathname}>
                      <Lenses />
                    </Layout>
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <Layout key={location.pathname}>
                      <Settings />
                    </Layout>
                  }
                />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </LensProvider>
        </DataProvider>
      </AppLifecycleProvider>
    </ErrorBoundary>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <ToastProvider>
          <AppRoutes />
        </ToastProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
