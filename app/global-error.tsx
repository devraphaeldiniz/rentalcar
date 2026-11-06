'use client'

import { useEffect } from 'react'
import { reportClientError } from '@/lib/monitoring/report-client'

// Último recurso: erro no próprio layout. Precisa desenhar o <html> inteiro, sem os componentes do site.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    if (!error.digest) reportClientError(error, 'global')
  }, [error])

  return (
    <html lang="pt-BR">
      <body style={{ margin: 0, minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#0b1220', color: '#e5edf7', fontFamily: 'system-ui, sans-serif' }}>
        <main style={{ maxWidth: 420, padding: 24 }}>
          <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: '#00c2e0' }}>Algo deu errado</p>
          <h1 style={{ fontSize: 28, margin: '8px 0 12px' }}>A AstaCar ficou fora do ar por um instante.</h1>
          <p style={{ color: '#9fb0c6', lineHeight: 1.5 }}>Já registramos o problema. Tente carregar de novo.</p>
          <button type="button" onClick={reset} style={{ marginTop: 20, padding: '10px 18px', borderRadius: 10, border: 0, background: '#0a5bff', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
            Tentar de novo
          </button>
        </main>
      </body>
    </html>
  )
}
