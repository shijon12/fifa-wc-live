import type { Metadata } from 'next';
import { Suspense } from 'react';
import './globals.css';
import { AnalyticsTracker } from '@/components/AnalyticsTracker';
import { LiveRefresh } from '@/components/LiveRefresh';
import { MobileFeedbackButton } from '@/components/MobileFeedbackButton';
import { NotificationEngine } from '@/components/NotificationEngine';
import { SessionTimeoutGuard } from '@/components/SessionTimeoutGuard';

export const metadata: Metadata = {
  title: 'The Matchroom',
  description: 'A social live football hub for scores, fantasy, alerts, predictions, stats, and team news.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Suspense>
          <AnalyticsTracker />
        </Suspense>
        <LiveRefresh />
        <NotificationEngine />
        <SessionTimeoutGuard />
        {children}
        <MobileFeedbackButton />
      </body>
    </html>
  );
}
