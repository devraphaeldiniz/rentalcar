export default function Loading() {
  return (
    <div className="container py-8" role="status" aria-live="polite">
      <span className="sr-only">Carregando o carro</span>
      <div className="h-4 w-40 animate-pulse rounded bg-muted" aria-hidden />
      <div className="mt-4 grid gap-8 lg:grid-cols-[1fr_380px]" aria-hidden>
        <div>
          <div className="h-10 w-2/3 animate-pulse rounded bg-muted" />
          <div className="mt-6 aspect-[16/10] animate-pulse rounded-lg bg-muted" />
        </div>
        <div className="h-72 animate-pulse rounded-lg bg-muted" />
      </div>
    </div>
  )
}
