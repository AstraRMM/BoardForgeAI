import type { Metadata } from 'next'
import '../src/index.css'

export const metadata: Metadata = {
  title: 'BoardForge AI - PCB Engineering Command Center',
  description: 'Turn PCB ideas into KiCad-ready projects with custom board generation, DRC/ERC validation, live DigiKey and Mouser sourcing, repair workflows, evidence reports, and manufacturing exports.',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: '#020617' }}>{children}</body>
    </html>
  )
}
