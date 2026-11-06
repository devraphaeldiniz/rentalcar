import { VehicleBlocksManager } from '@/components/admin/vehicle-blocks'
import { BLOCK_REASONS, type VehicleBlock, overlaps } from '@/lib/vehicle-blocks'
import { Wrench } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AlertTriangle, ArrowDownToLine, ArrowUpFromLine, Clock } from 'lucide-react'
import { adminGraphql, requireAdmin } from '@/lib/auth/authorization'
import { addDaysIso, BOOKING_STATUS, formatBRL, formatLongDate, todayIso } from '@/lib/rental'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Agenda' }

type Row = {
  id: string
  start_date: string
  end_date: string
  status: string
  total_amount: number
  customer_name: string | null
  customer_email: string | null
  vehicle: { brand: string; model: string; plate: string | null } | null
}

const FIELDS = 'id start_date end_date status total_amount customer_name customer_email vehicle { brand model plate }'
const DAYS = 7

export default async function AgendaPage() {
  // Repetida aqui porque a página também é carregada sozinha na navegação do painel.
  if (!(await requireAdmin())) redirect('/')

  const today = todayIso()
  const until = addDaysIso(today, DAYS - 1)
  const data = await adminGraphql<{ pickups: Row[]; returns: Row[]; overdue: Row[]; pending: Row[] }>(
    `query Agenda($today: date!, $until: date!) {
      pickups: bookings(where: { status: { _in: ["pending", "confirmed"] }, start_date: { _gte: $today, _lte: $until } }, order_by: { start_date: asc }) { ${FIELDS} }
      returns: bookings(where: { status: { _in: ["confirmed", "active"] }, end_date: { _gte: $today, _lte: $until } }, order_by: { end_date: asc }) { ${FIELDS} }
      overdue: bookings(where: { status: { _eq: "active" }, end_date: { _lt: $today } }, order_by: { end_date: asc }) { ${FIELDS} }
      pending: bookings(where: { status: { _eq: "pending" }, start_date: { _lte: $until } }, order_by: { start_date: asc }) { ${FIELDS} }
    }`,
    { today, until },
  ).catch(() => null)

  if (!data) {
    return <div className="p-6 lg:p-8"><h1 className="text-3xl font-bold">Agenda</h1><p className="mt-4 text-muted-foreground">Não foi possível carregar a agenda agora.</p></div>
  }

  // Bloqueios de manutenção na semana. Consulta à parte: sem a migração 014, a agenda continua funcionando.
  const blocksData = await adminGraphql<{ vehicle_blocks: VehicleBlock[]; vehicles: { id: string; brand: string; model: string; plate: string | null }[] }>(
    `query WeekBlocks($today: date!, $after: date!) {
      vehicle_blocks(where: { start_date: { _lt: $after }, end_date: { _gt: $today } }, order_by: { start_date: asc }) { id vehicle_id start_date end_date reason notes created_at }
      vehicles { id brand model plate }
    }`,
    { today, after: addDaysIso(today, DAYS) },
  ).catch(() => ({ vehicle_blocks: [], vehicles: [] }))
  const blockLabel = (b: VehicleBlock) => {
    const v = blocksData.vehicles.find((x) => x.id === b.vehicle_id)
    return v ? `${v.brand} ${v.model}${v.plate ? ` · ${v.plate}` : ''}` : 'Carro'
  }
  const blocksOn = (d: string) => blocksData.vehicle_blocks.filter((b) => overlaps(b.start_date, b.end_date, d, addDaysIso(d, 1)))

  const days = Array.from({ length: DAYS }, (_, i) => addDaysIso(today, i))
  const dayLabel = (d: string) => (d === today ? 'Hoje' : d === addDaysIso(today, 1) ? 'Amanhã' : formatLongDate(d))

  const item = (r: Row, kind: 'pickup' | 'return' | 'overdue') => (
    <li key={`${kind}-${r.id}`}>
      <Link href={`/admin/bookings/${r.id}`} className="flex items-start gap-3 rounded-xl border bg-background/50 p-3 transition-colors hover:border-electric/40">
        {kind === 'pickup' ? (
          <ArrowUpFromLine className="mt-0.5 h-4 w-4 shrink-0 text-electric" aria-label="Retirada" />
        ) : kind === 'return' ? (
          <ArrowDownToLine className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-label="Devolução" />
        ) : (
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-label="Devolução atrasada" />
        )}
        {/* Tudo em coluna: os cards dos dias são estreitos e o texto não pode espremer. */}
        <span className="min-w-0 flex-1 text-sm">
          <span className="block font-semibold">{r.vehicle ? `${r.vehicle.brand} ${r.vehicle.model}` : 'Carro removido'}</span>
          <span className="block truncate text-muted-foreground">
            {r.vehicle?.plate ? `${r.vehicle.plate} · ` : ''}{r.customer_name || r.customer_email || 'Cliente'}
          </span>
          <span className="mt-1 flex flex-wrap items-center justify-between gap-x-3 text-xs text-muted-foreground">
            <span>{BOOKING_STATUS[r.status]?.label ?? r.status}</span>
            <span className="tabular">{formatBRL(Number(r.total_amount))}</span>
          </span>
          {kind === 'overdue' && <span className="block text-xs text-destructive">Devolução prevista para {formatLongDate(r.end_date)}</span>}
        </span>
      </Link>
    </li>
  )

  const summary = [
    { label: 'Retiradas hoje', value: data.pickups.filter((r) => r.start_date === today).length },
    { label: 'Devoluções hoje', value: data.returns.filter((r) => r.end_date === today).length },
    { label: 'Aguardando confirmação', value: data.pending.length },
    { label: 'Devoluções atrasadas', value: data.overdue.length, alert: data.overdue.length > 0 },
  ]

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div>
        <h1 className="text-3xl font-bold">Agenda</h1>
        <p className="text-muted-foreground">Retiradas e devoluções dos próximos {DAYS} dias.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summary.map((s) => (
          <div key={s.label} className={`rounded-2xl border bg-card p-5 ${s.alert ? 'border-destructive/40' : ''}`}>
            <p className="text-sm font-medium text-muted-foreground">{s.label}</p>
            <p className={`tabular mt-2 text-3xl font-black ${s.alert ? 'text-destructive' : ''}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {data.overdue.length > 0 && (
        <section className="rounded-2xl border border-destructive/40 bg-destructive/5 p-5">
          <h2 className="flex items-center gap-2 font-bold text-destructive"><AlertTriangle className="h-4 w-4" aria-hidden /> Devoluções atrasadas</h2>
          <ul className="mt-3 grid gap-2 lg:grid-cols-2">{data.overdue.map((r) => item(r, 'overdue'))}</ul>
        </section>
      )}

      {data.pending.length > 0 && (
        <section className="rounded-2xl border border-warning/40 bg-warning/5 p-5">
          <h2 className="flex items-center gap-2 font-bold text-warning"><Clock className="h-4 w-4" aria-hidden /> Confirme antes da retirada</h2>
          <ul className="mt-3 grid gap-2 lg:grid-cols-2">{data.pending.map((r) => item(r, 'pickup'))}</ul>
        </section>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {days.map((d) => {
          const pickups = data.pickups.filter((r) => r.start_date === d)
          const returns = data.returns.filter((r) => r.end_date === d)
          const blocked = blocksOn(d)
          return (
            <section key={d} className={`rounded-2xl border bg-card p-5 ${d === today ? 'border-electric/50' : ''}`}>
              <h2 className="font-bold">{dayLabel(d)}</h2>
              {blocked.length > 0 && (
                <ul className="mt-3 space-y-1">
                  {blocked.map((b) => (
                    <li key={b.id} className="flex items-center gap-2 rounded-lg bg-muted px-3 py-1.5 text-xs">
                      <Wrench className="h-3.5 w-3.5 shrink-0 text-warning" aria-label="Bloqueado" />
                      <span className="min-w-0 truncate">
                        <span className="font-semibold">{blockLabel(b)}</span> · {BLOCK_REASONS[b.reason] ?? b.reason}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {pickups.length + returns.length === 0 ? (
                blocked.length === 0 && <p className="mt-2 text-sm text-muted-foreground">Nada agendado.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {pickups.map((r) => item(r, 'pickup'))}
                  {returns.map((r) => item(r, 'return'))}
                </ul>
              )}
            </section>
          )
        })}
      </div>

      <VehicleBlocksManager />
    </div>
  )
}
