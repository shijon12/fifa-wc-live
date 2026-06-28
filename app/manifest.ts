import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'World Cup 2026 Live',
    short_name: 'World Cup Live',
    description: 'Live scores, standings, players, favorites, and match alerts.',
    start_url: '/',
    display: 'standalone',
    background_color: '#07120d',
    theme_color: '#07120d',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/badge.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'monochrome' },
    ],
  };
}
