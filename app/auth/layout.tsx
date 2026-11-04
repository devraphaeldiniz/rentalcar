import type { Metadata } from 'next'

// Páginas de conta: título próprio e fora dos resultados de busca.
export const metadata: Metadata = {
  title: 'Entrar ou criar conta',
  robots: { index: false, follow: false },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
