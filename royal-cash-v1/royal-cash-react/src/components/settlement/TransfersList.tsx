// ==========================================
// Royal Cash - TransfersList Component
// ==========================================

import { ArrowRight } from 'lucide-react';
import { Transaction, PlayerBalance } from '../../types';
import { useTranslation } from '../../hooks/useTranslation';
import { Button } from '../common/Button';
import { payWithBit } from '../../utils/bitPayment';

interface TransfersListProps {
  transactions: Transaction[];
  playerBalances: PlayerBalance[];
  onSaveAndExit: () => void;
  isSaving: boolean;
}

export function TransfersList({
  transactions,
  playerBalances,
  onSaveAndExit,
  isSaving,
}: TransfersListProps) {
  const { t, isRTL } = useTranslation();

  const handlePayWithBit = async (transaction: Transaction) => {
    const result = await payWithBit(
      transaction.toPhone,
      transaction.toName,
      transaction.amount
    );

    if (result.success && result.message) {
      // Could show a toast here
      console.log(result.message);
    }
  };

  // Check if everyone is balanced
  const allBalanced = transactions.length === 0;

  return (
    <div className="space-y-4">
      {/* Results Summary */}
      <div className="card-gold">
        <h3 className="text-gold font-bold mb-3">{t('finalResults')}</h3>

        <div className="space-y-2">
          {playerBalances
            .sort((a, b) => b.finalBalance - a.finalBalance)
            .map((player) => (
              <div
                key={player.id}
                className="flex justify-between items-center p-2 bg-black/30 rounded-lg"
              >
                <span className="text-text-main">{player.name}</span>
                <span
                  className={`font-bold ${
                    player.finalBalance >= 0 ? 'text-success' : 'text-danger'
                  }`}
                >
                  {player.finalBalance >= 0 ? '+' : ''}₪
                  {Math.round(player.finalBalance).toLocaleString()}
                </span>
              </div>
            ))}
        </div>
      </div>

      {/* Transfers Section */}
      <div className="card">
        <h3 className="text-gold font-bold mb-3">
          {allBalanced ? t('allBalanced') : t('transfersToMake')}
        </h3>

        {allBalanced ? (
          <div className="text-center text-success py-4">
            <span className="text-4xl">✨</span>
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map((t, index) => (
              <div
                key={index}
                className="transfer-row"
              >
                {/* From Player */}
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-text-main truncate">
                    {t.fromName}
                  </div>
                  {t.fromPhone && (
                    <div className="text-xs text-muted">{t.fromPhone}</div>
                  )}
                </div>

                {/* Arrow & Amount */}
                <div className="flex flex-col items-center px-3">
                  <div className="text-gold font-bold">
                    ₪{t.amount.toLocaleString()}
                  </div>
                  <ArrowRight
                    size={16}
                    className={`text-muted ${isRTL ? 'rotate-180' : ''}`}
                  />
                </div>

                {/* To Player */}
                <div className="flex-1 min-w-0 text-left">
                  <div className="font-bold text-text-main truncate">
                    {t.toName}
                  </div>
                  {t.toPhone && (
                    <div className="text-xs text-muted">{t.toPhone}</div>
                  )}
                </div>

                {/* Bit Payment Button */}
                {t.toPhone && (
                  <Button
                    onClick={() => handlePayWithBit(t)}
                    variant="bit"
                    size="sm"
                    fullWidth={false}
                    className="!w-auto !py-1 !px-2"
                  >
                    <img
                      src="/Bit-logo.png"
                      alt="Bit"
                      className="h-5 w-auto"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Save & Exit Button */}
      <Button onClick={onSaveAndExit} isLoading={isSaving} fullWidth>
        {t('updateAndExit')}
      </Button>
    </div>
  );
}
