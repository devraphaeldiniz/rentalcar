import Link from 'next/link'
import { adminGraphql } from '@/lib/auth/authorization'
import { BadgeCheck, CalendarRange, Car, ReceiptText, Wallet, XCircle, Zap } from 'lucide-react'
import { BookingSearch } from '@/components/client/booking-search'
import { categoryIcon } from '@/lib/category-icons'
import { getActiveRules, periodPrice } from '@/lib/quote-server'
import { getBanners } from '@/lib/banners'
import { PromoBanner } from '@/components/client/promo-banner'
import { VehicleCard, type CatalogVehicle } from '@/components/client/vehicle-card'
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  formatShortDate,
  parseRange,
  pluralDays,
  type DateRange,
} from '@/lib/rental'

// Diferenciais: só o que o sistema entrega de verdade.
const FEATURES = [
  { icon: ReceiptText, title: 'Valor total na hora', text: 'Cada carro mostra o preço do período inteiro, não só a diária.' },
  { icon: Wallet, title: 'Pague como preferir', text: 'Pix, cartão ou boleto pelo Mercado Pago, ou na retirada do carro.' },
  { icon: CalendarRange, title: 'Só o que está livre', text: 'A busca avisa na hora quais carros já estão reservados nas suas datas.' },
  { icon: XCircle, title: 'Cancele pelo site', text: 'Mudou de plano? Cancele em Minhas reservas, sem ligar para ninguém.' },
]

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

export default async function HomePage(props: { searchParams: Promise<SearchParams> }) {
  const searchParams = await props.searchParams
  const range = parseRange(searchParams.retirada, searchParams.devolucao)
  const category = searchParams.categoria && CATEGORY_LABELS[searchParams.categoria] ? searchParams.categoria : undefined

  let catalog: Awaited<ReturnType<typeof getCatalog>> | null = null
  const [catalogResult, rules, banners] = await Promise.all([
    getCatalog(range).catch((error) => { console.error('[home] catálogo:', error); return null }),
    // Sem a tabela de regras (banco antigo), a vitrine mostra o preço cheio.
    range ? getActiveRules().catch(() => []) : Promise.resolve([]),
    getBanners('home', 1),
  ])
  catalog = catalogResult

  const all = catalog?.vehicles ?? []
  const vehicles = category ? all.filter((v) => v.category === category) : all
  const categories = CATEGORY_ORDER.filter((c) => all.some((v) => v.category === c))
  const countOf = (cat?: string) => (cat ? all.filter((v) => v.category === cat).length : all.length)

  const linkFor = (cat?: string) => {
    const p = new URLSearchParams()
    if (range) { p.set('retirada', range.start); p.set('devolucao', range.end) }
    if (cat) p.set('categoria', cat)
    const qs = p.toString()
    return `/${qs ? `?${qs}` : ''}#carros`
  }

  return (
    <main>
      {/* HERO: sempre escuro, nos dois temas */}
      <section className="relative overflow-hidden bg-asphalt text-asphalt-foreground">
        <div className="bg-dot-grid pointer-events-none absolute inset-0 opacity-40" aria-hidden />
        <div className="pointer-events-none absolute -top-48 left-1/2 h-[420px] w-[820px] -translate-x-1/2 rounded-full bg-[hsl(217_100%_50%/0.22)] blur-[120px]" aria-hidden />
        <div className="container relative pt-14 pb-16 md:pt-20 md:pb-24">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-[hsl(186_100%_50%/0.3)] bg-[hsl(186_100%_50%/0.08)] px-3 py-1 text-xs font-semibold text-[hsl(186_100%_60%)]">
              <Zap className="h-3.5 w-3.5" aria-hidden /> Reserva 100% online, Pix, cartão ou na retirada
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.05] text-white text-balance sm:text-5xl lg:text-6xl">
              A liberdade de ir mais longe com a <span className="text-brand-gradient">AstaCar</span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-lg text-asphalt-foreground/70">
              Escolha as datas e veja o valor total do aluguel de cada carro antes de reservar. Sem surpresa no balcão.
            </p>
          </div>
          <div className="mx-auto mt-10 max-w-4xl">
            <BookingSearch initialStart={range?.start} initialEnd={range?.end} category={category} />
          </div>
          <dl className="mx-auto mt-10 grid max-w-3xl grid-cols-3 gap-4 text-center">
            {[
              [String(all.length || 32), 'carros na frota'],
              [String(categories.length || 8), 'categorias'],
              ['R$ 0', 'cobrado online'],
            ].map(([value, label]) => (
              <div key={label}>
                <dt className="sr-only">{label}</dt>
                <dd className="tabular text-2xl font-black text-white md:text-3xl">{value}</dd>
                <dd className="text-xs text-asphalt-foreground/60 md:text-sm">{label}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* CATÁLOGO */}
      <section id="carros" className="container scroll-mt-20 py-14 md:py-16">
        {banners[0] && <div className="mb-10"><PromoBanner banner={banners[0]} wide /></div>}
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-electric">Frota AstaCar</p>
            <h2 className="mt-1 text-3xl font-extrabold">
              {range ? `${formatShortDate(range.start)} a ${formatShortDate(range.end)}` : 'Escolha o carro para a sua viagem'}
            </h2>
          </div>
          <p className="text-sm text-muted-foreground">
            {range
              ? `${pluralDays(range.days)}. Os valores já são o total do período.`
              : 'Escolha as datas acima para ver o valor total de cada carro.'}
          </p>
        </div>

        {categories.length > 1 && (
          <nav aria-label="Categorias" className="-mx-4 mt-8 flex gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:px-0">
            {[undefined, ...categories].map((cat) => {
              const active = cat === category
              const Icon = cat ? categoryIcon(cat) : Car
              return (
                <Link
                  key={cat ?? 'todos'}
                  href={linkFor(cat)}
                  scroll={false}
                  aria-current={active ? 'page' : undefined}
                  className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl border px-4 py-2.5 text-sm font-medium transition-[box-shadow,border-color] ${
                    active
                      ? 'border-electric bg-electric text-electric-foreground shadow-lg shadow-electric/20'
                      : 'bg-card text-muted-foreground hover:border-electric/40 hover:text-foreground'
                  }`}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                  {cat ? CATEGORY_LABELS[cat] : 'Todos'}
                  <span className={`tabular rounded-full px-2 py-0.5 text-xs ${active ? 'bg-black/15' : 'bg-muted'}`}>{countOf(cat)}</span>
                </Link>
              )
            })}
          </nav>
        )}

        {catalog === null ? (
          <p className="mt-10 rounded-2xl border p-6 text-muted-foreground">
            Não foi possível carregar os carros agora. Atualize a página em alguns instantes.
          </p>
        ) : vehicles.length === 0 ? (
          <div className="mt-10 rounded-2xl border p-6">
            <p className="font-semibold">Nenhum carro nesta categoria.</p>
            <Link href={linkFor()} className="mt-2 inline-block text-electric hover:underline">Ver todos os carros</Link>
          </div>
        ) : (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {vehicles.map((v) => (
              <VehicleCard
                key={v.id}
                vehicle={v}
                range={range}
                price={range ? periodPrice(Number(v.daily_rate), range.start, range.end, rules) : undefined}
                unavailable={catalog!.busy.has(v.id)}
                category={category}
              />
            ))}
          </div>
        )}
      </section>

      {/* DIFERENCIAIS */}
      <section className="border-y bg-muted/40">
        <div className="container py-16 md:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-electric">Por que AstaCar</p>
            <h2 className="mt-1 text-3xl font-extrabold">Transparência do começo ao fim</h2>
            <p className="mt-2 text-muted-foreground">Você sabe quanto vai pagar antes de reservar e acompanha tudo pelo site.</p>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-2xl border bg-card p-6 transition-colors hover:border-electric/40">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-electric/25 bg-electric/10 text-electric">
                  <Icon className="h-6 w-6" aria-hidden />
                </span>
                <h3 className="mt-4 text-lg font-bold">{title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section className="container py-16 md:py-20">
        <div className="grid gap-10 md:grid-cols-[1fr_2fr] md:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-electric">Como funciona</p>
            <h2 className="mt-1 text-3xl font-extrabold">Reserve em três passos</h2>
          </div>
          <ol className="grid gap-6 sm:grid-cols-3">
            {[
              ['Escolha as datas', 'Informe quando quer retirar e devolver o carro.'],
              ['Compare o total', 'Veja o valor do aluguel inteiro de cada modelo livre.'],
              ['Confirme e retire', 'Reserve com sua conta e leve CNH e documento na retirada.'],
            ].map(([title, text], i) => (
              <li key={title} className="relative">
                <span className="bg-brand-gradient flex h-10 w-10 items-center justify-center rounded-xl text-lg font-black text-white shadow-lg shadow-primary/25">
                  {i + 1}
                </span>
                <h3 className="mt-4 font-bold">{title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{text}</p>
              </li>
            ))}
          </ol>
        </div>
        <div className="mt-12 flex flex-col items-start justify-between gap-4 rounded-2xl border bg-card p-6 sm:flex-row sm:items-center md:p-8">
          <div className="flex items-start gap-4">
            <BadgeCheck className="mt-0.5 h-7 w-7 shrink-0 text-success" aria-hidden />
            <div>
              <p className="text-lg font-bold">Crie sua conta em menos de um minuto</p>
              <p className="text-sm text-muted-foreground">Com ela você reserva, acompanha e avalia os carros que alugou.</p>
            </div>
          </div>
          <Link href="/auth/signup" className="bg-brand-gradient inline-flex h-11 shrink-0 items-center rounded-lg px-6 text-sm font-semibold text-white shadow-lg shadow-primary/25 hover:brightness-110">
            Criar minha conta
          </Link>
        </div>
      </section>
    </main>
  )
}
