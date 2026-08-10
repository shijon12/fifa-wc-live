import { readFile } from 'node:fs/promises';

const files = {
  fantasy: await readFile(new URL('../components/FantasyLeagueGame.tsx', import.meta.url), 'utf8'),
  nav: await readFile(new URL('../components/SiteNav.tsx', import.meta.url), 'utf8'),
  gameweek: await readFile(new URL('../components/FantasyGameweekManager.tsx', import.meta.url), 'utf8'),
  leagues: await readFile(new URL('../components/PrivateLeaguesManager.tsx', import.meta.url), 'utf8'),
  chat: await readFile(new URL('../components/PrivateLeagueChat.tsx', import.meta.url), 'utf8'),
  agent: await readFile(new URL('../components/PrivateLeagueAgent.tsx', import.meta.url), 'utf8'),
};

const checks = [
  ['Fantasy root constrains child width', files.fantasy.includes('min-w-0 space-y-5')],
  ['Squad controls use a two-row mobile card', files.fantasy.includes('grid-cols-[minmax(0,1fr)_auto]') && files.fantasy.includes('col-span-2 grid grid-cols-2')],
  ['Player-list nested scrolling starts only on laptop', files.fantasy.includes('lg:max-h-[700px] lg:overflow-y-auto')],
  ['Mobile player list is paginated', files.fantasy.includes('playerLimit') && files.fantasy.includes('Show 36 more players')],
  ['Fantasy tab labels cannot widen the viewport', files.fantasy.includes('block truncate text-sm font-black')],
  ['Primary navigation can shrink and truncate', files.nav.includes('min-w-0 truncate rounded-full')],
  ['Navigation keeps the activation journey primary', files.nav.includes("label: 'Fantasy'") && files.nav.includes("label: 'Rooms'") && files.nav.includes("label: 'Matches'")],
  ['Secondary navigation is grouped under More', files.nav.includes('function MoreMenu') && files.nav.includes('<summary')],
  ['Gameweek panel clips visual overflow', files.gameweek.includes('min-w-0 overflow-hidden')],
  ['Private league cards constrain overflow', files.leagues.includes('min-w-0 overflow-hidden rounded-2xl')],
  ['Private leaderboards refresh while visible', files.leagues.includes('refreshVisibleLeaderboards') && files.leagues.includes('10_000') && files.leagues.includes("cache: 'no-store'")],
  ['Private chat header stacks on phones', files.chat.includes('flex-col items-stretch')],
  ['Private agent header stacks on phones', files.agent.includes('flex-col items-stretch')],
];

for (const [name, passed] of checks) console.log(`${passed ? 'PASS' : 'FAIL'} ${name}`);
if (checks.some(([, passed]) => !passed)) process.exitCode = 1;
