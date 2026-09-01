import React from 'react';
import './globals.css';
import { AuthProvider } from '../lib/auth-context';
import { AdminGuard } from '../components/AdminGuard';

export const metadata = {
  title: 'Astro Sushil Admin Panel',
  description: 'Operations & Management Dashboard for Astro Sushil Platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <AdminGuard>{children}</AdminGuard>
        </AuthProvider>
      </body>
    </html>
  );
}
