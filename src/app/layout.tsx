// src/app/layout.tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import ReduxProvider from '@/components/ReduxProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Fettlemed - Unifying Healthcare',
  description: 'Your comprehensive healthcare ecosystem.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ReduxProvider>
          {children}
        </ReduxProvider>
      </body>
    </html>
  );
}