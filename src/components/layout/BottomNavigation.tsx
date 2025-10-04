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
    { path: '/transactions', icon: List, label: 'Transactions' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ];

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border shadow-lg px-4 py-2 safe-bottom">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {navItems.map(({ path, icon: Icon, label }) => {
          const isActive = location.pathname === path;

          return (
            <button
              key={path}
              onClick={() => handleNavigation(path)}
              className={`flex flex-col items-center justify-center gap-1 py-2 px-3 rounded-lg transition-all duration-200 ${
                isActive ? 'bg-primary/10' : 'hover:bg-secondary'
              }`}
            >
              <Icon className={`w-5 h-5 ${
                isActive ? 'text-primary' : 'text-foreground/70'
              }`} />
              <span className={`text-xs font-medium ${
                isActive ? 'text-primary' : 'text-foreground/70'
              }`}>
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