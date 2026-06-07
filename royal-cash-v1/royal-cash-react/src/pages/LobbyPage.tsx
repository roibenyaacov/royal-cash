import { useEffect, useState } from 'react';
import { Plus, BarChart3, Trash2, RotateCcw } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';
import { useAuthStore } from '../stores/authStore';
import { useLobbyStore } from '../stores/lobbyStore';
import { getActiveTables, getDeletedTables, createTable, deleteTable, restoreTable } from '../services/tableService';
import { Header } from '../components/layout/Header';
import { Button, Card, Modal, Input, Loading, CardSkeleton } from '../components/common';
import { useToast } from '../components/common/Toast';
import { Table } from '../types';

interface LobbyPageProps {
  onOpenTable: (tableId: string) => void;
  onOpenStats: () => void;
}

export function LobbyPage({ onOpenTable, onOpenStats }: LobbyPageProps) {
  const { t } = useTranslation();
  const { profile, user } = useAuthStore();
  const {
    activeTables,
    deletedTables,
    isLoading,
    activeTab,
    setActiveTables,
    setDeletedTables,
    setIsLoading,
    setActiveTab,
  } = useLobbyStore();
  const { showToast } = useToast();

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTableName, setNewTableName] = useState('');
  const [newTableBuyIn, setNewTableBuyIn] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Load tables on mount
  useEffect(() => {
    if (user) {
      loadTables();
    }
  }, [user]);

  const loadTables = async () => {
    if (!user) return;

    setIsLoading(true);

    try {
      const { tables: active } = await getActiveTables(user.id);
      setActiveTables(active);

      const { tables: deleted } = await getDeletedTables(user.id);
      setDeletedTables(deleted);
    } catch (error) {
      console.error('Error loading tables:', error);
      showToast(t('errorLoadingTables'), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTable = async () => {
    if (!newTableName || !newTableBuyIn || !user) {
      showToast(t('fillAllFields'), 'error');
      return;
    }

    setIsCreating(true);

    try {
      const { table, error } = await createTable(newTableName, parseInt(newTableBuyIn), user.id);

      if (error) {
        showToast(t('errorCreatingTable') + ': ' + error.message, 'error');
        return;
      }

      if (table) {
        showToast('שולחן נוצר בהצלחה!', 'success');
        setShowCreateModal(false);
        setNewTableName('');
        setNewTableBuyIn('');
        onOpenTable(table.id);
      }
    } catch (error: any) {
      showToast(t('errorCreatingTable'), 'error');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteTable = async (tableId: string) => {
    if (!confirm(t('confirmDelete'))) return;

    try {
      const { error } = await deleteTable(tableId);

      if (error) {
        showToast(t('errorDeletingTable'), 'error');
        return;
      }

      showToast(t('tableDeleted'), 'success');
      loadTables();
    } catch (error) {
      showToast(t('errorDeletingTable'), 'error');
    }
  };

  const handleRestoreTable = async (tableId: string) => {
    try {
      const { error } = await restoreTable(tableId);

      if (error) {
        showToast(t('errorRestoringTable'), 'error');
        return;
      }

      showToast(t('tableRestored'), 'success');
      loadTables();
    } catch (error) {
      showToast(t('errorRestoringTable'), 'error');
    }
  };

  return (
    <div className="min-h-screen bg-bg-dark">
      <div className="max-w-lg mx-auto p-4">
        <Header />

        {/* Stats Button */}
        <Button variant="outline" onClick={onOpenStats} className="mb-6">
          <BarChart3 className="w-5 h-5" />
          {t('myStats')} {t('emojiStats')}
        </Button>

        {/* Tabs */}
        <div className="flex mb-6">
          <button
            className={`auth-tab ${activeTab === 'active' ? 'active' : ''}`}
            onClick={() => setActiveTab('active')}
          >
            {t('activeTables')}
          </button>
          <button
            className={`auth-tab ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            {t('history')} {t('emojiHistory')}
          </button>
        </div>

        {/* Active Tables */}
        {activeTab === 'active' && (
          <>
            {/* Create Table Button */}
            <Button onClick={() => setShowCreateModal(true)} className="mb-4">
              <Plus className="w-5 h-5" />
              {t('createTable')}
            </Button>

            {/* Tables List */}
            {isLoading ? (
              <>
                <CardSkeleton />
                <CardSkeleton />
              </>
            ) : activeTables.length === 0 ? (
              <div className="text-center text-muted py-8">{t('noActiveTables')}</div>
            ) : (
              activeTables.map((table) => (
                <TableCard
                  key={table.id}
                  table={table}
                  onClick={() => onOpenTable(table.id)}
                  isOwner={table.owner_id === user?.id}
                  onDelete={() => handleDeleteTable(table.id)}
                  t={t}
                />
              ))
            )}
          </>
        )}

        {/* History / Deleted Tables */}
        {activeTab === 'history' && (
          <>
            {isLoading ? (
              <>
                <CardSkeleton />
                <CardSkeleton />
              </>
            ) : deletedTables.length === 0 ? (
              <div className="text-center text-muted py-8">{t('noDeletedTables')}</div>
            ) : (
              deletedTables.map((table) => (
                <DeletedTableCard
                  key={table.id}
                  table={table}
                  onRestore={() => handleRestoreTable(table.id)}
                  t={t}
                />
              ))
            )}
          </>
        )}
      </div>

      {/* Create Table Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title={t('newTable')}>
        <Input
          placeholder={t('tableNamePlaceholder')}
          value={newTableName}
          onChange={(e) => setNewTableName(e.target.value)}
        />
        <Input
          type="number"
          placeholder={t('buyInPrice')}
          value={newTableBuyIn}
          onChange={(e) => setNewTableBuyIn(e.target.value)}
        />
        <div className="flex gap-3 mt-4">
          <Button variant="outline" onClick={() => setShowCreateModal(false)}>
            {t('cancel')}
          </Button>
          <Button onClick={handleCreateTable} isLoading={isCreating}>
            {t('create')}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

// Table Card Component
interface TableCardProps {
  table: Table;
  onClick: () => void;
  isOwner: boolean;
  onDelete: () => void;
  t: (key: any) => string;
}

function TableCard({ table, onClick, isOwner, onDelete, t }: TableCardProps) {
  return (
    <Card variant="hover" onClick={onClick}>
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-bold text-gold">{table.name}</h3>
          <p className="text-muted text-sm">
            {t('entry')}: {table.buy_in}₪ | {table.playerCount || 0} {t('players')}
          </p>
        </div>
        {isOwner && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-2 text-muted hover:text-danger transition-colors"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        )}
      </div>
    </Card>
  );
}

// Deleted Table Card Component
interface DeletedTableCardProps {
  table: Table;
  onRestore: () => void;
  t: (key: any) => string;
}

function DeletedTableCard({ table, onRestore, t }: DeletedTableCardProps) {
  const date = new Date(table.created_at).toLocaleDateString('he-IL');

  return (
    <Card className="opacity-70 border-danger">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-bold text-gold flex items-center gap-2">
            {table.name}
            <span>🗑️</span>
          </h3>
          <p className="text-muted text-sm">
            {t('entry')}: {table.buy_in}₪ | {table.playerCount || 0} {t('players')} | {date}
          </p>
        </div>
      </div>
      <div className="flex gap-3 mt-3">
        <Button variant="outline" size="sm" className="flex-1">
          {t('summary')}
        </Button>
        <Button size="sm" onClick={onRestore} className="flex-1">
          <RotateCcw className="w-4 h-4" />
          {t('restoreTable')}
        </Button>
      </div>
    </Card>
  );
}
