import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { OfflineProvider } from '@/contexts/OfflineContext';
import { DataProvider } from '@/contexts/DataContext';
import Layout from '@/components/Layout';
import LoadingScreen from '@/components/LoadingScreen';
import Landing from '@/pages/Landing';
import Login from '@/pages/Login';
import Today from '@/pages/Today';
import Steps from '@/pages/Steps';
import Paths from '@/pages/Paths';
import Routines from '@/pages/Routines';
import Pathway from '@/pages/Pathway';
import Settings from '@/pages/Settings';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return user ? <>{children}</> : <Navigate to="/login" />;
}

function AppRoutes() {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to="/" /> : <Login />}
      />
      <Route
        path="/"
        element={
          user ? (
            <Layout key={location.pathname}>
              <Today />
            </Layout>
          ) : (
            <Landing />
          )
        }
      />
      <Route
        path="/steps"
        element={
          <PrivateRoute>
            <Layout key={location.pathname}>
              <Steps />
            </Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/paths"
        element={
          <PrivateRoute>
            <Layout key={location.pathname}>
              <Paths />
            </Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/routines"
        element={
          <PrivateRoute>
            <Layout key={location.pathname}>
              <Routines />
            </Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/pathway"
        element={
          <PrivateRoute>
            <Layout key={location.pathname}>
              <Pathway />
            </Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <PrivateRoute>
            <Layout key={location.pathname}>
              <Settings />
            </Layout>
          </PrivateRoute>
        }
      />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <OfflineProvider>
            <DataProvider>
              <AppRoutes />
            </DataProvider>
          </OfflineProvider>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
