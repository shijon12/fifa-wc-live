import type { Metadata } from 'next';
import './globals.css';
import { LiveRefresh } from '@/components/LiveRefresh';
import { NotificationEngine } from '@/components/NotificationEngine';

export const metadata: Metadata = {
  title: 'World Cup 2026 Live',
  description: 'Live World Cup scores, fixtures, standings, and team profiles.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <LiveRefresh />
        <NotificationEngine />
        {children}
      </body>
    </html>
  );
}
