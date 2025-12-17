import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut, Settings } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-bg-dark">
      <div className="absolute top-4 right-4 flex space-x-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(location.pathname === '/settings' ? '/' : '/settings')}
          className="text-muted-foreground hover:text-foreground"
        >
          <Settings className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={logout} className="text-muted-foreground hover:text-foreground">
          <LogOut className="w-4 h-4" />
        </Button>
      </div>
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {children}
      </main>
    </div>
  );
}
