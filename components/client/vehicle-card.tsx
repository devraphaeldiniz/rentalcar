import Link from 'next/link'
import { Users, Cog, Snowflake, Fuel } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CATEGORY_LABELS, formatBRL, pluralDays, type DateRange } from '@/lib/rental'

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
  /** Categoria filtrada na home, para o "voltar" da página do carro manter o filtro. */
  category?: string
}

export function VehicleCard({ vehicle, range, unavailable = false, category }: Props) {
  const image = vehicle.images?.[0] || vehicle.image_url
  const name = `${vehicle.brand} ${vehicle.model}`
  const rate = Number(vehicle.daily_rate)
  const query = range ? `?retirada=${range.start}&devolucao=${range.end}` : ''
  const detailQuery = category ? `${query ? `${query}&` : '?'}categoria=${category}` : query

  const specs = [
    vehicle.passengers ? { icon: Users, label: `${vehicle.passengers} lugares` } : null,
    vehicle.transmission ? { icon: Cog, label: vehicle.transmission } : null,
    vehicle.air_conditioning !== false ? { icon: Snowflake, label: 'Ar-condicionado' } : null,
    vehicle.fuel_type ? { icon: Fuel, label: vehicle.fuel_type } : null,
  ].filter(Boolean) as { icon: typeof Users; label: string }[]

  return (
    <article className={`flex flex-col overflow-hidden rounded-lg border bg-card ${unavailable ? 'opacity-60' : ''}`}>
      <Link href={`/vehicles/${vehicle.id}${detailQuery}`} className="relative block overflow-hidden bg-muted aspect-[16/10]" tabIndex={-1} aria-hidden>
        {image ? (
          <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
            Foto em breve
          </div>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-4 p-5">
        <div>
          <p className="text-sm text-muted-foreground">{CATEGORY_LABELS[vehicle.category] ?? vehicle.category} | {vehicle.year}</p>
          <h3 className="text-xl font-bold">
            <Link href={`/vehicles/${vehicle.id}${detailQuery}`} className="hover:text-primary">{name}</Link>
          </h3>
        </div>

        {specs.length > 0 && (
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {specs.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-1.5">
                <Icon className="h-4 w-4" aria-hidden />
                {label}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-auto flex items-end justify-between gap-4 border-t pt-4">
          {range ? (
            <div>
              <p className="text-sm text-muted-foreground">{pluralDays(range.days)} de {formatBRL(rate)}</p>
              <p className="text-2xl font-bold">
                <span className="bg-lane/30 px-1 -mx-1 rounded-sm">{formatBRL(rate * range.days)}</span>
              </p>
            </div>
          ) : (
            <div>
              <p className="text-2xl font-bold">{formatBRL(rate)}</p>
              <p className="text-sm text-muted-foreground">por diária</p>
            </div>
          )}

          {unavailable ? (
            <p className="text-sm font-medium text-muted-foreground text-right">Reservado nessas datas</p>
          ) : range ? (
            <Button asChild>
              <Link href={`/vehicles/${vehicle.id}/checkout${query}`}>Reservar</Link>
            </Button>
          ) : (
            <Button asChild variant="outline">
              <Link href={`/vehicles/${vehicle.id}`}>Ver detalhes</Link>
            </Button>
          )}
        </div>
      </div>
    </article>
  )
}
