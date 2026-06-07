// ==========================================
// Royal Cash - PlayersList Component
// ==========================================

import { useEffect, useState } from 'react';
import { TablePlayer } from '../../types';
import { useTableStore } from '../../stores/tableStore';
import PlayerRow from './PlayerRow';

interface PlayersListProps {
  buyIn: number;
  onRemoveClick: (player: TablePlayer) => void;
  isOwner: boolean;
}

export default function PlayersList({ buyIn, onRemoveClick, isOwner }: PlayersListProps) {
  const { players, lastInteractionTime, sortPaused, setSortPaused } = useTableStore();
  const [sortedPlayers, setSortedPlayers] = useState<TablePlayer[]>([]);

  // Sort players by invested amount (descending)
  useEffect(() => {
    // Re-enable sorting after 3 seconds of no interaction
    if (sortPaused) {
      const timeout = setTimeout(() => {
        if (Date.now() - lastInteractionTime >= 3000) {
          setSortPaused(false);
        }
      }, 3000);
      return () => clearTimeout(timeout);
    }

    // Sort players when not paused
    const sorted = [...players].sort((a, b) => {
      const investedA = (a.rebuys || 1) * buyIn;
      const investedB = (b.rebuys || 1) * buyIn;
      return investedB - investedA;
    });
    setSortedPlayers(sorted);
  }, [players, buyIn, sortPaused, lastInteractionTime, setSortPaused]);

  // Initial sort on mount
  useEffect(() => {
    const sorted = [...players].sort((a, b) => {
      const investedA = (a.rebuys || 1) * buyIn;
      const investedB = (b.rebuys || 1) * buyIn;
      return investedB - investedA;
    });
    setSortedPlayers(sorted);
  }, []);

  if (players.length === 0) {
    return (
      <div className="text-center text-muted py-8">
        אין שחקנים בשולחן
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {sortedPlayers.map((player) => (
        <PlayerRow
          key={player.id}
          player={player}
          buyIn={buyIn}
          onRemoveClick={onRemoveClick}
          isOwner={isOwner}
        />
      ))}
    </div>
  );
}
