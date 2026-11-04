import { cache } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Star } from 'lucide-react'
import { z } from 'zod'
import { adminGraphql } from '@/lib/auth/authorization'
import { VehicleGallery } from '@/components/client/vehicle-gallery'
import { ReserveBox } from '@/components/client/reserve-box'
import { ReviewList } from '@/components/reviews/review-list'
import { TrackVehicleView } from '@/components/analytics/track-view'
import { getBanners } from '@/lib/banners'
import { PromoBanner } from '@/components/client/promo-banner'
import { CATEGORY_LABELS, formatBRL, parseRange } from '@/lib/rental'
import { SITE_URL } from '@/lib/site'

type Vehicle = {
  id: string
  brand: string
  model: string
  year: number
  category: string
  daily_rate: number
  status: string
  description: string | null
  transmission: string | null
  fuel_type: string | null
  passengers: number | null
  doors: number | null
  trunk_capacity: string | null
  air_conditioning: boolean | null
  color: string | null
  features: string[] | null
  images: string[] | null
  image_url: string | null
  image_credits: { author: string; license: string; source: string }[] | null
  average_rating: number | null
  total_reviews: number | null
}

// cache: a página e os metadados usam a mesma consulta, feita uma vez só.
const getVehicle = cache(async (id: string) => {
  if (!z.string().uuid().safeParse(id).success) return null
  const data = await adminGraphql<{ vehicles_by_pk: Vehicle | null }>(
    `query VehicleDetail($id: uuid!) {
      vehicles_by_pk(id: $id) {
        id brand model year category daily_rate status description transmission fuel_type
        passengers doors trunk_capacity air_conditioning color features images image_url image_credits
        average_rating total_reviews
      }
    }`,
    { id },
  )
  const v = data.vehicles_by_pk
  return v && v.status !== 'maintenance' ? v : null
})

export async function generateMetadata(props: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await props.params
  const v = await getVehicle(id).catch(() => null)
  if (!v) return { title: 'Carro não encontrado' }
  const name = `${v.brand} ${v.model} ${v.year}`
  const category = CATEGORY_LABELS[v.category] ?? v.category
  const description = `Alugue ${name} (${category}) a partir de ${formatBRL(Number(v.daily_rate))} por diária. Veja o valor total do período e reserve online na AstaCar.`
  const image = v.images?.[0] || v.image_url
  return {
    title: `Aluguel de ${name}`,
    description,
    alternates: { canonical: `/vehicles/${v.id}` },
    openGraph: { title: `Aluguel de ${name} | AstaCar`, description, images: image ? [{ url: image, alt: name }] : undefined },
  }
}

export default async function VehicleDetailPage(props: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ retirada?: string; devolucao?: string; categoria?: string }>
}) {
  const [params, searchParams] = await Promise.all([props.params, props.searchParams])
  const vehicle = await getVehicle(params.id).catch(() => null)
  if (!vehicle) notFound()

  const range = parseRange(searchParams.retirada, searchParams.devolucao)
  const banners = await getBanners('vehicle_sidebar', 2)
  const name = `${vehicle.brand} ${vehicle.model}`
  const images = vehicle.images?.length ? vehicle.images : vehicle.image_url ? [vehicle.image_url] : []
  const back = new URLSearchParams()
  if (range) { back.set('retirada', range.start); back.set('devolucao', range.end) }
  if (searchParams.categoria && CATEGORY_LABELS[searchParams.categoria]) back.set('categoria', searchParams.categoria)
  const backHref = `/${back.toString() ? `?${back.toString()}` : ''}#carros`

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Car',
    name,
    brand: { '@type': 'Brand', name: vehicle.brand },
    model: vehicle.model,
    vehicleModelDate: String(vehicle.year),
    image: images.slice(0, 3),
    description: vehicle.description ?? undefined,
    vehicleTransmission: vehicle.transmission ?? undefined,
    fuelType: vehicle.fuel_type ?? undefined,
    seatingCapacity: vehicle.passengers ?? undefined,
    url: `${SITE_URL}/vehicles/${vehicle.id}`,
    offers: {
      '@type': 'Offer',
      priceCurrency: 'BRL',
      price: Number(vehicle.daily_rate).toFixed(2),
      priceSpecification: { '@type': 'UnitPriceSpecification', price: Number(vehicle.daily_rate).toFixed(2), priceCurrency: 'BRL', unitText: 'DAY' },
      availability: vehicle.status === 'available' ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    },
    ...(vehicle.total_reviews
      ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: Number(vehicle.average_rating).toFixed(1), reviewCount: vehicle.total_reviews } }
      : {}),
  }

  const specs: [string, string | null][] = [
    ['Categoria', CATEGORY_LABELS[vehicle.category] ?? vehicle.category],
    ['Ano', String(vehicle.year)],
    ['Câmbio', vehicle.transmission],
    ['Combustível', vehicle.fuel_type],
    ['Lugares', vehicle.passengers ? String(vehicle.passengers) : null],
    ['Portas', vehicle.doors ? String(vehicle.doors) : null],
    ['Porta-malas', vehicle.trunk_capacity],
    ['Ar-condicionado', vehicle.air_conditioning === false ? 'Não' : 'Sim'],
    ['Cor', vehicle.color],
  ]

  return (
    <main className="container py-8">
      <TrackVehicleView vehicleId={vehicle.id} category={vehicle.category} dailyRate={Number(vehicle.daily_rate)} />
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: dados estruturados para o Google, gerados no servidor e escapados
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />
      <Link href={backHref} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Voltar para os carros
      </Link>

      {/* No celular, a caixa de reserva vem logo depois das fotos; no desktop, fica fixa à direita. */}
      <div className="mt-4 grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="min-w-0 lg:col-start-1">
          <p className="text-xs font-bold uppercase tracking-widest text-electric">{CATEGORY_LABELS[vehicle.category] ?? vehicle.category} · {vehicle.year}</p>
          <h1 className="mt-1 text-3xl font-extrabold md:text-4xl">{name}</h1>
          {vehicle.total_reviews ? (
            <p className="mt-1 flex items-center gap-1 text-sm">
              <Star className="h-4 w-4 fill-warning text-warning" aria-hidden />
              <span className="font-medium">{Number(vehicle.average_rating).toFixed(1).replace('.', ',')}</span>
              <span className="text-muted-foreground">({vehicle.total_reviews} {vehicle.total_reviews === 1 ? 'avaliação' : 'avaliações'})</span>
            </p>
          ) : null}

          <div className="mt-6">
            <VehicleGallery images={images} name={name} credits={vehicle.images?.length ? vehicle.image_credits ?? [] : []} />
          </div>
        </div>

        <aside className="lg:col-start-2 lg:row-start-1 lg:row-span-2 lg:sticky lg:top-24 lg:self-start">
          <ReserveBox
            vehicleId={vehicle.id}
            dailyRate={Number(vehicle.daily_rate)}
            initialStart={range?.start}
            initialEnd={range?.end}
            available={vehicle.status === 'available'}
          />
          {banners.length > 0 && (
            <div className="mt-4 space-y-4">
              {banners.map((b) => <PromoBanner key={b.id} banner={b} />)}
            </div>
          )}
        </aside>

        <div className="min-w-0 lg:col-start-1">
          {vehicle.description && <p className="max-w-prose text-lg leading-relaxed">{vehicle.description}</p>}

          <section className="mt-8">
            <h2 className="text-xl font-bold">Ficha do carro</h2>
            <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {specs.filter(([, v]) => v).map(([label, value]) => (
                <div key={label} className="rounded-xl border bg-card px-4 py-3">
                  <dt className="text-sm text-muted-foreground">{label}</dt>
                  <dd className="font-semibold">{value}</dd>
                </div>
              ))}
            </dl>
          </section>

          {vehicle.features && vehicle.features.length > 0 && (
            <section className="mt-8">
              <h2 className="text-xl font-bold">Itens do carro</h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                {vehicle.features.map((f) => (
                  <li key={f} className="rounded-lg border bg-muted/50 px-3 py-1.5 text-sm">{f}</li>
                ))}
              </ul>
            </section>
          )}

          <section className="mt-10">
            <h2 className="text-xl font-bold">Avaliações</h2>
            <div className="mt-4">
              <ReviewList vehicleId={vehicle.id} />
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
