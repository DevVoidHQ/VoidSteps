import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { OfflineProvider } from '@/contexts/OfflineContext';
import { DataProvider } from '@/contexts/DataContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import Layout from '@/components/Layout';
import LoadingScreen from '@/components/LoadingScreen';
import Login from '@/pages/Login';
import Steps from '@/pages/Steps';
import Paths from '@/pages/Paths';
import Routines from '@/pages/Routines';
import Pathway from '@/pages/Pathway';
import Analytics from '@/pages/Analytics';
import Calendar from '@/pages/Calendar';
import Settings from '@/pages/Settings';

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

  // Authenticated routes — wrapped in sync providers
  return (
    <ErrorBoundary>
      <OfflineProvider>
        <DataProvider>
          <Routes>
            <Route path="/login" element={<Navigate to="/" />} />
            <Route path="/" element={<Layout key={location.pathname}><Calendar /></Layout>} />
            <Route path="/steps" element={<Layout key={location.pathname}><Steps /></Layout>} />
            <Route path="/paths" element={<Layout key={location.pathname}><Paths /></Layout>} />
            <Route path="/routines" element={<Layout key={location.pathname}><Routines /></Layout>} />
            <Route path="/pathway" element={<Layout key={location.pathname}><Pathway /></Layout>} />
            <Route path="/analytics" element={<Layout key={location.pathname}><Analytics /></Layout>} />
            <Route path="/settings" element={<Layout key={location.pathname}><Settings /></Layout>} />
          </Routes>
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
