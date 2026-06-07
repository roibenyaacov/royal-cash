// ==========================================
// Royal Cash - SettlementPage Component
// ==========================================

import { useState, useEffect, useMemo } from 'react';
import { ArrowRight } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';
import { useTableStore } from '../stores/tableStore';
import { ViewType, TablePlayer, PlayerBalance, Transaction } from '../types';
import { getTable, getTablePlayers } from '../services/tableService';
import { saveSettlement } from '../services/settlementService';
import { calculatePlayerBalances, optimizeTransactions, validateBalances } from '../utils/calculations';
import { Loading } from '../components/common/Loading';
import { Button } from '../components/common/Button';
import { CashOutInputs } from '../components/settlement/CashOutInputs';
import { TransfersList } from '../components/settlement/TransfersList';

interface SettlementPageProps {
  tableId: string;
  onNavigate: (view: ViewType, tableId?: string) => void;
}

export default function SettlementPage({ tableId, onNavigate }: SettlementPageProps) {
  const { t, isRTL } = useTranslation();
  const {
    activeTable,
    setActiveTable,
    players,
    setPlayers,
    isLoading,
    setIsLoading,
    getPot,
  } = useTableStore();

  // Local state
  const [cashOuts, setCashOuts] = useState<Record<string, string>>({});
  const [showResults, setShowResults] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [playerBalances, setPlayerBalances] = useState<PlayerBalance[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // Calculate total cash out
  const totalCashOut = useMemo(() => {
    return Object.values(cashOuts).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
  }, [cashOuts]);

  // Load table data if not already loaded
  useEffect(() => {
    const loadTableData = async () => {
      if (activeTable && players.length > 0) {
        // Initialize cash outs with any existing values
        const initialCashOuts: Record<string, string> = {};
        players.forEach((p) => {
          if (p.cash_out !== undefined && p.cash_out !== null) {
            initialCashOuts[p.id] = p.cash_out.toString();
          }
        });
        setCashOuts(initialCashOuts);
        return;
      }

      setIsLoading(true);
      try {
        const { table } = await getTable(tableId);
        if (table) {
          setActiveTable(table);
        }

        const { players: tablePlayers } = await getTablePlayers(tableId);
        if (tablePlayers) {
          setPlayers(tablePlayers);

          // Initialize cash outs
          const initialCashOuts: Record<string, string> = {};
          tablePlayers.forEach((p) => {
            if (p.cash_out !== undefined && p.cash_out !== null) {
              initialCashOuts[p.id] = p.cash_out.toString();
            }
          });
          setCashOuts(initialCashOuts);
        }
      } catch (error) {
        console.error('Error loading table:', error);
        onNavigate('lobby');
      } finally {
        setIsLoading(false);
      }
    };

    loadTableData();
  }, [tableId, activeTable, players, setActiveTable, setPlayers, setIsLoading, onNavigate]);

  const handleCashOutChange = (playerId: string, value: string) => {
    setCashOuts((prev) => ({
      ...prev,
      [playerId]: value,
    }));
    // Reset results when cash outs change
    setShowResults(false);
  };

  const handleCalculate = () => {
    if (!activeTable) return;

    console.log('🧮 Calculating results...');

    // Prepare player data with cash outs
    const playerData = players.map((p) => ({
      id: p.id,
      userId: p.user_id,
      name: p.profiles?.username || 'Unknown',
      phone: p.profiles?.phone_number || null,
      rebuys: p.rebuys || 1,
      foodCredit: p.food_credit || 0,
      foodDebt: p.food_debt || 0,
      cashOut: parseFloat(cashOuts[p.id]) || 0,
    }));

    // Calculate balances
    const balances = calculatePlayerBalances(playerData, activeTable.buy_in);
    setPlayerBalances(balances);

    // Validate balances
    const isValid = validateBalances(balances);
    if (!isValid) {
      console.warn('Balance validation failed - proceeding anyway');
    }

    // Optimize transactions
    const optimizedTransactions = optimizeTransactions(balances);
    setTransactions(optimizedTransactions);

    setShowResults(true);
  };

  const handleSaveAndExit = async () => {
    if (!activeTable) return;

    setIsSaving(true);
    try {
      const { success, error } = await saveSettlement(
        activeTable.id,
        playerBalances,
        transactions
      );

      if (success) {
        onNavigate('lobby');
      } else {
        console.error('Save failed:', error);
        // Could show error toast here
      }
    } catch (error) {
      console.error('Save error:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleBack = () => {
    if (showResults) {
      setShowResults(false);
    } else {
      onNavigate('table', tableId);
    }
  };

  if (isLoading || !activeTable) {
    return <Loading text={t('loading')} />;
  }

  const pot = getPot();
  const balanceDiff = totalCashOut - pot;

  return (
    <div className="min-h-screen bg-bg-dark p-4">
      <div className="max-w-md mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-gold hover:text-gold-light transition-colors"
          >
            <ArrowRight size={20} className={isRTL ? '' : 'rotate-180'} />
            <span>{t('back')}</span>
          </button>
        </div>

        {/* Title & Pot Info */}
        <div className="card-gold text-center">
          <h1 className="text-xl font-bold text-gold mb-2">{t('settleTitle')}</h1>
          <div className="text-2xl font-bold text-text-main">{activeTable.name}</div>
          <div className="text-sm text-muted mt-2">
            {t('potSize')}: <span className="text-gold font-bold">₪{pot.toLocaleString()}</span>
          </div>
        </div>

        {/* Show Results or Cash Out Inputs */}
        {showResults ? (
          <TransfersList
            transactions={transactions}
            playerBalances={playerBalances}
            onSaveAndExit={handleSaveAndExit}
            isSaving={isSaving}
          />
        ) : (
          <>
            {/* Cash Out Inputs */}
            <div className="card">
              <CashOutInputs
                players={players}
                cashOuts={cashOuts}
                onCashOutChange={handleCashOutChange}
                buyIn={activeTable.buy_in}
              />
            </div>

            {/* Balance Indicator */}
            <div className={`text-center text-sm ${
              Math.abs(balanceDiff) < 1 ? 'text-success' : 'text-danger'
            }`}>
              סה"כ: ₪{totalCashOut.toLocaleString()} / ₪{pot.toLocaleString()}
              {Math.abs(balanceDiff) > 0.5 && (
                <span className="block">
                  (הפרש: {balanceDiff > 0 ? '+' : ''}₪{balanceDiff.toLocaleString()})
                </span>
              )}
            </div>

            {/* Calculate Button */}
            <Button
              onClick={handleCalculate}
              disabled={Object.keys(cashOuts).length === 0}
              fullWidth
            >
              {t('calculate')}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
