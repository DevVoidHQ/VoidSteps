import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { AppLifecycleProvider } from '@/contexts/AppLifecycleContext';
import { DataProvider } from '@/contexts/DataContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import Layout from '@/components/Layout';
import LoadingScreen from '@/components/LoadingScreen';
import { VoidOnboarding } from '@/components/void/VoidOnboarding';
import Steps from '@/pages/Steps';
import Paths from '@/pages/Paths';
import Routines from '@/pages/Routines';
import Reminders from '@/pages/Reminders';
import Analytics from '@/pages/Analytics';
import Calendar from '@/pages/Calendar';
import Settings from '@/pages/Settings';
import Onboarding from '@/pages/Onboarding';
import { useOnboarding } from '@/components/void/useOnboarding';

// Lazy - Notes pulls in BlockNote (~1.4MB). Keeps main bundle lean.
const Notes = lazy(() => import('@/pages/Notes'));

// Default landing: send users to onboarding until it's complete, otherwise
// Today. While we're still deciding (data loading), hold on a loading screen.
function HomeRoute() {
  const { complete } = useOnboarding();
  if (complete === null) return <LoadingScreen />;
  if (complete === false) return <Navigate to="/tutorials" replace />;
  return <Layout><Calendar /></Layout>;
}

function AppRoutes() {
  const location = useLocation();

  return (
    <ErrorBoundary>
      <AppLifecycleProvider>
        <DataProvider>
          <Routes>
            <Route path="/" element={<HomeRoute />} />
            <Route path="/tutorials" element={<Layout key={location.pathname}><Onboarding /></Layout>} />
            <Route path="/steps" element={<Layout key={location.pathname}><Steps /></Layout>} />
            <Route path="/paths" element={<Layout key={location.pathname}><Paths /></Layout>} />
            <Route path="/routines" element={<Layout key={location.pathname}><Routines /></Layout>} />
            <Route path="/reminders" element={<Layout key={location.pathname}><Reminders /></Layout>} />
            <Route
              path="/notes"
              element={
                <Layout key={location.pathname} fullWidth>
                  <Suspense fallback={<LoadingScreen />}>
                    <Notes />
                  </Suspense>
                </Layout>
              }
            />
            <Route path="/pathway" element={<Navigate to="/paths" replace />} />
            <Route path="/analytics" element={<Layout key={location.pathname}><Analytics /></Layout>} />
            <Route path="/settings" element={<Layout key={location.pathname}><Settings /></Layout>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <VoidOnboarding />
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
