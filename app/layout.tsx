import type { Metadata } from 'next'
import '../src/index.css'

export const metadata: Metadata = {
  title: 'BoardForge AI - PCB Engineering Command Center',
  description: 'Turn PCB ideas into KiCad-ready projects with custom board generation, DRC/ERC validation, live DigiKey and Mouser sourcing, repair workflows, evidence reports, and manufacturing exports.',
  manifest: '/site.webmanifest',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
    shortcut: ['/favicon.ico'],
  },
  applicationName: 'BoardForge AI',
  appleWebApp: {
    title: 'BoardForge AI',
    capable: true,
    statusBarStyle: 'black-translucent',
  },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: '#020617' }}>{children}</body>
    </html>
  )
}
