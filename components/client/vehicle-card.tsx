import Link from 'next/link'
import { ArrowRight, Users, Cog, Fuel } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CATEGORY_LABELS, formatBRL, pluralDays, type DateRange } from '@/lib/rental'
import { categoryIcon } from '@/lib/category-icons'

export type CatalogVehicle = {
  id: string
  brand: string
  model: string
  year: number
  category: string
  daily_rate: number
  image_url: string | null
  images: string[] | null
  passengers: number | null
  transmission: string | null
  fuel_type: string | null
  air_conditioning: boolean | null
}

type Props = {
  vehicle: CatalogVehicle
  range: DateRange | null
  unavailable?: boolean
  /** Total do período já com temporada e desconto por duração (calculado no servidor). */
  price?: { total: number; full: number; discountLabel: string | null }
  /** Categoria filtrada na home, para o "voltar" da página do carro manter o filtro. */
  category?: string
}

export function VehicleCard({ vehicle, range, price, unavailable = false, category }: Props) {
  const image = vehicle.images?.[0] || vehicle.image_url
  const name = `${vehicle.brand} ${vehicle.model}`
  const rate = Number(vehicle.daily_rate)
  const query = range ? `?retirada=${range.start}&devolucao=${range.end}` : ''
  const detailQuery = category ? `${query ? `${query}&` : '?'}categoria=${category}` : query
  const detailHref = `/vehicles/${vehicle.id}${detailQuery}`
  const CategoryIcon = categoryIcon(vehicle.category)

  const specs = [
    vehicle.passengers ? { icon: Users, label: `${vehicle.passengers} lugares` } : null,
    vehicle.transmission ? { icon: Cog, label: vehicle.transmission } : null,
    vehicle.fuel_type ? { icon: Fuel, label: vehicle.fuel_type } : null,
  ].filter(Boolean) as { icon: typeof Users; label: string }[]

  return (
    <article
      className={`group flex flex-col overflow-hidden rounded-2xl border bg-card transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-0.5 hover:border-electric/40 hover:shadow-xl hover:shadow-electric/5 ${
        unavailable ? 'opacity-60' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3 p-5 pb-0">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[0.6875rem] font-bold uppercase tracking-wider text-electric">
            <CategoryIcon className="h-3.5 w-3.5" aria-hidden />
            {CATEGORY_LABELS[vehicle.category] ?? vehicle.category}
          </p>
          <h3 className="mt-1 truncate text-xl font-bold">
            <Link href={detailHref} className="transition-colors hover:text-electric">{name}</Link>
          </h3>
          <p className="text-sm text-muted-foreground">Ano {vehicle.year}{vehicle.air_conditioning !== false ? ' · Ar-condicionado' : ''}</p>
        </div>
        {unavailable && (
          <span className="shrink-0 rounded-lg border border-warning/30 bg-warning/10 px-2 py-1 text-xs font-semibold text-warning">
            Reservado
          </span>
        )}
      </div>

      <Link href={detailHref} className="relative mx-5 mt-4 block overflow-hidden rounded-xl bg-muted aspect-[16/10]" tabIndex={-1} aria-hidden>
        {image ? (
          <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">Foto em breve</div>
        )}
      </Link>

      {specs.length > 0 && (
        <ul className="mx-5 mt-4 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
          {specs.map(({ icon: Icon, label }) => (
            <li key={label} className="flex min-w-0 items-center justify-center gap-1.5 rounded-lg border bg-muted/50 px-2 py-1.5">
              <Icon className="h-3.5 w-3.5 shrink-0 text-electric" aria-hidden />
              <span className="truncate">{label}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-5 flex flex-1 items-end justify-between gap-4 border-t bg-muted/30 p-5">
        {range ? (
          <div>
            <p className="text-xs text-muted-foreground">{pluralDays(range.days)} · {formatBRL(rate)}/dia</p>
            {price && price.total < price.full && (
              <p className="tabular text-xs text-muted-foreground line-through">{formatBRL(price.full)}</p>
            )}
            <p className="tabular text-2xl font-black">{formatBRL(price?.total ?? rate * range.days)}</p>
            <p className={`text-xs ${price?.discountLabel ? 'font-medium text-success' : 'text-muted-foreground'}`}>
              {price?.discountLabel ?? 'total do período'}
            </p>
          </div>
        ) : (
          <div>
            <p className="text-xs text-muted-foreground">Diária a partir de</p>
            <p className="tabular text-2xl font-black">
              {formatBRL(rate)}<span className="text-xs font-medium text-muted-foreground">/dia</span>
            </p>
          </div>
        )}

        {unavailable ? (
          <Button asChild variant="outline" size="sm">
            <Link href={detailHref}>Outras datas</Link>
          </Button>
        ) : range ? (
          <Button asChild>
            <Link href={`/vehicles/${vehicle.id}/checkout${query}`}>Reservar <ArrowRight className="h-4 w-4" /></Link>
          </Button>
        ) : (
          <Button asChild variant="outline">
            <Link href={detailHref}>Ver detalhes</Link>
          </Button>
        )}
      </div>
    </article>
  )
}
