// ==========================================
// Royal Cash - TypeScript Types
// ==========================================

export interface Profile {
  id: string;
  username: string;
  email?: string;
  phone_number?: string;
  total_profit?: number;
  games_played?: number;
  created_at: string;
}

export interface Table {
  id: string;
  name: string;
  buy_in: number;
  owner_id: string;
  is_active: boolean;
  is_deleted?: boolean;
  status?: 'active' | 'settling' | 'finished';
  created_at: string;
  playerCount?: number;
}

export interface TablePlayer {
  id: string;
  table_id: string;
  user_id: string;
  rebuys: number;
  food_credit: number;
  food_debt: number;
  cash_out?: number;
  net_profit?: number;
  profiles?: Profile;
  created_at: string;
}

export interface GameResult {
  id: string;
  table_id: string;
  user_id: string;
  net_profit: number;
  game_date: string;
  profiles?: Profile;
}

export interface SettlementResult {
  id: string;
  table_id: string;
  from_player_id: string;
  to_player_id: string;
  amount: number;
  created_at: string;
}

export interface FoodExpense {
  id: string;
  table_id: string;
  payer_id: string;
  total_amount: number;
  split_mode: 'equal' | 'individual';
  consumers: FoodConsumer[];
  created_at: string;
  created_by?: string;
}

export interface FoodConsumer {
  player_id: string;
  amount: number;
  player_name: string;
}

export interface GameLog {
  id: string;
  table_id: string;
  user_id: string;
  action_type: string;
  action_description: string;
  old_value?: string | number | null;
  new_value?: string | number | null;
  created_at: string;
  profiles?: Profile;
}

export interface Transaction {
  from: string;
  fromName: string;
  fromPhone?: string | null;
  to: string;
  toName: string;
  toPhone?: string | null;
  amount: number;
}

export interface PlayerBalance {
  id: string;
  userId: string;
  name: string;
  phone?: string | null;
  cashOut: number;
  buyIn: number;
  gameNet: number;
  expenseCredits: number;
  expenseDebits: number;
  finalBalance: number;
}

export interface SettleResult {
  id: string;
  userId: string;
  name: string;
  phone?: string | null;
  cash_out: number;
  net: number;
}

export interface TableStats {
  [userId: string]: {
    username: string;
    gamesPlayed: number;
    net: number;
  };
}

export interface HallOfFameRecord {
  username: string;
  net_profit: number;
}

// Language type
export type Language = 'he' | 'en';

// View types
export type ViewType = 'loading' | 'auth' | 'lobby' | 'table' | 'settle' | 'stats' | 'summary';

// Auth tab type
export type AuthTab = 'login' | 'signup';

// Lobby tab type
export type LobbyTab = 'active' | 'history';

// Food mode type
export type FoodMode = 'equal' | 'individual';
