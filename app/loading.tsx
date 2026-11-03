// Mostrado na hora pelo Next.js enquanto a página carrega no servidor.
// Usa a faixa da estrada como indicador, no lugar de uma tela em branco.
export default function Loading() {
  return (
    <div className="container py-16" role="status" aria-live="polite">
      <span className="sr-only">Carregando</span>
      <div className="relative h-1.5 w-full max-w-md overflow-hidden rounded-full bg-muted" aria-hidden>
        <div className="lane-dashes absolute inset-y-0 -left-full w-[200%] animate-[lane_1.1s_linear_infinite]" />
      </div>
      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-hidden>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-2xl border bg-card">
            <div className="aspect-[16/10] animate-pulse bg-muted" />
            <div className="space-y-3 p-5">
              <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
              <div className="h-6 w-2/3 animate-pulse rounded bg-muted" />
              <div className="h-8 w-1/2 animate-pulse rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
