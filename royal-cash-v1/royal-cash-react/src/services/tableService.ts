// ==========================================
// Royal Cash - Table Service
// ==========================================
// Logic copied AS-IS from original HTML file
// ==========================================

import { supabase, isValidUUID } from '../config/supabase';
import { Table, TablePlayer } from '../types';

/**
 * Create a new table
 * Copied from original createNewTable() function
 */
export async function createTable(
  name: string,
  buyIn: number,
  ownerId: string
): Promise<{ table: Table | null; error: any }> {
  try {
    // Step 1: Create the table
    console.log('📋 Step 1: Creating table...');
    const { data, error } = await supabase
      .from('tables')
      .insert([
        {
          name,
          buy_in: buyIn,
          owner_id: ownerId,
          is_active: true,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating table:', error);
      return { table: null, error };
    }

    if (!data || !data.id) {
      return { table: null, error: new Error('Table created but no ID returned') };
    }

    const tableId = data.id;
    console.log('✅ Step 1: Table created with ID:', tableId);

    // Step 2: Add host as player
    console.log('👤 Step 2: Adding host as player...');
    const { error: playerError } = await supabase.from('table_players').insert([
      {
        table_id: tableId,
        user_id: ownerId,
        rebuys: 1,
        food_credit: 0,
        food_debt: 0,
      },
    ]);

    if (playerError) {
      console.error('❌ Error adding host as player:', playerError);
    } else {
      console.log('✅ Step 2: Host added as player with 1 buy-in');
    }

    // Step 3: Add game log
    try {
      await supabase.from('game_logs').insert([
        {
          table_id: tableId,
          action: 'player_added',
          message: 'המארח הצטרף לשולחן (buy-in ראשון)',
          user_id: ownerId,
        },
      ]);
      console.log('✅ Step 3: Game log created');
    } catch (logError) {
      console.warn('⚠️ Could not create game log:', logError);
    }

    return { table: data as Table, error: null };
  } catch (error) {
    console.error('Error in createTable:', error);
    return { table: null, error };
  }
}

/**
 * Get table by ID
 * Copied from original openTable() function
 */
export async function getTable(tableId: string): Promise<{ table: Table | null; error: any }> {
  try {
    if (!isValidUUID(tableId)) {
      return { table: null, error: new Error('Invalid table ID') };
    }

    const { data, error } = await supabase
      .from('tables')
      .select('*')
      .eq('id', tableId)
      .single();

    if (error) {
      console.error('Error fetching table:', error);
      return { table: null, error };
    }

    return { table: data as Table, error: null };
  } catch (error) {
    console.error('Error in getTable:', error);
    return { table: null, error };
  }
}

/**
 * Get all active tables for a user (owned or participating)
 * Copied from original renderLobby() function
 */
export async function getActiveTables(userId: string): Promise<{ tables: Table[]; error: any }> {
  try {
    // Get tables where user is owner
    const { data: ownedTables, error: ownedError } = await supabase
      .from('tables')
      .select('*')
      .eq('owner_id', userId)
      .eq('is_active', true);

    if (ownedError) {
      console.error('Error loading owned tables:', ownedError);
      return { tables: [], error: ownedError };
    }

    // Get tables where user is a player
    const { data: playerTables, error: playerError } = await supabase
      .from('table_players')
      .select('table_id, tables(*)')
      .eq('user_id', userId);

    if (playerError) {
      console.error('Error loading player tables:', playerError);
      return { tables: [], error: playerError };
    }

    // Combine and deduplicate
    const tableMap = new Map<string, Table>();
    const seenIds = new Set<string>();

    // Add owned tables (only if not deleted and active)
    ownedTables?.forEach((t) => {
      if (
        t &&
        t.id &&
        !seenIds.has(t.id) &&
        t.is_active === true &&
        (t.is_deleted === false || t.is_deleted === null || t.is_deleted === undefined)
      ) {
        tableMap.set(t.id, t as Table);
        seenIds.add(t.id);
      }
    });

    // Add tables where user is a player
    playerTables?.forEach((tp: any) => {
      if (
        tp.tables &&
        tp.tables.id &&
        !seenIds.has(tp.tables.id) &&
        tp.tables.is_active === true &&
        (tp.tables.is_deleted === false ||
          tp.tables.is_deleted === null ||
          tp.tables.is_deleted === undefined)
      ) {
        tableMap.set(tp.tables.id, tp.tables as Table);
        seenIds.add(tp.tables.id);
      }
    });

    const tables = Array.from(tableMap.values());

    // Get player counts for each table
    for (const table of tables) {
      const { count } = await supabase
        .from('table_players')
        .select('*', { count: 'exact', head: true })
        .eq('table_id', table.id);
      table.playerCount = count || 0;
    }

    return { tables, error: null };
  } catch (error) {
    console.error('Error in getActiveTables:', error);
    return { tables: [], error };
  }
}

/**
 * Get deleted tables for a user
 * Copied from original renderHistory() function
 */
export async function getDeletedTables(userId: string): Promise<{ tables: Table[]; error: any }> {
  try {
    const { data, error } = await supabase
      .from('tables')
      .select('*')
      .eq('owner_id', userId)
      .eq('is_deleted', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading deleted tables:', error);
      return { tables: [], error };
    }

    // Get player counts
    const tables = data as Table[];
    for (const table of tables) {
      const { count } = await supabase
        .from('table_players')
        .select('*', { count: 'exact', head: true })
        .eq('table_id', table.id);
      table.playerCount = count || 0;
    }

    return { tables, error: null };
  } catch (error) {
    console.error('Error in getDeletedTables:', error);
    return { tables: [], error };
  }
}

/**
 * Soft delete a table
 * Copied from original deleteTable() function
 */
export async function deleteTable(tableId: string): Promise<{ error: any }> {
  try {
    if (!isValidUUID(tableId)) {
      return { error: new Error('Invalid table ID') };
    }

    console.log('🗑️ Soft deleting table:', tableId);

    const { error } = await supabase
      .from('tables')
      .update({ is_deleted: true })
      .eq('id', tableId);

    if (error) {
      console.error('❌ Error deleting table:', error);
      return { error };
    }

    console.log('✅ Table soft deleted successfully');
    return { error: null };
  } catch (error) {
    console.error('Error in deleteTable:', error);
    return { error };
  }
}

/**
 * Restore a deleted table
 * Copied from original restoreDeletedTable() function
 */
export async function restoreTable(tableId: string): Promise<{ error: any }> {
  try {
    if (!isValidUUID(tableId)) {
      return { error: new Error('Invalid table ID') };
    }

    console.log('🔄 Restoring deleted table:', tableId);

    const { error } = await supabase
      .from('tables')
      .update({ is_deleted: false, is_active: true })
      .eq('id', tableId);

    if (error) {
      console.error('❌ Error restoring table:', error);
      return { error };
    }

    console.log('✅ Table restored successfully');
    return { error: null };
  } catch (error) {
    console.error('Error in restoreTable:', error);
    return { error };
  }
}

/**
 * Update table status
 */
export async function updateTableStatus(
  tableId: string,
  status: 'active' | 'settling' | 'finished'
): Promise<{ error: any }> {
  try {
    if (!isValidUUID(tableId)) {
      return { error: new Error('Invalid table ID') };
    }

    const { error } = await supabase
      .from('tables')
      .update({ status })
      .eq('id', tableId);

    if (error) {
      console.error('Error updating table status:', error);
      return { error };
    }

    return { error: null };
  } catch (error) {
    console.error('Error in updateTableStatus:', error);
    return { error };
  }
}

/**
 * Get table players
 */
export async function getTablePlayers(
  tableId: string
): Promise<{ players: TablePlayer[]; error: any }> {
  try {
    if (!isValidUUID(tableId)) {
      return { players: [], error: new Error('Invalid table ID') };
    }

    const { data, error } = await supabase
      .from('table_players')
      .select('*, profiles(username, phone_number)')
      .eq('table_id', tableId);

    if (error) {
      console.error('Error fetching players:', error);
      return { players: [], error };
    }

    return { players: data as TablePlayer[], error: null };
  } catch (error) {
    console.error('Error in getTablePlayers:', error);
    return { players: [], error };
  }
}
