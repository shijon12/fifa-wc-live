import type { Metadata } from 'next';
import './globals.css';
import { LiveRefresh } from '@/components/LiveRefresh';
import { NotificationEngine } from '@/components/NotificationEngine';

export const metadata: Metadata = {
  title: 'The Matchroom',
  description: 'A social live football hub for scores, fantasy, alerts, predictions, stats, and team news.',
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
