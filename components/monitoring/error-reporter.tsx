'use client'

import { useEffect } from 'react'
import { reportClientError } from '@/lib/monitoring/report-client'

/** Ouve erros que escapam dos componentes (scripts, promessas sem catch) e manda para o painel. */
export function ErrorReporter() {
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      // Erros de extensões do navegador e scripts de outros domínios não são do site.
      if (event.filename && !event.filename.startsWith(window.location.origin)) return
      if (!event.error && /^Script error\.?$/.test(event.message)) return
      reportClientError(event.error ?? event.message, 'window')
    }
    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason
      // Requisição cancelada de propósito (troca de página, debounce) não é erro.
      if (reason instanceof DOMException && reason.name === 'AbortError') return
      reportClientError(reason, 'promise')
    }
    window.addEventListener('error', onError)
    window.addEventListener('unhandledrejection', onRejection)
    return () => {
      window.removeEventListener('error', onError)
      window.removeEventListener('unhandledrejection', onRejection)
    }
  }, [])
  return null
}
