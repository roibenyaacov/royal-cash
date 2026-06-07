import { create } from 'zustand';
import { Table } from '../types';

interface LobbyState {
  activeTables: Table[];
  deletedTables: Table[];
  isLoading: boolean;
  activeTab: 'active' | 'history';

  // Actions
  setActiveTables: (tables: Table[]) => void;
  setDeletedTables: (tables: Table[]) => void;
  setIsLoading: (loading: boolean) => void;
  setActiveTab: (tab: 'active' | 'history') => void;

  // Table actions
  addTable: (table: Table) => void;
  removeTable: (tableId: string) => void;
  updateTable: (tableId: string, updates: Partial<Table>) => void;

  // Reset
  reset: () => void;
}

export const useLobbyStore = create<LobbyState>((set) => ({
  activeTables: [],
  deletedTables: [],
  isLoading: false,
  activeTab: 'active',

  setActiveTables: (activeTables) => set({ activeTables }),
  setDeletedTables: (deletedTables) => set({ deletedTables }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setActiveTab: (activeTab) => set({ activeTab }),

  addTable: (table) =>
    set((state) => ({
      activeTables: [table, ...state.activeTables],
    })),

  removeTable: (tableId) =>
    set((state) => ({
      activeTables: state.activeTables.filter((t) => t.id !== tableId),
    })),

  updateTable: (tableId, updates) =>
    set((state) => ({
      activeTables: state.activeTables.map((t) =>
        t.id === tableId ? { ...t, ...updates } : t
      ),
    })),

  reset: () => set({
    activeTables: [],
    deletedTables: [],
    isLoading: false,
    activeTab: 'active',
  }),
}));
