type ResultLike = {
  homeScore: number | null;
  awayScore: number | null;
  status: string;
  round?: string;
  group?: string | null;
  state?: 'pre' | 'in' | 'post';
};

export type WinnerSide = 'home' | 'away' | null;

export function winnerSide(match: ResultLike): WinnerSide {
  const completed = match.state === 'post' || /final|full time/i.test(match.status);
  if (!completed || match.homeScore === null || match.awayScore === null || match.homeScore === match.awayScore) {
    return null;
  }
  return match.homeScore > match.awayScore ? 'home' : 'away';
}

export function isTournamentFinal(match: ResultLike) {
  return !match.group && /^final$/i.test(match.round ?? '');
}

export function winnerEmoji(match: ResultLike, side: WinnerSide) {
  if (!side || side !== winnerSide(match)) return '';
  return isTournamentFinal(match) ? '🏆✨👑' : '🎉';
}
