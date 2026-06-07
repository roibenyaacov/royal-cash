// ==========================================
// Royal Cash - StatsPage Component
// ==========================================

import { useState, useEffect } from 'react';
import { ArrowRight, TrendingUp, TrendingDown, Trophy, Activity } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';
import { useAuthStore } from '../stores/authStore';
import { ViewType, GameResult } from '../types';
import { supabase } from '../config/supabase';
import { Loading } from '../components/common/Loading';

interface StatsPageProps {
  onNavigate: (view: ViewType) => void;
}

interface UserStats {
  totalProfit: number;
  gamesPlayed: number;
  avgPerGame: number;
  biggestWin: number;
  biggestLoss: number;
  winRate: number;
}

export default function StatsPage({ onNavigate }: StatsPageProps) {
  const { t, isRTL } = useTranslation();
  const { user, profile } = useAuthStore();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [recentGames, setRecentGames] = useState<GameResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      if (!user) return;

      setIsLoading(true);
      try {
        // Get all game results for this user
        const { data: results, error } = await supabase
          .from('game_results')
          .select('*')
          .eq('user_id', user.id)
          .order('game_date', { ascending: false });

        if (error) {
          console.error('Error loading stats:', error);
          return;
        }

        if (results && results.length > 0) {
          // Calculate stats
          const profits = results.map((r) => r.net_profit);
          const totalProfit = profits.reduce((sum, p) => sum + p, 0);
          const gamesPlayed = results.length;
          const avgPerGame = totalProfit / gamesPlayed;
          const biggestWin = Math.max(...profits, 0);
          const biggestLoss = Math.min(...profits, 0);
          const wins = profits.filter((p) => p > 0).length;
          const winRate = (wins / gamesPlayed) * 100;

          setStats({
            totalProfit,
            gamesPlayed,
            avgPerGame,
            biggestWin,
            biggestLoss,
            winRate,
          });

          setRecentGames(results.slice(0, 10) as GameResult[]);
        } else {
          // Use profile data if no game results
          setStats({
            totalProfit: profile?.total_profit || 0,
            gamesPlayed: profile?.games_played || 0,
            avgPerGame: profile?.games_played
              ? (profile?.total_profit || 0) / profile.games_played
              : 0,
            biggestWin: 0,
            biggestLoss: 0,
            winRate: 0,
          });
        }
      } catch (error) {
        console.error('Error loading stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadStats();
  }, [user, profile]);

  const handleBack = () => {
    onNavigate('lobby');
  };

  if (isLoading) {
    return <Loading text={t('loading')} />;
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('he-IL', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    });
  };

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

        {/* Title */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gold">{t('myStatsTitle')}</h1>
          <p className="text-muted">{profile?.username}</p>
        </div>

        {/* Main Stats Card */}
        <div className="card-gold">
          <div className="text-center mb-4">
            <div className="text-sm text-muted">{t('totalProfitLoss')}</div>
            <div
              className={`text-4xl font-bold ${
                (stats?.totalProfit || 0) >= 0 ? 'text-success' : 'text-danger'
              }`}
            >
              {(stats?.totalProfit || 0) >= 0 ? '+' : ''}₪
              {Math.round(stats?.totalProfit || 0).toLocaleString()}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="hof-stat">
              <Activity size={16} className="text-gold mb-1" />
              <div className="text-2xl font-bold text-text-main">
                {stats?.gamesPlayed || 0}
              </div>
              <div className="text-xs text-muted">{t('gamesPlayed')}</div>
            </div>

            <div className="hof-stat">
              <TrendingUp size={16} className="text-gold mb-1" />
              <div className="text-2xl font-bold text-text-main">
                {Math.round(stats?.winRate || 0)}%
              </div>
              <div className="text-xs text-muted">אחוז ניצחונות</div>
            </div>
          </div>
        </div>

        {/* Additional Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="card text-center">
            <div className="text-sm text-muted mb-1">{t('averagePerGame')}</div>
            <div
              className={`text-xl font-bold ${
                (stats?.avgPerGame || 0) >= 0 ? 'text-success' : 'text-danger'
              }`}
            >
              {(stats?.avgPerGame || 0) >= 0 ? '+' : ''}₪
              {Math.round(stats?.avgPerGame || 0).toLocaleString()}
            </div>
          </div>

          <div className="card text-center">
            <div className="text-sm text-muted mb-1">{t('biggestWin')}</div>
            <div className="text-xl font-bold text-success">
              +₪{Math.round(stats?.biggestWin || 0).toLocaleString()}
            </div>
          </div>

          <div className="card text-center col-span-2">
            <div className="text-sm text-muted mb-1">{t('biggestLoss')}</div>
            <div className="text-xl font-bold text-danger">
              ₪{Math.round(stats?.biggestLoss || 0).toLocaleString()}
            </div>
          </div>
        </div>

        {/* Recent Games */}
        {recentGames.length > 0 && (
          <div className="card">
            <h3 className="text-gold font-bold mb-3">משחקים אחרונים</h3>
            <div className="space-y-2">
              {recentGames.map((game) => (
                <div
                  key={game.id}
                  className="flex justify-between items-center p-2 bg-card-hover rounded-lg"
                >
                  <span className="text-muted text-sm">
                    {formatDate(game.game_date)}
                  </span>
                  <span
                    className={`font-bold ${
                      game.net_profit >= 0 ? 'text-success' : 'text-danger'
                    }`}
                  >
                    {game.net_profit >= 0 ? '+' : ''}₪
                    {Math.round(game.net_profit).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No Data Message */}
        {!stats?.gamesPlayed && (
          <div className="card text-center py-8">
            <Trophy size={48} className="text-muted mx-auto mb-4" />
            <p className="text-muted">{t('noDataYet')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
