import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { OfflineProvider } from '@/contexts/OfflineContext';
import { DataProvider } from '@/contexts/DataContext';
import Layout from '@/components/Layout';
import Landing from '@/pages/Landing';
import Login from '@/pages/Login';
import Today from '@/pages/Today';
import Steps from '@/pages/Steps';
import Paths from '@/pages/Paths';
import Routines from '@/pages/Routines';
import Pathway from '@/pages/Pathway';
import Settings from '@/pages/Settings';

function AppRoutes() {
  const { isSignedIn, isLoaded } = useUser();
  const location = useLocation();

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-dark">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Unauthenticated routes
  if (!isSignedIn) {
    return (
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login/*" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    );
  }

  // Authenticated routes — wrapped in sync providers
  return (
    <OfflineProvider>
      <DataProvider>
        <Routes>
          <Route path="/login" element={<Navigate to="/" />} />
          <Route path="/" element={<Layout key={location.pathname}><Today /></Layout>} />
          <Route path="/steps" element={<Layout key={location.pathname}><Steps /></Layout>} />
          <Route path="/paths" element={<Layout key={location.pathname}><Paths /></Layout>} />
          <Route path="/routines" element={<Layout key={location.pathname}><Routines /></Layout>} />
          <Route path="/pathway" element={<Layout key={location.pathname}><Pathway /></Layout>} />
          <Route path="/settings" element={<Layout key={location.pathname}><Settings /></Layout>} />
        </Routes>
      </DataProvider>
    </OfflineProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AppRoutes />
      </ThemeProvider>
    </BrowserRouter>
  );
}
