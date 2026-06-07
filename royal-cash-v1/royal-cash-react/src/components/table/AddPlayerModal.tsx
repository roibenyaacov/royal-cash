// ==========================================
// Royal Cash - AddPlayerModal Component
// ==========================================

import { useState, useEffect } from 'react';
import { Search, UserPlus, X } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { useTranslation } from '../../hooks/useTranslation';
import { useTableStore } from '../../stores/tableStore';
import { Profile, TablePlayer } from '../../types';
import { supabase } from '../../config/supabase';
import { addPlayer } from '../../services/playerService';

interface AddPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  tableId: string;
}

export default function AddPlayerModal({ isOpen, onClose, tableId }: AddPlayerModalProps) {
  const { t } = useTranslation();
  const { players, addPlayer: addPlayerToStore } = useTableStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState('');

  // Get IDs of players already in the table
  const existingPlayerIds = players.map((p) => p.user_id);

  // Search for users
  useEffect(() => {
    const searchUsers = async () => {
      if (searchTerm.length < 2) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      setError('');

      try {
        const { data, error: searchError } = await supabase
          .from('profiles')
          .select('id, username, phone_number')
          .ilike('username', `%${searchTerm}%`)
          .limit(10);

        if (searchError) {
          console.error('Search error:', searchError);
          setError(t('error'));
          return;
        }

        // Filter out players already in the table and map to Profile type
        const filteredResults = (data || [])
          .filter((user) => !existingPlayerIds.includes(user.id))
          .map((user) => ({
            ...user,
            created_at: '',
          })) as Profile[];

        setSearchResults(filteredResults);
      } catch (err) {
        console.error('Search error:', err);
        setError(t('error'));
      } finally {
        setIsSearching(false);
      }
    };

    const debounce = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounce);
  }, [searchTerm, existingPlayerIds, t]);

  const handleAddPlayer = async (user: Profile) => {
    setIsAdding(true);
    setError('');

    try {
      const { player, error: addError } = await addPlayer(tableId, user.id);

      if (addError) {
        if (addError.message === 'Player already in table') {
          setError(t('playerAlreadyInTable'));
        } else {
          setError(t('errorAddingPlayer'));
        }
        return;
      }

      if (player) {
        // Add profile info to player
        const playerWithProfile: TablePlayer = {
          ...player,
          profiles: {
            id: user.id,
            username: user.username,
            phone_number: user.phone_number,
            created_at: '',
          },
        };
        addPlayerToStore(playerWithProfile);

        // Remove from search results
        setSearchResults((prev) => prev.filter((u) => u.id !== user.id));
        setSearchTerm('');
        onClose();
      }
    } catch (err) {
      console.error('Add player error:', err);
      setError(t('errorAddingPlayer'));
    } finally {
      setIsAdding(false);
    }
  };

  const handleClose = () => {
    setSearchTerm('');
    setSearchResults([]);
    setError('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={t('add') + ' ' + t('player')}>
      <div className="space-y-4">
        {/* Search Input */}
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
            size={20}
          />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t('playerName')}
            className="w-full pl-10 pr-4 py-3 bg-black border border-gray-700 rounded-lg text-white"
            autoFocus
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="text-danger text-sm text-center">{error}</div>
        )}

        {/* Search Results */}
        <div className="max-h-64 overflow-y-auto">
          {isSearching ? (
            <div className="text-center text-muted py-4">{t('loading')}</div>
          ) : searchResults.length > 0 ? (
            <div className="space-y-2">
              {searchResults.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-3 bg-card-hover rounded-lg hover:bg-opacity-80 transition-colors"
                >
                  <div>
                    <div className="font-medium text-text-main">
                      {user.username}
                    </div>
                    {user.phone_number && (
                      <div className="text-sm text-muted">
                        {user.phone_number}
                      </div>
                    )}
                  </div>
                  <Button
                    onClick={() => handleAddPlayer(user)}
                    disabled={isAdding}
                    variant="outline"
                    size="sm"
                    className="!w-auto !py-2"
                    fullWidth={false}
                  >
                    <UserPlus size={16} />
                  </Button>
                </div>
              ))}
            </div>
          ) : searchTerm.length >= 2 ? (
            <div className="text-center text-muted py-4">
              {t('userNotFound')}
            </div>
          ) : (
            <div className="text-center text-muted py-4 text-sm">
              הקלד לפחות 2 תווים לחיפוש
            </div>
          )}
        </div>

        {/* Cancel Button */}
        <Button onClick={handleClose} variant="outline" fullWidth>
          {t('cancel')}
        </Button>
      </div>
    </Modal>
  );
}
