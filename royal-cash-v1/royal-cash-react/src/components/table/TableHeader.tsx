// ==========================================
// Royal Cash - TableHeader Component
// ==========================================

import { ArrowRight, Trash2, Share2, DollarSign, Utensils } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';
import { Table } from '../../types';

interface TableHeaderProps {
  table: Table;
  pot: number;
  onBack: () => void;
  onDelete: () => void;
  onShare: () => void;
  onFood: () => void;
  onSettle: () => void;
  isOwner: boolean;
}

export default function TableHeader({
  table,
  pot,
  onBack,
  onDelete,
  onShare,
  onFood,
  onSettle,
  isOwner,
}: TableHeaderProps) {
  const { t, isRTL } = useTranslation();

  return (
    <div className="space-y-4">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gold hover:text-gold-light transition-colors"
        >
          <ArrowRight size={20} className={isRTL ? '' : 'rotate-180'} />
          <span>{t('back')}</span>
        </button>

        {isOwner && (
          <button
            onClick={onDelete}
            className="flex items-center gap-2 text-danger hover:text-red-400 transition-colors"
          >
            <Trash2 size={20} />
          </button>
        )}
      </div>

      {/* Table Info Card */}
      <div className="card-gold text-center">
        <h1 className="text-2xl font-bold text-gold mb-2">{table.name}</h1>
        <div className="text-3xl font-bold text-success">
          ₪{pot.toLocaleString()}
        </div>
        <div className="text-sm text-muted">
          {t('pot')} • ₪{table.buy_in.toLocaleString()} {t('entry')}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-4 gap-2">
        <button
          onClick={onFood}
          className="flex flex-col items-center gap-1 p-3 bg-card-bg border border-gray-700 rounded-lg hover:border-gold transition-colors"
        >
          <Utensils size={20} className="text-gold" />
          <span className="text-xs text-muted">{t('weWereHungry').substring(0, 8)}...</span>
        </button>

        <button
          onClick={onShare}
          className="flex flex-col items-center gap-1 p-3 bg-card-bg border border-gray-700 rounded-lg hover:border-gold transition-colors"
        >
          <Share2 size={20} className="text-gold" />
          <span className="text-xs text-muted">{t('shareLink').substring(0, 8)}...</span>
        </button>

        <button
          onClick={onSettle}
          className="flex flex-col items-center gap-1 p-3 bg-gold text-black rounded-lg hover:bg-gold-light transition-colors col-span-2"
        >
          <DollarSign size={20} />
          <span className="text-xs font-bold">{t('settle')}</span>
        </button>
      </div>
    </div>
  );
}
