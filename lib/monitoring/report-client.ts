'use client'

// Envia um erro do navegador para /api/monitoring/client-error. No máximo alguns por página,
// para um erro em loop não virar centenas de requisições.
let sent = 0
const MAX_PER_PAGE = 5

export function reportClientError(error: unknown, kind: 'render' | 'global' | 'window' | 'promise', digest?: string) {
  if (sent >= MAX_PER_PAGE || typeof window === 'undefined') return
  sent += 1
  const err = error instanceof Error ? error : new Error(typeof error === 'string' ? error : 'Erro desconhecido')
  const body = JSON.stringify({
    message: err.message.slice(0, 1000) || 'Erro sem mensagem',
    stack: err.stack?.slice(0, 5000),
    path: window.location.pathname,
    digest,
    kind,
  })
  try {
    const blob = new Blob([body], { type: 'application/json' })
    if (navigator.sendBeacon?.('/api/monitoring/client-error', blob)) return
  } catch {}
  fetch('/api/monitoring/client-error', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {})
}
