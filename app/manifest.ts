import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Football Pulse',
    short_name: 'Football Pulse',
    description: 'Live football scores, fantasy, alerts, predictions, stats, and news.',
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
