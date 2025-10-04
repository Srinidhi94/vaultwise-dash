import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus, LucideIcon } from 'lucide-react';

interface FloatingActionButtonProps {
  onClick: () => void;
  icon?: LucideIcon;
  ariaLabel: string;
  className?: string;
}

export const FloatingActionButton = ({
  onClick,
  icon: Icon = Plus,
  ariaLabel,
  className = '',
}: FloatingActionButtonProps) => {
  return (
    <Button
      onClick={onClick}
      aria-label={ariaLabel}
      className={`
        fixed bottom-20 right-4 z-40
        w-14 h-14 rounded-full
        bg-gradient-primary text-white
        shadow-lg shadow-primary/30
        hover:scale-110 active:scale-95
        transition-transform duration-200
        ${className}
      `}
      size="icon"
    >
      <Icon className="w-6 h-6" />
    </Button>
  );
};
