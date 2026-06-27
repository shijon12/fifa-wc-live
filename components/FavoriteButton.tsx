'use client';

import { useEffect, useState } from 'react';
import { readFavorites, writeFavorites, type FavoriteTeam } from '@/lib/favorites';

export function FavoriteButton({ team, compact = false }: { team: FavoriteTeam; compact?: boolean }) {
  const [favorite, setFavorite] = useState(false);

  useEffect(() => {
    const update = () => setFavorite(readFavorites().some((entry) => entry.id === team.id));
    update();
    window.addEventListener('favorites-updated', update);
    return () => window.removeEventListener('favorites-updated', update);
  }, [team.id]);

  function toggle() {
    const favorites = readFavorites();
    writeFavorites(favorite ? favorites.filter((entry) => entry.id !== team.id) : [...favorites, team]);
  }

  return (
    <button type="button" onClick={toggle} aria-pressed={favorite} className={`rounded-full border font-semibold transition ${favorite ? 'border-amber-300/30 bg-amber-300/10 text-amber-200' : 'border-white/10 text-stone-400 hover:border-amber-300/30 hover:text-amber-200'} ${compact ? 'h-9 w-9 text-base' : 'px-4 py-2 text-sm'}`}>
      {favorite ? '★' : '☆'} {!compact && (favorite ? 'Following' : 'Follow team')}
    </button>
  );
}
