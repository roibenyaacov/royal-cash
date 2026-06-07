// ==========================================
// Royal Cash - PlayerRow Component
// ==========================================

import { useState, useRef, useEffect } from 'react';
import { Plus, Minus, Trash2 } from 'lucide-react';
import { TablePlayer } from '../../types';
import { useTableStore } from '../../stores/tableStore';
import { updateRebuys } from '../../services/playerService';

interface PlayerRowProps {
  player: TablePlayer;
  buyIn: number;
  onRemoveClick: (player: TablePlayer) => void;
  isOwner: boolean;
}

export default function PlayerRow({ player, buyIn, onRemoveClick, isOwner }: PlayerRowProps) {
  const { updatePlayer, setLastInteractionTime, setSortPaused } = useTableStore();
  const [localRebuys, setLocalRebuys] = useState(player.rebuys);
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync local state when player rebuys change externally
  useEffect(() => {
    if (!isEditing) {
      setLocalRebuys(player.rebuys);
    }
  }, [player.rebuys, isEditing]);

  const playerName = player.profiles?.username || 'Unknown';
  const invested = localRebuys * buyIn;

  // Sync to database with debounce
  const syncToDatabase = async (newRebuys: number) => {
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }

    syncTimeoutRef.current = setTimeout(async () => {
      const { error } = await updateRebuys(player.id, newRebuys);
      if (!error) {
        updatePlayer(player.id, { rebuys: newRebuys });
      }
    }, 500);
  };

  const handleRebuyChange = (delta: number) => {
    const newRebuys = Math.max(1, localRebuys + delta);
    setLocalRebuys(newRebuys);
    setLastInteractionTime(Date.now());
    setSortPaused(true);
    syncToDatabase(newRebuys);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || 1;
    const newRebuys = Math.max(1, value);
    setLocalRebuys(newRebuys);
    setLastInteractionTime(Date.now());
    setSortPaused(true);
    syncToDatabase(newRebuys);
  };

  const handleInputFocus = () => {
    setIsEditing(true);
    inputRef.current?.select();
  };

  const handleInputBlur = () => {
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      inputRef.current?.blur();
    }
  };

  return (
    <div className="player-row group animate-fade-in">
      {/* Player Info */}
      <div className="flex-1 min-w-0">
        <div className="font-bold text-text-main truncate">{playerName}</div>
        <div className="text-sm text-muted">
          ₪{invested.toLocaleString()}
        </div>
      </div>

      {/* Rebuy Controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => handleRebuyChange(-1)}
          disabled={localRebuys <= 1}
          className="rebuy-btn"
          aria-label="Remove rebuy"
        >
          <Minus size={16} />
        </button>

        <input
          ref={inputRef}
          type="number"
          value={localRebuys}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          className="rebuy-input"
          min="1"
        />

        <button
          onClick={() => handleRebuyChange(1)}
          className="rebuy-btn"
          aria-label="Add rebuy"
        >
          <Plus size={16} />
        </button>

        {/* Remove Player Button - only show for owner */}
        {isOwner && (
          <button
            onClick={() => onRemoveClick(player)}
            className="remove-player-btn opacity-0 group-hover:opacity-70 transition-opacity"
            aria-label="Remove player"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
