// ==========================================
// Royal Cash - Player Service
// ==========================================
// Logic copied AS-IS from original HTML file
// ==========================================

import { supabase, isValidUUID } from '../config/supabase';
import { TablePlayer } from '../types';

/**
 * Add a player to the table
 * Copied from original addPlayer() function
 */
export async function addPlayer(
  tableId: string,
  userId: string
): Promise<{ player: TablePlayer | null; error: any }> {
  try {
    if (!isValidUUID(tableId) || !isValidUUID(userId)) {
      return { player: null, error: new Error('Invalid ID') };
    }

    // Check if already a player
    const { data: existing } = await supabase
      .from('table_players')
      .select('*')
      .eq('table_id', tableId)
      .eq('user_id', userId)
      .single();

    if (existing) {
      return { player: null, error: new Error('Player already in table') };
    }

    const { data, error } = await supabase
      .from('table_players')
      .insert([
        {
          table_id: tableId,
          user_id: userId,
          rebuys: 1,
          food_credit: 0,
          food_debt: 0,
        },
      ])
      .select('*, profiles(username, phone_number)')
      .single();

    if (error) {
      console.error('Error adding player:', error);
      return { player: null, error };
    }

    return { player: data as TablePlayer, error: null };
  } catch (error) {
    console.error('Error in addPlayer:', error);
    return { player: null, error };
  }
}

/**
 * Remove a player from the table
 * Copied from original confirmRemovePlayer() function
 */
export async function removePlayer(playerId: string): Promise<{ error: any }> {
  try {
    if (!isValidUUID(playerId)) {
      return { error: new Error('Invalid player ID') };
    }

    console.log('🗑️ Attempting to delete player:', playerId);

    const { error } = await supabase
      .from('table_players')
      .delete()
      .eq('id', playerId);

    if (error) {
      console.error('❌ Delete failed:', error);
      return { error };
    }

    console.log('✅ Player deleted successfully from database');
    return { error: null };
  } catch (error) {
    console.error('Error in removePlayer:', error);
    return { error };
  }
}

/**
 * Update player rebuy count
 * Copied from original syncRebuyToDatabase() function
 */
export async function updateRebuys(
  playerId: string,
  newRebuys: number
): Promise<{ error: any }> {
  try {
    if (!isValidUUID(playerId)) {
      return { error: new Error('Invalid player ID') };
    }

    const { error } = await supabase
      .from('table_players')
      .update({ rebuys: newRebuys })
      .eq('id', playerId);

    if (error) {
      console.error('Error updating rebuys:', error);
      return { error };
    }

    return { error: null };
  } catch (error) {
    console.error('Error in updateRebuys:', error);
    return { error };
  }
}

/**
 * Get player by ID
 */
export async function getPlayer(
  playerId: string
): Promise<{ player: TablePlayer | null; error: any }> {
  try {
    if (!isValidUUID(playerId)) {
      return { player: null, error: new Error('Invalid player ID') };
    }

    const { data, error } = await supabase
      .from('table_players')
      .select('*, profiles(username, phone_number)')
      .eq('id', playerId)
      .single();

    if (error) {
      console.error('Error fetching player:', error);
      return { player: null, error };
    }

    return { player: data as TablePlayer, error: null };
  } catch (error) {
    console.error('Error in getPlayer:', error);
    return { player: null, error };
  }
}

/**
 * Get player's current rebuy count
 */
export async function getPlayerRebuys(playerId: string): Promise<{ rebuys: number; error: any }> {
  try {
    if (!isValidUUID(playerId)) {
      return { rebuys: 1, error: new Error('Invalid player ID') };
    }

    const { data, error } = await supabase
      .from('table_players')
      .select('rebuys')
      .eq('id', playerId)
      .single();

    if (error) {
      console.error('Error fetching rebuys:', error);
      return { rebuys: 1, error };
    }

    return { rebuys: data?.rebuys || 1, error: null };
  } catch (error) {
    console.error('Error in getPlayerRebuys:', error);
    return { rebuys: 1, error };
  }
}

/**
 * Update player food credit
 */
export async function updateFoodCredit(
  playerId: string,
  amount: number
): Promise<{ error: any }> {
  try {
    if (!isValidUUID(playerId)) {
      return { error: new Error('Invalid player ID') };
    }

    // Get current food_credit
    const { data: player } = await supabase
      .from('table_players')
      .select('food_credit')
      .eq('id', playerId)
      .single();

    const newCredit = (player?.food_credit || 0) + amount;

    const { error } = await supabase
      .from('table_players')
      .update({ food_credit: newCredit })
      .eq('id', playerId);

    if (error) {
      console.error('Error updating food credit:', error);
      return { error };
    }

    return { error: null };
  } catch (error) {
    console.error('Error in updateFoodCredit:', error);
    return { error };
  }
}

/**
 * Update player food debt
 */
export async function updateFoodDebt(
  playerId: string,
  amount: number
): Promise<{ error: any }> {
  try {
    if (!isValidUUID(playerId)) {
      return { error: new Error('Invalid player ID') };
    }

    // Get current food_debt
    const { data: player } = await supabase
      .from('table_players')
      .select('food_debt')
      .eq('id', playerId)
      .single();

    const newDebt = (player?.food_debt || 0) + amount;

    const { error } = await supabase
      .from('table_players')
      .update({ food_debt: newDebt })
      .eq('id', playerId);

    if (error) {
      console.error('Error updating food debt:', error);
      return { error };
    }

    return { error: null };
  } catch (error) {
    console.error('Error in updateFoodDebt:', error);
    return { error };
  }
}

/**
 * Update player results (cash_out and net_profit)
 */
export async function updatePlayerResults(
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
      console.error('Error updating player results:', error);
      return { error };
    }

    return { error: null };
  } catch (error) {
    console.error('Error in updatePlayerResults:', error);
    return { error };
  }
}
