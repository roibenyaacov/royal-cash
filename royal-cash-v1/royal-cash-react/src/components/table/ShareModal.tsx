// ==========================================
// Royal Cash - ShareModal Component
// ==========================================

import { useState, useEffect } from 'react';
import { Copy, Check, Link } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { useTranslation } from '../../hooks/useTranslation';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  tableId: string;
  tableName: string;
}

export default function ShareModal({ isOpen, onClose, tableId, tableName }: ShareModalProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState('');

  useEffect(() => {
    if (isOpen) {
      // Generate share URL
      const url = `${window.location.origin}?table=${tableId}`;
      setShareUrl(url);
      setCopied(false);
    }
  }, [isOpen, tableId]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Royal Cash - ${tableName}`,
          text: `הצטרף לשולחן ${tableName}`,
          url: shareUrl,
        });
      } catch (err) {
        // User cancelled or share failed
        console.log('Share cancelled or failed:', err);
      }
    } else {
      handleCopy();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('shareLink')}>
      <div className="space-y-4">
        {/* QR Code Placeholder */}
        <div className="flex justify-center">
          <div className="w-48 h-48 bg-white rounded-lg flex items-center justify-center p-4">
            <div className="text-center">
              <Link size={48} className="text-gray-400 mx-auto mb-2" />
              <div className="text-xs text-gray-500">{t('scanToJoin')}</div>
            </div>
          </div>
        </div>

        {/* Table Name */}
        <div className="text-center text-lg font-bold text-gold">
          {tableName}
        </div>

        {/* URL Display */}
        <div className="bg-black rounded-lg p-3 flex items-center gap-2">
          <input
            type="text"
            value={shareUrl}
            readOnly
            className="flex-1 bg-transparent text-sm text-muted border-none outline-none truncate"
          />
          <button
            onClick={handleCopy}
            className="p-2 hover:bg-card-hover rounded-lg transition-colors"
          >
            {copied ? (
              <Check size={20} className="text-success" />
            ) : (
              <Copy size={20} className="text-muted" />
            )}
          </button>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button onClick={onClose} variant="outline" fullWidth>
            {t('close')}
          </Button>
          <Button onClick={handleShare} fullWidth>
            {'share' in navigator ? t('shareLink') : t('copyLink')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
