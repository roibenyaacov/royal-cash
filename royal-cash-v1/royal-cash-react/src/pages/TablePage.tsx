// ==========================================
// Royal Cash - TablePage Component
// ==========================================

import { useState, useEffect } from 'react';
import { UserPlus } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';
import { useTableStore } from '../stores/tableStore';
import { useAuthStore } from '../stores/authStore';
import { Table, TablePlayer, ViewType } from '../types';
import { getTable, getTablePlayers, deleteTable } from '../services/tableService';
import { supabase } from '../config/supabase';
import { Loading } from '../components/common/Loading';
import { Button } from '../components/common/Button';
import TableHeader from '../components/table/TableHeader';
import PlayersList from '../components/table/PlayersList';
import AddPlayerModal from '../components/table/AddPlayerModal';
import RemovePlayerModal from '../components/table/RemovePlayerModal';
import FoodModal from '../components/table/FoodModal';
import ShareModal from '../components/table/ShareModal';
import GameLogs from '../components/table/GameLogs';

interface TablePageProps {
  tableId: string;
  onNavigate: (view: ViewType, tableId?: string) => void;
}

export default function TablePage({ tableId, onNavigate }: TablePageProps) {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const {
    activeTable,
    setActiveTable,
    players,
    setPlayers,
    isLoading,
    setIsLoading,
    getPot,
    reset,
  } = useTableStore();

  // Modal states
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [showRemovePlayer, setShowRemovePlayer] = useState(false);
  const [showFood, setShowFood] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [playerToRemove, setPlayerToRemove] = useState<TablePlayer | null>(null);

  const isOwner = activeTable?.owner_id === user?.id;

  // Load table data
  useEffect(() => {
    const loadTable = async () => {
      setIsLoading(true);

      try {
        // Get table info
        const { table, error: tableError } = await getTable(tableId);
        if (tableError || !table) {
          console.error('Error loading table:', tableError);
          onNavigate('lobby');
          return;
        }

        setActiveTable(table);

        // Get players
        const { players: tablePlayers, error: playersError } = await getTablePlayers(tableId);
        if (playersError) {
          console.error('Error loading players:', playersError);
        } else {
          setPlayers(tablePlayers);
        }
      } catch (err) {
        console.error('Error loading table:', err);
        onNavigate('lobby');
      } finally {
        setIsLoading(false);
      }
    };

    loadTable();

    return () => {
      reset();
    };
  }, [tableId, onNavigate, setActiveTable, setPlayers, setIsLoading, reset]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!tableId) return;

    // Subscribe to table_players changes
    const playersChannel = supabase
      .channel(`table_players_${tableId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'table_players',
          filter: `table_id=eq.${tableId}`,
        },
        async (payload) => {
          console.log('Realtime update:', payload.eventType);

          if (payload.eventType === 'INSERT') {
            // Fetch new player with profile
            const { data } = await supabase
              .from('table_players')
              .select('*, profiles(username, phone_number)')
              .eq('id', payload.new.id)
              .single();

            if (data && !players.find((p) => p.id === data.id)) {
              setPlayers([...players, data as TablePlayer]);
            }
          } else if (payload.eventType === 'UPDATE') {
            setPlayers(
              players.map((p) =>
                p.id === payload.new.id ? { ...p, ...payload.new } : p
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setPlayers(players.filter((p) => p.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(playersChannel);
    };
  }, [tableId, players, setPlayers]);

  const handleBack = () => {
    onNavigate('lobby');
  };

  const handleDelete = async () => {
    if (!activeTable) return;

    const confirmed = window.confirm(t('confirmDelete'));
    if (!confirmed) return;

    const { error } = await deleteTable(activeTable.id);
    if (!error) {
      onNavigate('lobby');
    }
  };

  const handleRemoveClick = (player: TablePlayer) => {
    setPlayerToRemove(player);
    setShowRemovePlayer(true);
  };

  const handleSettle = () => {
    onNavigate('settle', tableId);
  };

  if (isLoading || !activeTable) {
    return <Loading text={t('loading')} />;
  }

  return (
    <div className="min-h-screen bg-bg-dark p-4">
      <div className="max-w-md mx-auto space-y-4">
        {/* Header */}
        <TableHeader
          table={activeTable}
          pot={getPot()}
          onBack={handleBack}
          onDelete={handleDelete}
          onShare={() => setShowShare(true)}
          onFood={() => setShowFood(true)}
          onSettle={handleSettle}
          isOwner={isOwner}
        />

        {/* Players Section */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-gold font-bold">
              {t('players')} ({players.length})
            </h2>
            <Button
              onClick={() => setShowAddPlayer(true)}
              variant="outline"
              size="sm"
              fullWidth={false}
              className="!w-auto !py-2 !px-3"
            >
              <UserPlus size={16} className="mr-1" />
              {t('add')}
            </Button>
          </div>

          <PlayersList
            buyIn={activeTable.buy_in}
            onRemoveClick={handleRemoveClick}
            isOwner={isOwner}
          />
        </div>

        {/* Game Logs */}
        <GameLogs tableId={tableId} />

        {/* Modals */}
        <AddPlayerModal
          isOpen={showAddPlayer}
          onClose={() => setShowAddPlayer(false)}
          tableId={tableId}
        />

        <RemovePlayerModal
          isOpen={showRemovePlayer}
          onClose={() => {
            setShowRemovePlayer(false);
            setPlayerToRemove(null);
          }}
          player={playerToRemove}
        />

        <FoodModal
          isOpen={showFood}
          onClose={() => setShowFood(false)}
          tableId={tableId}
        />

        <ShareModal
          isOpen={showShare}
          onClose={() => setShowShare(false)}
          tableId={tableId}
          tableName={activeTable.name}
        />
      </div>
    </div>
  );
}
