import Link from 'next/link'
import { adminGraphql } from '@/lib/auth/authorization'
import { BookingSearch } from '@/components/client/booking-search'
import { VehicleCard, type CatalogVehicle } from '@/components/client/vehicle-card'
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  formatShortDate,
  parseRange,
  pluralDays,
  type DateRange,
} from '@/lib/rental'

type SearchParams = { retirada?: string; devolucao?: string; categoria?: string }

async function getCatalog(range: DateRange | null) {
  // Consulta no servidor: o catálogo e as datas ocupadas (sem dados de clientes).
  const data = await adminGraphql<{
    vehicles: CatalogVehicle[]
    bookings: { vehicle_id: string }[]
  }>(
    `query Catalog($start: date!, $end: date!, $withRange: Boolean!) {
      vehicles(where: { status: { _neq: "maintenance" } }, order_by: { daily_rate: asc }) {
        id brand model year category daily_rate image_url images
        passengers transmission fuel_type air_conditioning
      }
      bookings(where: {
        status: { _in: ["pending", "confirmed", "active"] }
        start_date: { _lt: $end }
        end_date: { _gt: $start }
      }) @include(if: $withRange) { vehicle_id }
    }`,
    {
      start: range?.start ?? '1970-01-01',
      end: range?.end ?? '1970-01-02',
      withRange: Boolean(range),
    },
  )
  return {
    vehicles: data.vehicles ?? [],
    busy: new Set((data.bookings ?? []).map((b) => b.vehicle_id)),
  }
}

export default async function HomePage({ searchParams }: { searchParams: SearchParams }) {
  const range = parseRange(searchParams.retirada, searchParams.devolucao)
  const category = searchParams.categoria && CATEGORY_LABELS[searchParams.categoria] ? searchParams.categoria : undefined

  let catalog: Awaited<ReturnType<typeof getCatalog>> | null = null
  try {
    catalog = await getCatalog(range)
  } catch (error) {
    console.error('[home] catálogo:', error)
  }

  const all = catalog?.vehicles ?? []
  const vehicles = category ? all.filter((v) => v.category === category) : all
  const categories = CATEGORY_ORDER.filter((c) => all.some((v) => v.category === c))

  const linkFor = (cat?: string) => {
    const p = new URLSearchParams()
    if (range) { p.set('retirada', range.start); p.set('devolucao', range.end) }
    if (cat) p.set('categoria', cat)
    const qs = p.toString()
    return `/${qs ? `?${qs}` : ''}#carros`
  }

  return (
    <main>
      <section className="relative bg-asphalt text-asphalt-foreground">
        <div className="container pt-14 pb-20 md:pt-20 md:pb-24">
          <h1 className="max-w-3xl text-4xl md:text-6xl font-bold leading-[1.05] text-balance">
            Escolha as datas e veja quanto custa o aluguel inteiro.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-asphalt-foreground/75">
            Sem surpresa no balcão: cada carro mostra o valor total do período antes de você reservar.
          </p>
          <div className="mt-10 max-w-3xl">
            <BookingSearch initialStart={range?.start} initialEnd={range?.end} category={category} />
          </div>
        </div>
        {/* Faixa central da estrada: o elemento marcante da página */}
        <div className="absolute inset-x-0 bottom-6 h-1.5 lane-dashes" aria-hidden />
      </section>

      <section id="carros" className="container scroll-mt-20 py-12">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-3xl font-bold">
              {range ? `${formatShortDate(range.start)} a ${formatShortDate(range.end)}` : 'Nossa frota'}
            </h2>
            <p className="mt-1 text-muted-foreground">
              {range
                ? `${pluralDays(range.days)}. Os valores abaixo já são o total do período.`
                : 'Escolha as datas acima para ver o valor total de cada carro.'}
            </p>
          </div>

          {categories.length > 1 && (
            <nav aria-label="Categorias" className="flex flex-wrap gap-2">
              {[undefined, ...categories].map((cat) => {
                const active = cat === category
                return (
                  <Link
                    key={cat ?? 'todos'}
                    href={linkFor(cat)}
                    scroll={false}
                    aria-current={active ? 'page' : undefined}
                    className={`rounded-md border px-3 py-1.5 text-sm font-medium ${
                      active ? 'border-primary bg-primary text-primary-foreground' : 'hover:border-foreground/40'
                    }`}
                  >
                    {cat ? CATEGORY_LABELS[cat] : 'Todos'}
                  </Link>
                )
              })}
            </nav>
          )}
        </div>

        {catalog === null ? (
          <p className="mt-10 rounded-lg border p-6 text-muted-foreground">
            Não foi possível carregar os carros agora. Atualize a página em alguns instantes.
          </p>
        ) : vehicles.length === 0 ? (
          <div className="mt-10 rounded-lg border p-6">
            <p className="font-medium">Nenhum carro nesta categoria.</p>
            <Link href={linkFor()} className="mt-2 inline-block text-primary hover:underline">Ver todos os carros</Link>
          </div>
        ) : (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {vehicles.map((v) => (
              <VehicleCard key={v.id} vehicle={v} range={range} unavailable={catalog!.busy.has(v.id)} />
            ))}
          </div>
        )}
      </section>

      <section className="border-t bg-muted/60">
        <div className="container grid gap-8 py-12 md:grid-cols-3">
          {[
            ['Escolha as datas', 'Informe quando quer retirar e devolver. A busca mostra só o que está livre no período.'],
            ['Compare o total', 'Cada carro aparece com o valor do aluguel inteiro, não só a diária.'],
            ['Reserve e retire', 'Confirme online com sua conta e acompanhe tudo em Minhas reservas.'],
          ].map(([title, text], i) => (
            <div key={title} className="flex gap-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary font-bold text-primary-foreground">
                {i + 1}
              </span>
              <div>
                <h3 className="font-bold">{title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
