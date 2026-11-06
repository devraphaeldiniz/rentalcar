'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Trash2, Wrench } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/lib/contexts/toast-context'
import { addDaysIso, formatLongDate, todayIso } from '@/lib/rental'
import { BLOCK_REASONS, type BlockReason, type VehicleBlock } from '@/lib/vehicle-blocks'

type Vehicle = { id: string; brand: string; model: string; plate: string | null }

const field =
  'h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

/** Bloquear um carro por período (manutenção, revisão...) e liberar de novo. */
export function VehicleBlocksManager() {
  const router = useRouter()
  const { showToast } = useToast()
  const today = todayIso()
  const [blocks, setBlocks] = useState<VehicleBlock[] | null>(null)
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loadError, setLoadError] = useState('')
  const [busy, setBusy] = useState(false)
  const [removing, setRemoving] = useState<string | null>(null)
  const [form, setForm] = useState({ vehicle_id: '', start_date: today, end_date: addDaysIso(today, 2), reason: 'maintenance' as BlockReason, notes: '' })

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/blocks')
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setLoadError(data.error ?? 'Não foi possível carregar os bloqueios.')
      setBlocks([])
      return
    }
    setLoadError('')
    setBlocks(data.blocks)
    setVehicles(data.vehicles)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const name = (id: string) => {
    const v = vehicles.find((x) => x.id === id)
    return v ? `${v.brand} ${v.model}${v.plate ? ` · ${v.plate}` : ''}` : 'Carro removido'
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.vehicle_id) return showToast('Escolha o carro.', 'error')
    setBusy(true)
    const res = await fetch('/api/admin/blocks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    const data = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) {
      const list = (data.bookings as { start_date: string; end_date: string }[] | undefined)
        ?.map((b) => `${formatLongDate(b.start_date)} a ${formatLongDate(b.end_date)}`)
        .join('; ')
      return showToast(list ? `${data.error} Reservas: ${list}.` : (data.error ?? 'Não foi possível bloquear.'), 'error')
    }
    showToast('Carro bloqueado no período.', 'success')
    setForm((f) => ({ ...f, notes: '' }))
    await load()
    router.refresh()
  }

  const remove = async (id: string) => {
    setRemoving(id)
    const res = await fetch(`/api/admin/blocks?id=${id}`, { method: 'DELETE' })
    setRemoving(null)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      return showToast(data.error ?? 'Não foi possível liberar o carro.', 'error')
    }
    showToast('Carro liberado.', 'success')
    await load()
    router.refresh()
  }

  return (
    <section className="rounded-2xl border bg-card p-5" aria-labelledby="bloqueios-titulo">
      <h2 id="bloqueios-titulo" className="flex items-center gap-2 font-bold">
        <Wrench className="h-4 w-4 text-electric" aria-hidden /> Bloquear carro para manutenção
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        O carro some da busca nesse período e ninguém consegue reservar. Não dá para bloquear em cima de uma reserva ativa.
      </p>

      <form onSubmit={submit} className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-[2fr_1fr_1fr_1fr_auto] xl:items-end">
        <label className="grid gap-1 text-sm">
          Carro
          <select className={field} value={form.vehicle_id} onChange={(e) => setForm({ ...form, vehicle_id: e.target.value })} required>
            <option value="">Escolha…</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.brand} {v.model}
                {v.plate ? ` · ${v.plate}` : ''}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          A partir de
          <input
            type="date"
            className={field}
            min={today}
            value={form.start_date}
            onChange={(e) => {
              const start = e.target.value
              setForm((f) => ({ ...f, start_date: start, end_date: f.end_date <= start ? addDaysIso(start, 1) : f.end_date }))
            }}
            required
          />
        </label>
        <label className="grid gap-1 text-sm">
          Volta a ficar livre em
          <input type="date" className={field} min={addDaysIso(form.start_date || today, 1)} value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} required />
        </label>
        <label className="grid gap-1 text-sm">
          Motivo
          <select className={field} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value as BlockReason })}>
            {Object.entries(BLOCK_REASONS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <Button type="submit" variant="brand" disabled={busy}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} Bloquear
        </Button>
        <label className="grid gap-1 text-sm md:col-span-2 xl:col-span-5">
          Observação (opcional)
          <input className={field} maxLength={500} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Ex.: troca de pastilhas na oficina parceira" />
        </label>
      </form>

      <h3 className="mt-6 text-sm font-semibold">Bloqueios em andamento e futuros</h3>
      {blocks === null ? (
        <p className="mt-2 text-sm text-muted-foreground">Carregando…</p>
      ) : loadError ? (
        <p className="mt-2 text-sm text-destructive">{loadError}</p>
      ) : blocks.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">Nenhum carro bloqueado.</p>
      ) : (
        <ul className="mt-2 divide-y rounded-xl border">
          {blocks.map((b) => (
            <li key={b.id} className="flex flex-wrap items-center justify-between gap-3 p-3 text-sm">
              <span className="min-w-0">
                <span className="block font-semibold">{name(b.vehicle_id)}</span>
                <span className="block text-muted-foreground">
                  {BLOCK_REASONS[b.reason] ?? b.reason} · {formatLongDate(b.start_date)} até {formatLongDate(addDaysIso(b.end_date, -1))}
                  {b.notes ? ` · ${b.notes}` : ''}
                </span>
              </span>
              <Button variant="ghost" size="sm" onClick={() => remove(b.id)} disabled={removing === b.id} aria-label={`Liberar ${name(b.vehicle_id)}`}>
                {removing === b.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Liberar
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
