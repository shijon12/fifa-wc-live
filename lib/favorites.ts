export type FavoriteTeam = { id: string; name: string; logo: string | null };
export const FAVORITES_KEY = 'world-cup-favorite-teams-v1';

export function readFavorites(): FavoriteTeam[] {
  if (typeof window === 'undefined') return [];
  try {
    const value = JSON.parse(window.localStorage.getItem(FAVORITES_KEY) || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

export function writeFavorites(favorites: FavoriteTeam[]) {
  window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  window.dispatchEvent(new Event('favorites-updated'));
}
