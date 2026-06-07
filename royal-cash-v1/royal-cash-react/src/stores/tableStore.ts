import { create } from 'zustand';
import { Table, TablePlayer, GameLog, SettleResult } from '../types';

interface TableState {
  // Active table data
  activeTable: Table | null;
  players: TablePlayer[];
  gameLogs: GameLog[];
  isLoading: boolean;

  // Settlement data
  settlementResults: SettleResult[];

  // UI state
  lastInteractionTime: number;
  sortPaused: boolean;

  // Actions
  setActiveTable: (table: Table | null) => void;
  setPlayers: (players: TablePlayer[]) => void;
  setGameLogs: (logs: GameLog[]) => void;
  setIsLoading: (loading: boolean) => void;
  setSettlementResults: (results: SettleResult[]) => void;

  // Player actions
  updatePlayer: (playerId: string, updates: Partial<TablePlayer>) => void;
  removePlayer: (playerId: string) => void;
  addPlayer: (player: TablePlayer) => void;

  // Sort control
  setLastInteractionTime: (time: number) => void;
  setSortPaused: (paused: boolean) => void;

  // Calculate pot
  getPot: () => number;

  // Reset
  reset: () => void;
}

export const useTableStore = create<TableState>((set, get) => ({
  activeTable: null,
  players: [],
  gameLogs: [],
  isLoading: false,
  settlementResults: [],
  lastInteractionTime: 0,
  sortPaused: false,

  setActiveTable: (activeTable) => set({ activeTable }),
  setPlayers: (players) => set({ players }),
  setGameLogs: (gameLogs) => set({ gameLogs }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setSettlementResults: (settlementResults) => set({ settlementResults }),

  updatePlayer: (playerId, updates) =>
    set((state) => ({
      players: state.players.map((p) =>
        p.id === playerId ? { ...p, ...updates } : p
      ),
    })),

  removePlayer: (playerId) =>
    set((state) => ({
      players: state.players.filter((p) => p.id !== playerId),
    })),

  addPlayer: (player) =>
    set((state) => ({
      players: [...state.players, player],
    })),

  setLastInteractionTime: (lastInteractionTime) => set({ lastInteractionTime }),
  setSortPaused: (sortPaused) => set({ sortPaused }),

  getPot: () => {
    const { players, activeTable } = get();
    if (!activeTable) return 0;
    return players.reduce((sum, p) => sum + (p.rebuys || 1) * activeTable.buy_in, 0);
  },

  reset: () => set({
    activeTable: null,
    players: [],
    gameLogs: [],
    isLoading: false,
    settlementResults: [],
    lastInteractionTime: 0,
    sortPaused: false,
  }),
}));
