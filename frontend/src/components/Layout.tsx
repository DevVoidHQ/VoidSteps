import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { CheckSquare, Target, LogOut } from 'lucide-react';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-bg-dark">
      <nav className="border-b border-border bg-card">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-8">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary-dark bg-clip-text text-transparent">
                DevVoid Tracker
              </h1>
              <div className="flex space-x-2">
                <Link to="/">
                  <Button
                    variant={isActive('/') ? 'default' : 'ghost'}
                    className="flex items-center space-x-2"
                  >
                    <CheckSquare className="w-4 h-4" />
                    <span>Tasks</span>
                  </Button>
                </Link>
                <Link to="/goals">
                  <Button
                    variant={isActive('/goals') ? 'default' : 'ghost'}
                    className="flex items-center space-x-2"
                  >
                    <Target className="w-4 h-4" />
                    <span>Goals</span>
                  </Button>
                </Link>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-muted-foreground">{user?.email}</span>
              <Button variant="outline" size="sm" onClick={logout}>
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </nav>
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}
