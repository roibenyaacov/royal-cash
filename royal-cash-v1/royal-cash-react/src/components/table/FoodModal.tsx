// ==========================================
// Royal Cash - FoodModal Component
// ==========================================
// Logic copied AS-IS from original HTML file
// ==========================================

import { useState, useEffect } from 'react';
import { Users, User } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { useTranslation } from '../../hooks/useTranslation';
import { useTableStore } from '../../stores/tableStore';
import { TablePlayer, FoodMode, FoodConsumer } from '../../types';
import { supabase } from '../../config/supabase';
import { updateFoodCredit, updateFoodDebt } from '../../services/playerService';

interface FoodModalProps {
  isOpen: boolean;
  onClose: () => void;
  tableId: string;
}

export default function FoodModal({ isOpen, onClose, tableId }: FoodModalProps) {
  const { t } = useTranslation();
  const { players, updatePlayer } = useTableStore();
  const [mode, setMode] = useState<FoodMode>('equal');
  const [payerId, setPayerId] = useState<string>('');
  const [totalAmount, setTotalAmount] = useState<string>('');
  const [individualAmounts, setIndividualAmounts] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setMode('equal');
      setPayerId(players.length > 0 ? players[0].id : '');
      setTotalAmount('');
      setIndividualAmounts({});
      setError('');
    }
  }, [isOpen, players]);

  const handleSubmit = async () => {
    if (!payerId) {
      setError(t('missingDetails'));
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const payer = players.find((p) => p.id === payerId);
      if (!payer) {
        setError(t('error'));
        return;
      }

      let consumers: FoodConsumer[] = [];
      let total = 0;

      if (mode === 'equal') {
        // Equal split mode
        total = parseFloat(totalAmount) || 0;
        if (total <= 0) {
          setError(t('noAmountsEntered'));
          setIsSubmitting(false);
          return;
        }

        const perPerson = total / players.length;
        consumers = players.map((p) => ({
          player_id: p.id,
          amount: perPerson,
          player_name: p.profiles?.username || 'Unknown',
        }));
      } else {
        // Individual amounts mode
        consumers = players
          .filter((p) => {
            const amount = parseFloat(individualAmounts[p.id]) || 0;
            return amount > 0;
          })
          .map((p) => ({
            player_id: p.id,
            amount: parseFloat(individualAmounts[p.id]) || 0,
            player_name: p.profiles?.username || 'Unknown',
          }));

        total = consumers.reduce((sum, c) => sum + c.amount, 0);

        if (total <= 0) {
          setError(t('noAmountsEntered'));
          setIsSubmitting(false);
          return;
        }
      }

      // Save food expense to database
      const { error: insertError } = await supabase.from('food_expenses').insert([
        {
          table_id: tableId,
          payer_id: payer.user_id,
          total_amount: total,
          split_mode: mode,
          consumers: consumers,
        },
      ]);

      if (insertError) {
        console.error('Error saving food expense:', insertError);
        setError(t('error'));
        return;
      }

      // Update payer's food_credit
      await updateFoodCredit(payerId, total);
      updatePlayer(payerId, { food_credit: (payer.food_credit || 0) + total });

      // Update each consumer's food_debt
      for (const consumer of consumers) {
        const consumerPlayer = players.find((p) => p.id === consumer.player_id);
        if (consumerPlayer) {
          await updateFoodDebt(consumer.player_id, consumer.amount);
          updatePlayer(consumer.player_id, {
            food_debt: (consumerPlayer.food_debt || 0) + consumer.amount,
          });
        }
      }

      // Add game log
      try {
        await supabase.from('game_logs').insert([
          {
            table_id: tableId,
            action: 'food_expense',
            message: `${payer.profiles?.username} שילם ₪${total.toLocaleString()} על אוכל`,
            user_id: payer.user_id,
          },
        ]);
      } catch (logError) {
        console.warn('Could not create game log:', logError);
      }

      onClose();
    } catch (err) {
      console.error('Food expense error:', err);
      setError(t('error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('weWereHungry')}>
      <div className="space-y-4">
        {/* Mode Toggle */}
        <div className="toggle-container">
          <button
            onClick={() => setMode('equal')}
            className={`toggle-btn ${mode === 'equal' ? 'active' : ''}`}
          >
            <Users size={16} className="inline mr-1" />
            שווה
          </button>
          <button
            onClick={() => setMode('individual')}
            className={`toggle-btn ${mode === 'individual' ? 'active' : ''}`}
          >
            <User size={16} className="inline mr-1" />
            אישי
          </button>
        </div>

        {/* Payer Selection */}
        <div>
          <label className="block text-sm text-muted mb-2">{t('whoPaid')}</label>
          <select
            value={payerId}
            onChange={(e) => setPayerId(e.target.value)}
            className="w-full p-3 bg-black border border-gray-700 text-white rounded-lg"
          >
            {players.map((player) => (
              <option key={player.id} value={player.id}>
                {player.profiles?.username || 'Unknown'}
              </option>
            ))}
          </select>
        </div>

        {/* Amount Input(s) */}
        {mode === 'equal' ? (
          <div>
            <label className="block text-sm text-muted mb-2">סכום כולל (₪)</label>
            <input
              type="number"
              value={totalAmount}
              onChange={(e) => setTotalAmount(e.target.value)}
              placeholder="0"
              className="w-full p-3 bg-black border border-gray-700 text-white rounded-lg"
              min="0"
            />
            {totalAmount && parseFloat(totalAmount) > 0 && (
              <div className="text-sm text-muted mt-2 text-center">
                ₪{(parseFloat(totalAmount) / players.length).toFixed(2)} לכל שחקן
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            <label className="block text-sm text-muted mb-2">סכום לכל שחקן (₪)</label>
            {players.map((player) => (
              <div key={player.id} className="flex items-center gap-3">
                <span className="text-text-main flex-1 truncate">
                  {player.profiles?.username || 'Unknown'}
                </span>
                <input
                  type="number"
                  value={individualAmounts[player.id] || ''}
                  onChange={(e) =>
                    setIndividualAmounts((prev) => ({
                      ...prev,
                      [player.id]: e.target.value,
                    }))
                  }
                  placeholder="0"
                  className="w-24 p-2 bg-black border border-gray-700 text-white rounded-lg text-center"
                  min="0"
                />
              </div>
            ))}
          </div>
        )}

        {/* Error Message */}
        {error && <div className="text-danger text-sm text-center">{error}</div>}

        {/* Actions */}
        <div className="flex gap-3">
          <Button onClick={onClose} variant="outline" fullWidth>
            {t('cancel')}
          </Button>
          <Button onClick={handleSubmit} isLoading={isSubmitting} fullWidth>
            אישור
          </Button>
        </div>
      </div>
    </Modal>
  );
}
