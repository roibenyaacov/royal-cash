export type User = {
  id: string
  email: string
  full_name: string
  avatar_url: string | null
  phone: string | null
  created_at: string
  updated_at: string
}

export type Group = {
  id: string
  name: string
  owner_id: string
  created_at: string
  updated_at: string
}

export type GroupMemberRole = 'owner' | 'manager' | 'member'

export type GroupMember = {
  id: string
  group_id: string
  user_id: string
  role: GroupMemberRole
  created_at: string
}

export type Player = {
  id: string
  group_id: string
  display_name: string
  phone: string | null
  linked_user_id: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export type GameStatus = 'active' | 'closed' | 'archived'
export type ManagementMode = 'host_only' | 'multiple_managers'
export type Currency = 'ILS' | 'USD' | 'EUR'

export type Game = {
  id: string
  group_id: string
  name: string
  date: string
  default_buy_in: number
  currency: Currency
  status: GameStatus
  management_mode: ManagementMode
  created_by: string
  created_at: string
  closed_at: string | null
  finalized_at: string | null
}

export type GamePlayer = {
  id: string
  game_id: string
  player_id: string
  is_manager: boolean
  joined_at: string
}

export type BuyIn = {
  id: string
  game_id: string
  player_id: string
  amount: number
  created_by: string
  created_at: string
  note: string | null
}

export type GameEventType = 'buy_in_added' | 'buy_in_removed' | 'expense_added'

export type GameEvent = {
  id: string
  game_id: string
  event_type: GameEventType
  player_id: string | null
  amount: number | null
  description: string | null
  created_by: string
  created_at: string
}

export type ExpenseSplitType = 'equal_split' | 'custom_split' | 'personal'

export type Expense = {
  id: string
  game_id: string
  paid_by_player_id: string
  amount: number
  description: string
  split_type: ExpenseSplitType
  created_by: string
  created_at: string
}

export type ExpenseParticipant = {
  id: string
  expense_id: string
  player_id: string
  amount_owed: number
}

export type CashOut = {
  id: string
  game_id: string
  player_id: string
  amount: number
  created_by: string
  created_at: string
  updated_at: string
}

export type GameResult = {
  id: string
  game_id: string
  player_id: string
  total_buy_in: number
  cash_out: number
  game_net: number
  expense_credit: number
  expense_debt: number
  final_balance: number
  created_at: string
}

export type Settlement = {
  id: string
  game_id: string
  from_player_id: string
  to_player_id: string
  amount: number
  created_at: string
}

export type PlayerGroupStats = {
  player_id: string
  group_id: string
  games_played: number
  total_balance: number
  biggest_win: number
  biggest_loss: number
  updated_at: string
}

export type GroupWinRecord = {
  id: string
  group_id: string
  player_id: string
  game_id: string
  amount: number
  achieved_at: string
  game?: Pick<Game, 'name' | 'date'>
}

export type PlayerClaimInviteStatus = 'pending' | 'claimed' | 'expired' | 'revoked'

export type PlayerClaimInvite = {
  id: string
  player_id: string
  token: string
  created_by: string
  created_at: string
  expires_at: string
  claimed_by: string | null
  claimed_at: string | null
  status: PlayerClaimInviteStatus
}

export type GroupInviteStatus = 'active' | 'expired' | 'revoked'

export type GroupInvite = {
  id: string
  group_id: string
  token: string
  role: 'manager' | 'member'
  created_by: string
  created_at: string
  expires_at: string | null
  max_uses: number | null
  use_count: number
  status: GroupInviteStatus
}

export type GameAccessLevel = 'view' | 'participate'
export type GameAccessLinkStatus = 'active' | 'expired' | 'revoked'

export type GameAccessLink = {
  id: string
  game_id: string
  token: string
  created_by: string
  created_at: string
  expires_at: string | null
  access_level: GameAccessLevel
  status: GameAccessLinkStatus
}
