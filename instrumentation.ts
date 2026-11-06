import type { Instrumentation } from 'next'

// Erros não tratados em páginas, rotas de API e server actions caem aqui (Next.js 15).
export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return
  const { recordError } = await import('@/lib/monitoring/errors')
  const err = error as Error & { digest?: string }
  await recordError({
    source: 'server',
    message: err?.message ?? String(error),
    digest: err?.digest,
    stack: err?.stack,
    path: request.path,
    method: request.method,
    route: context.routePath,
    userAgent: typeof request.headers['user-agent'] === 'string' ? request.headers['user-agent'] : null,
  })
}
