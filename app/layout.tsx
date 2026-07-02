import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'BoardForge AI',
  description: 'KiCad-first AI PCB generation cockpit.',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: '#020617' }}>{children}</body>
    </html>
  )
}
