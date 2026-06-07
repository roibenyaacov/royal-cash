// ==========================================
// Royal Cash - CashOutInputs Component
// ==========================================

import { TablePlayer } from '../../types';
import { useTranslation } from '../../hooks/useTranslation';

interface CashOutInputsProps {
  players: TablePlayer[];
  cashOuts: Record<string, string>;
  onCashOutChange: (playerId: string, value: string) => void;
  buyIn: number;
}

export function CashOutInputs({ players, cashOuts, onCashOutChange, buyIn }: CashOutInputsProps) {
  const { t } = useTranslation();

  // Sort players by invested amount (descending)
  const sortedPlayers = [...players].sort((a, b) => {
    const investedA = (a.rebuys || 1) * buyIn;
    const investedB = (b.rebuys || 1) * buyIn;
    return investedB - investedA;
  });

  return (
    <div className="space-y-3">
      <h3 className="text-gold font-bold">{t('howMuchCash')}</h3>

      {sortedPlayers.map((player) => {
        const playerName = player.profiles?.username || 'Unknown';
        const invested = (player.rebuys || 1) * buyIn;
        const cashOutValue = cashOuts[player.id] || '';
        const cashOutNum = parseFloat(cashOutValue) || 0;
        const profit = cashOutNum - invested;

        return (
          <div
            key={player.id}
            className="flex items-center gap-3 p-3 bg-card-hover rounded-lg"
          >
            {/* Player Info */}
            <div className="flex-1 min-w-0">
              <div className="font-bold text-text-main truncate">
                {playerName}
              </div>
              <div className="text-xs text-muted">
                {t('invested')}: ₪{invested.toLocaleString()}
              </div>
            </div>

            {/* Cash Out Input */}
            <div className="flex flex-col items-end">
              <input
                type="number"
                value={cashOutValue}
                onChange={(e) => onCashOutChange(player.id, e.target.value)}
                placeholder="0"
                className="w-24 p-2 bg-black border border-gray-700 text-white rounded-lg text-center"
                min="0"
              />
              {cashOutValue && (
                <div
                  className={`text-xs mt-1 ${
                    profit >= 0 ? 'text-success' : 'text-danger'
                  }`}
                >
                  {profit >= 0 ? '+' : ''}
                  ₪{profit.toLocaleString()}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
