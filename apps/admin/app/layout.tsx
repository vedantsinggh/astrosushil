import React from 'react';
import './globals.css';

export const metadata = {
  title: 'Astro Sushil Admin Portal',
  description: 'Management Portal for Astro Sushil Platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
