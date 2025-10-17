import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { NhostProvider } from '@nhost/nextjs'
import { nhost } from '@/lib/nhost/client'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Rental Car',
  description: 'Sistema de locadora de veículos',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        <NhostProvider nhost={nhost}>
          {children}
        </NhostProvider>
      </body>
    </html>
  )
}