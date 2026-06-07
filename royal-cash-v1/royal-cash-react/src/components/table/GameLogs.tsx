// ==========================================
// Royal Cash - GameLogs Component
// ==========================================

import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';
import { useTableStore } from '../../stores/tableStore';
import { GameLog } from '../../types';
import { supabase } from '../../config/supabase';

interface GameLogsProps {
  tableId: string;
}

export default function GameLogs({ tableId }: GameLogsProps) {
  const { t } = useTranslation();
  const { gameLogs, setGameLogs } = useTableStore();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Load game logs
  useEffect(() => {
    const loadLogs = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('game_logs')
          .select('*, profiles(username)')
          .eq('table_id', tableId)
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) {
          console.error('Error loading logs:', error);
          return;
        }

        setGameLogs(data as GameLog[]);
      } catch (err) {
        console.error('Error loading logs:', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (isExpanded && gameLogs.length === 0) {
      loadLogs();
    }
  }, [tableId, isExpanded, gameLogs.length, setGameLogs]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!isExpanded) return;

    const channel = supabase
      .channel(`game_logs_${tableId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'game_logs',
          filter: `table_id=eq.${tableId}`,
        },
        async (payload) => {
          // Fetch the new log with profile info
          const { data } = await supabase
            .from('game_logs')
            .select('*, profiles(username)')
            .eq('id', payload.new.id)
            .single();

          if (data) {
            setGameLogs([data as GameLog, ...gameLogs]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tableId, isExpanded, gameLogs, setGameLogs]);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('he-IL', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="card">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between text-gold font-bold"
      >
        <span>
          {t('emojiActivity')} {t('gameActivity')}
        </span>
        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="mt-4 max-h-64 overflow-y-auto">
          {isLoading ? (
            <div className="text-center text-muted py-4">{t('loadingLogs')}</div>
          ) : gameLogs.length === 0 ? (
            <div className="text-center text-muted py-4">אין פעילות עדיין</div>
          ) : (
            <div className="space-y-0">
              {gameLogs.map((log) => (
                <div key={log.id} className="game-log-item">
                  <div className="flex justify-between items-start">
                    <div className="text-text-main">{log.action_description || log.action_type}</div>
                    <div className="text-xs text-muted whitespace-nowrap mr-2">
                      {formatTime(log.created_at)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
