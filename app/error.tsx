'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { reportClientError } from '@/lib/monitoring/report-client'

// Captura erros inesperados de qualquer página: em vez de tela branca,
// a pessoa vê o que aconteceu e tem como seguir.
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
    // Com digest, o erro aconteceu no servidor e já foi registrado lá (instrumentation.ts).
    if (!error.digest) reportClientError(error, 'render')
  }, [error])

  return (
    <main className="container flex min-h-[60vh] flex-col items-start justify-center py-16">
      <p className="text-xs font-bold uppercase tracking-widest text-electric">Algo deu errado</p>
      <h1 className="mt-2 text-3xl font-bold">Não foi possível carregar esta página.</h1>
      <p className="mt-3 max-w-md text-muted-foreground">
        Pode ser uma instabilidade momentânea. Tente de novo; se continuar, fale com o atendimento.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button onClick={reset}>Tentar de novo</Button>
        <Button asChild variant="outline"><Link href="/">Ir para o início</Link></Button>
      </div>
    </main>
  )
}
