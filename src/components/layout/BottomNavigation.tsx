import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Wallet, Plus, List, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';

const BottomNavigation = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { path: '/', icon: Home, label: 'Dashboard' },
    { path: '/accounts', icon: Wallet, label: 'Accounts' },
    { path: '/add-transaction', icon: Plus, label: 'Add', special: true },
    { path: '/transactions', icon: List, label: 'Transactions' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ];

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-border/50 px-4 py-2 safe-bottom">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {navItems.map(({ path, icon: Icon, label, special }) => {
          const isActive = location.pathname === path;
          
          if (special) {
            return (
              <Button
                key={path}
                onClick={() => handleNavigation(path)}
                className="bg-gradient-primary w-12 h-12 rounded-full shadow-lg shadow-primary/30 hover:scale-110 transition-transform"
                size="icon"
              >
                <Icon className="w-6 h-6 text-white" />
              </Button>
            );
          }

          return (
            <button
              key={path}
              onClick={() => handleNavigation(path)}
              className={`mobile-nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
              <span className={`text-xs ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default BottomNavigation;