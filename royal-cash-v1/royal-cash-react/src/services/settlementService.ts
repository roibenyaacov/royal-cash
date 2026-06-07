// ==========================================
// Royal Cash - Settlement Service
// ==========================================
// Logic copied AS-IS from original HTML file
// ==========================================

import { supabase, isValidUUID } from '../config/supabase';
import { TablePlayer, Transaction, PlayerBalance, GameResult } from '../types';

/**
 * Save game results and settlement
 * Copied from original saveAndExit() function
 */
export async function saveSettlement(
  tableId: string,
  playerBalances: PlayerBalance[],
  transactions: Transaction[]
): Promise<{ success: boolean; error: any }> {
  try {
    if (!isValidUUID(tableId)) {
      return { success: false, error: new Error('Invalid table ID') };
    }

    console.log('📊 Saving settlement results...');

    // 1. Save settlement results (transactions)
    if (transactions.length > 0) {
      const settlementRecords = transactions.map((t) => ({
        table_id: tableId,
        from_player_id: t.from,
        to_player_id: t.to,
        amount: t.amount,
      }));

      const { error: settleError } = await supabase
        .from('settlement_results')
        .insert(settlementRecords);

      if (settleError) {
        console.error('Error saving settlement results:', settleError);
        // Continue anyway - this is not critical
      } else {
        console.log('✅ Settlement results saved');
      }
    }

    // 2. Save game results for each player
    const gameResults = playerBalances.map((p) => ({
      table_id: tableId,
      user_id: p.userId,
      net_profit: p.finalBalance,
      game_date: new Date().toISOString(),
    }));

    const { error: resultsError } = await supabase
      .from('game_results')
      .insert(gameResults);

    if (resultsError) {
      console.error('Error saving game results:', resultsError);
      return { success: false, error: resultsError };
    }

    console.log('✅ Game results saved');

    // 3. Update player profiles (total_profit, games_played)
    for (const player of playerBalances) {
      if (!isValidUUID(player.userId)) continue;

      // Get current profile stats
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('total_profit, games_played')
        .eq('id', player.userId)
        .single();

      if (profileError) {
        console.warn(`Could not fetch profile for ${player.name}:`, profileError);
        continue;
      }

      // Update profile stats
      const newTotalProfit = (profile?.total_profit || 0) + player.finalBalance;
      const newGamesPlayed = (profile?.games_played || 0) + 1;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          total_profit: newTotalProfit,
          games_played: newGamesPlayed,
        })
        .eq('id', player.userId);

      if (updateError) {
        console.warn(`Could not update profile for ${player.name}:`, updateError);
      } else {
        console.log(`✅ Updated profile for ${player.name}`);
      }
    }

    // 4. Mark table as finished
    const { error: tableError } = await supabase
      .from('tables')
      .update({ is_active: false, status: 'finished' })
      .eq('id', tableId);

    if (tableError) {
      console.error('Error updating table status:', tableError);
    } else {
      console.log('✅ Table marked as finished');
    }

    return { success: true, error: null };
  } catch (error) {
    console.error('Error in saveSettlement:', error);
    return { success: false, error };
  }
}

/**
 * Update player cash out value
 */
export async function updatePlayerCashOut(
  playerId: string,
  cashOut: number,
  netProfit: number
): Promise<{ error: any }> {
  try {
    if (!isValidUUID(playerId)) {
      return { error: new Error('Invalid player ID') };
    }

    const { error } = await supabase
      .from('table_players')
      .update({ cash_out: cashOut, net_profit: netProfit })
      .eq('id', playerId);

    if (error) {
      console.error('Error updating player cash out:', error);
      return { error };
    }

    return { error: null };
  } catch (error) {
    console.error('Error in updatePlayerCashOut:', error);
    return { error };
  }
}

/**
 * Get previous game results for a table
 */
export async function getGameResults(
  tableId: string
): Promise<{ results: GameResult[]; error: any }> {
  try {
    if (!isValidUUID(tableId)) {
      return { results: [], error: new Error('Invalid table ID') };
    }

    const { data, error } = await supabase
      .from('game_results')
      .select('*, profiles(username)')
      .eq('table_id', tableId)
      .order('net_profit', { ascending: false });

    if (error) {
      console.error('Error fetching game results:', error);
      return { results: [], error };
    }

    return { results: data as GameResult[], error: null };
  } catch (error) {
    console.error('Error in getGameResults:', error);
    return { results: [], error };
  }
}

/**
 * Get settlement transactions for a table
 */
export async function getSettlementTransactions(
  tableId: string
): Promise<{ transactions: any[]; error: any }> {
  try {
    if (!isValidUUID(tableId)) {
      return { transactions: [], error: new Error('Invalid table ID') };
    }

    const { data, error } = await supabase
      .from('settlement_results')
      .select('*')
      .eq('table_id', tableId);

    if (error) {
      console.error('Error fetching settlement transactions:', error);
      return { transactions: [], error };
    }

    return { transactions: data || [], error: null };
  } catch (error) {
    console.error('Error in getSettlementTransactions:', error);
    return { transactions: [], error };
  }
}
