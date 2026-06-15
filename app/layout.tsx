import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'BIS Saarthi — One search. Every standard.',
  description:
    'BIS Saarthi is a single-page tool for BIS certification consultants. Search any IS number to instantly get standard details, PDF pricing, and recognized testing labs — all in one place.',
  keywords: 'BIS, IS standard, Indian Standard, QCO, NABL labs, BSB Edge, certification',
  openGraph: {
    title: 'BIS Saarthi — One search. Every standard.',
    description: 'Instantly look up any IS number across 3 government portals.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
