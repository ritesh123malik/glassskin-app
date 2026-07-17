import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AdminAuthProvider } from '@/lib/auth';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'GLASSSKIN Admin',
  description: 'Admin dashboard for GLASSSKIN store management',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AdminAuthProvider>{children}</AdminAuthProvider>
      </body>
    </html>
  );
}
