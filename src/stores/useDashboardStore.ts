import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { startOfMonth, endOfMonth } from 'date-fns';

interface DashboardState {
  dateRange: {
    start: Date;
    end: Date;
  };
  selectedAccountId: string;
  setDateRange: (range: { start: Date; end: Date }) => void;
  setSelectedAccountId: (id: string) => void;
}

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set) => ({
      dateRange: {
        start: startOfMonth(new Date()),
        end: endOfMonth(new Date()),
      },
      selectedAccountId: 'all',
      setDateRange: (range) => set({ dateRange: range }),
      setSelectedAccountId: (id) => set({ selectedAccountId: id }),
    }),
    {
      name: 'dashboard-storage',
      storage: {
        getItem: (name) => {
          const str = sessionStorage.getItem(name);
          if (!str) return null;
          const { state } = JSON.parse(str);
          return {
            state: {
              ...state,
              dateRange: {
                start: new Date(state.dateRange.start),
                end: new Date(state.dateRange.end),
              },
            },
          };
        },
        setItem: (name, value) => {
          sessionStorage.setItem(name, JSON.stringify(value));
        },
        removeItem: (name) => {
          sessionStorage.removeItem(name);
        },
      },
    }
  )
);
