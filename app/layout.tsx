import type { Metadata } from 'next'
import '../src/index.css'

export const metadata: Metadata = {
  title: 'BoardForge AI',
  description: 'AI PCB engineering command center for KiCad projects, sourcing, validation, repair, and manufacturing exports.',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: '#020617' }}>{children}</body>
    </html>
  )
}
