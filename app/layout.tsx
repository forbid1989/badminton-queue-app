import type { Metadata, Viewport  } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter'
})

export const metadata: Metadata = {
  title: 'Queue Maestro - Professional Racket Sports Court Management',
  description: 'Efficiently manage court queues and player rotations for badminton, tennis, pickleball, and other racket sports. Real-time drag-and-drop interface with skill-based tracking and payment management for sports facilities.',
  keywords: ['racket sports', 'court management', 'queue system', 'badminton', 'tennis', 'pickleball', 'sports facility', 'player tracking', 'racket', 'table tennis'],
  authors: [{ name: 'Carl Meyrick Cheng', url: 'https://www.linkedin.com/in/carlmeyrickcheng/' }],
  creator: 'Carl Meyrick Cheng',
  publisher: 'Carl Meyrick Cheng',
  openGraph: {
    title: 'Queue Maestro - Racket Sports Court Management',
    description: 'Professional queue management system for badminton, tennis, pickleball, and racket sports courts',
    type: 'website',
    locale: 'en_US',
    url: 'https://queuemaestrosports.app',
    siteName: 'Queue Maestro',
    images: [
      {
        url: 'https://queuemaestrosports.app/logos/blue_logo/android-chrome-512x512.png',
        width: 512,
        height: 512,
        alt: 'Queue Maestro - Racket Sports Court Management',
      }
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Queue Maestro - Racket Sports Court Management',
    description: 'Professional racket sports court management system',
    images: ['https://queuemaestrosports.app/logos/blue_logo/android-chrome-512x512.png'],
  },
  alternates: {
    canonical: 'https://queuemaestrosports.app',  // 🔥 Canonical URL for SEO
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
      { url: '/logos/blue_logo/favicon.ico' },
      { url: '/logos/blue_logo/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/logos/blue_logo/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: [
      { url: '/logos/blue_logo/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
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
    <html lang="en" className={inter.variable}>
      <body className={inter.className}>{children}</body>
    </html>
  )
}