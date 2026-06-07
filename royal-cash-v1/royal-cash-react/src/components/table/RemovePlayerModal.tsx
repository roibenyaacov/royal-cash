// ==========================================
// Royal Cash - RemovePlayerModal Component
// ==========================================

import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { useTranslation } from '../../hooks/useTranslation';
import { useTableStore } from '../../stores/tableStore';
import { TablePlayer } from '../../types';
import { removePlayer } from '../../services/playerService';

interface RemovePlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: TablePlayer | null;
}

export default function RemovePlayerModal({ isOpen, onClose, player }: RemovePlayerModalProps) {
  const { t } = useTranslation();
  const { removePlayer: removePlayerFromStore } = useTableStore();
  const [isRemoving, setIsRemoving] = useState(false);
  const [error, setError] = useState('');

  if (!player) return null;

  const playerName = player.profiles?.username || 'Unknown';
  const hasFinancialData = player.rebuys > 1 || player.food_credit > 0 || player.food_debt > 0;

  const handleRemove = async () => {
    setIsRemoving(true);
    setError('');

    try {
      const { error: removeError } = await removePlayer(player.id);

      if (removeError) {
        console.error('Remove error:', removeError);
        setError(t('error'));
        return;
      }

      removePlayerFromStore(player.id);
      onClose();
    } catch (err) {
      console.error('Remove player error:', err);
      setError(t('error'));
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('removePlayer')}>
      <div className="space-y-4">
        {/* Warning Icon */}
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-danger/20 flex items-center justify-center">
            <AlertTriangle className="text-danger" size={32} />
          </div>
        </div>

        {/* Player Name */}
        <div className="text-center">
          <div className="text-lg font-bold text-text-main mb-2">
            {playerName}
          </div>
          <p className="text-muted text-sm">
            {t('confirmRemovePlayer')}
          </p>
        </div>

        {/* Financial Warning */}
        {hasFinancialData && (
          <div className="bg-danger/10 border border-danger/30 rounded-lg p-3">
            <p className="text-danger text-sm text-center">
              {t('playerHasFinancialData')}
            </p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="text-danger text-sm text-center">{error}</div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <Button onClick={onClose} variant="outline" fullWidth>
            {t('cancel')}
          </Button>
          <Button
            onClick={handleRemove}
            variant="danger"
            isLoading={isRemoving}
            fullWidth
          >
            {t('removePlayer')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
