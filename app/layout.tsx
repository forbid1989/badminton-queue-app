import type { Metadata, Viewport  } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Queue Maestro - Professional Racket Sports Court Management',
  description: 'Efficiently manage court queues and player rotations for badminton, tennis, pickleball, and other racket sports. Real-time drag-and-drop interface with skill-based tracking and payment management for sports facilities.',
  keywords: ['racket sports', 'court management', 'queue system', 'badminton', 'tennis', 'pickleball', 'sports facility', 'player tracking', 'racket', 'table tennis'],
  authors: [{ name: 'Queue Maestro Team' }],
  openGraph: {
    title: 'Queue Maestro - Racket Sports Court Management',
    description: 'Professional queue management system for badminton, tennis, pickleball, and racket sports courts',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Queue Maestro',
    description: 'Professional racket sports court management system',
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: [
      { url: '/logos/brown_logo/favicon.ico' },
      { url: '/logos/brown_logo/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/logos/brown_logo/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: [
      { url: '/logos/brown_logo/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  manifest: '/manifest.json',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#273245',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}