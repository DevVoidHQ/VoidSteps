import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { OfflineProvider } from '@/contexts/OfflineContext';
import { DataProvider } from '@/contexts/DataContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import Layout from '@/components/Layout';
import LoadingScreen from '@/components/LoadingScreen';
import { VoidOnboarding } from '@/components/void/VoidOnboarding';
import Login from '@/pages/Login';
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

// Lazy + isolated - admin is online-only and must NOT load the sync/offline
// stack. Code-split so it stays out of the main bundle, and excluded from the
// SW precache via the Admin-*.js globIgnores + /admin navigateFallback denylist
// in vite.config.
const Admin = lazy(() => import('@/pages/Admin'));

// Default landing: send users to onboarding until it's complete, otherwise
// Today. While we're still deciding (data loading), hold on a loading screen.
function HomeRoute() {
  const { complete } = useOnboarding();
  if (complete === null) return <LoadingScreen />;
  if (complete === false) return <Navigate to="/tutorials" replace />;
  return <Layout><Calendar /></Layout>;
}

function AppRoutes() {
  const { isSignedIn, isLoaded } = useUser();
  const location = useLocation();

  if (!isLoaded) {
    return <LoadingScreen />;
  }

  // Unauthenticated routes
  if (!isSignedIn) {
    return (
      <Routes>
        <Route path="/login/*" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  // Authenticated routes. /admin is handled FIRST and standalone, it must not
  // mount OfflineProvider/DataProvider (no sync, no local DB, online-only).
  return (
    <ErrorBoundary>
      <Routes>
        <Route
          path="/admin"
          element={
            <Suspense fallback={<LoadingScreen />}>
              <Admin />
            </Suspense>
          }
        />
        <Route path="*" element={<AuthedApp location={location} />} />
      </Routes>
    </ErrorBoundary>
  );
}

function AuthedApp({ location }: { location: ReturnType<typeof useLocation> }) {
  return (
    <ErrorBoundary>
      <OfflineProvider>
        <DataProvider>
          <Routes>
            <Route path="/login" element={<Navigate to="/" />} />
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
          </Routes>
          <VoidOnboarding />
        </DataProvider>
      </OfflineProvider>
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
