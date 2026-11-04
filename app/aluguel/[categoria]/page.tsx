import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { adminGraphql } from '@/lib/auth/authorization'
import { PageHero } from '@/components/layout/page-hero'
import { BookingSearch } from '@/components/client/booking-search'
import { VehicleCard, type CatalogVehicle } from '@/components/client/vehicle-card'
import { CATEGORY_LABELS, formatBRL } from '@/lib/rental'
import { CATEGORY_BY_SLUG, CATEGORY_INTRO, CATEGORY_SLUGS, CATEGORY_TITLES } from '@/lib/site'

type Props = { params: Promise<{ categoria: string }> }

async function getVehicles(category: string) {
  const data = await adminGraphql<{ vehicles: CatalogVehicle[] }>(
    `query Cat($category: String!) {
      vehicles(where: { category: { _eq: $category }, status: { _neq: "maintenance" } }, order_by: { daily_rate: asc }) {
        id brand model year category daily_rate image_url images passengers transmission fuel_type air_conditioning
      }
    }`,
    { category },
  )
  return data.vehicles
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { categoria } = await props.params
  const category = CATEGORY_BY_SLUG[categoria]
  if (!category) return { title: 'Categoria não encontrada' }
  return {
    title: CATEGORY_TITLES[category],
    description: `${CATEGORY_INTRO[category]} Compare modelos, veja o valor total do período e reserve online na AstaCar.`,
    alternates: { canonical: `/aluguel/${categoria}` },
  }
}

export default async function CategoryPage(props: Props) {
  const { categoria } = await props.params
  const category = CATEGORY_BY_SLUG[categoria]
  if (!category) notFound()

  const vehicles = await getVehicles(category).catch(() => null)
  const label = CATEGORY_LABELS[category]
  const cheapest = vehicles?.length ? Math.min(...vehicles.map((v) => Number(v.daily_rate))) : null

  return (
    <main>
      <PageHero
        eyebrow="Frota AstaCar"
        title={CATEGORY_TITLES[category]}
        subtitle={`${CATEGORY_INTRO[category]}${cheapest ? ` Diárias a partir de ${formatBRL(cheapest)}.` : ''}`}
      />

      <section className="container -mt-8 relative z-10 max-w-4xl">
        <BookingSearch category={category} />
      </section>

      <section className="container py-14">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <h2 className="text-2xl font-extrabold">
            {vehicles ? `${vehicles.length} ${vehicles.length === 1 ? 'modelo' : 'modelos'} na categoria ${label}` : `Categoria ${label}`}
          </h2>
          <Link href={`/?categoria=${category}#carros`} className="text-sm font-semibold text-electric hover:underline">Ver com datas na busca</Link>
        </div>

        {vehicles === null ? (
          <p className="mt-8 rounded-2xl border p-6 text-muted-foreground">Não foi possível carregar os carros agora.</p>
        ) : (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {vehicles.map((v) => <VehicleCard key={v.id} vehicle={v} range={null} category={category} />)}
          </div>
        )}

        <nav aria-label="Outras categorias" className="mt-14 border-t pt-8">
          <h2 className="text-lg font-bold">Outras categorias</h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {Object.entries(CATEGORY_SLUGS).filter(([k]) => k !== category).map(([k, slug]) => (
              <li key={k}>
                <Link href={`/aluguel/${slug}`} className="inline-block rounded-xl border bg-card px-4 py-2 text-sm hover:border-electric/40">
                  {CATEGORY_LABELS[k]}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </section>
    </main>
  )
}
