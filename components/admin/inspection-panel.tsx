'use client'

import { useCallback, useEffect, useState } from 'react'
import { ClipboardCheck, Fuel, Gauge, Loader2, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/lib/contexts/toast-context'
import { formatBRL } from '@/lib/rental'
import {
  compareInspections,
  DAMAGE_AREAS,
  type Damage,
  type ExtraCharge,
  extraTotal,
  fuelLabel,
  type Inspection,
  type InspectionKind,
  KIND_LABEL,
} from '@/lib/inspections'

const field =
  'h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

function Summary({ i }: { i: Inspection }) {
  return (
    <div className="rounded-xl border bg-background/50 p-4 text-sm">
      <p className="font-semibold">{KIND_LABEL[i.kind]}</p>
      <p className="mt-1 flex items-center gap-2 text-muted-foreground">
        <Gauge className="h-4 w-4" aria-hidden /> {i.odometer_km.toLocaleString('pt-BR')} km
        <Fuel className="ml-2 h-4 w-4" aria-hidden /> {fuelLabel(i.fuel_eighths)}
      </p>
      {i.damages.length > 0 ? (
        <ul className="mt-2 list-disc space-y-0.5 pl-5">
          {i.damages.map((d) => (
            <li key={`${d.area}-${d.description}`}>
              <span className="font-medium">{d.area}:</span> {d.description}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-muted-foreground">Sem avarias anotadas.</p>
      )}
      {i.extra_charges.length > 0 && (
        <ul className="mt-2 space-y-0.5">
          {i.extra_charges.map((c) => (
            <li key={c.label} className="flex justify-between gap-3">
              <span>{c.label}</span>
              <span className="tabular font-semibold">{formatBRL(Number(c.amount))}</span>
            </li>
          ))}
        </ul>
      )}
      {i.notes && <p className="mt-2 text-muted-foreground">Obs.: {i.notes}</p>}
    </div>
  )
}

/** Vistoria de retirada e de devolução no detalhe da reserva. Salvar avança o status da reserva. */
export function InspectionPanel({ bookingId, status, onSaved }: { bookingId: string; status: string; onSaved: () => void }) {
  const { showToast } = useToast()
  const [inspections, setInspections] = useState<Inspection[] | null>(null)
  const [loadError, setLoadError] = useState('')
  const [saving, setSaving] = useState(false)
  const [km, setKm] = useState('')
  const [fuel, setFuel] = useState(8)
  const [damages, setDamages] = useState<Damage[]>([])
  const [charges, setCharges] = useState<ExtraCharge[]>([])
  const [notes, setNotes] = useState('')

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/bookings/${bookingId}/inspection`)
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setLoadError(data.error ?? 'Não foi possível carregar a vistoria.')
      setInspections([])
      return
    }
    setLoadError('')
    setInspections(data.inspections)
  }, [bookingId])

  useEffect(() => {
    load()
  }, [load])

  const pickup = inspections?.find((i) => i.kind === 'pickup')
  const ret = inspections?.find((i) => i.kind === 'return')
  const next: InspectionKind | null = !pickup && status === 'confirmed' ? 'pickup' : pickup && !ret && status === 'active' ? 'return' : null

  // A devolução começa com as avarias que já estavam na retirada.
  useEffect(() => {
    if (next === 'return' && pickup) {
      setDamages(pickup.damages)
      setKm(String(pickup.odometer_km))
    }
  }, [next, pickup])

  const preview = next === 'return' && pickup && km !== '' ? compareInspections(pickup, { odometer_km: Number(km), fuel_eighths: fuel, damages }) : null
  const hasFuelCharge = charges.some((c) => c.label.startsWith('Combustível'))

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!next) return
    setSaving(true)
    const res = await fetch(`/api/admin/bookings/${bookingId}/inspection`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: next, odometer_km: km, fuel_eighths: fuel, damages, extra_charges: charges, notes }),
    })
    const data = await res.json().catch(() => ({}))
    setSaving(false)
    if (!res.ok) return showToast(data.error ?? 'Não foi possível salvar a vistoria.', 'error')
    showToast(next === 'pickup' ? 'Retirada registrada. A reserva está em andamento.' : 'Devolução registrada. A reserva foi concluída.', 'success')
    setDamages([])
    setCharges([])
    setNotes('')
    await load()
    onSaved()
  }

  if (inspections === null) {
    return <p className="text-sm text-muted-foreground">Carregando vistoria…</p>
  }

  return (
    <div className="space-y-4">
      {loadError && <p className="text-sm text-destructive">{loadError}</p>}

      {(pickup || ret) && (
        <div className="grid gap-3 md:grid-cols-2">
          {pickup && <Summary i={pickup} />}
          {ret && <Summary i={ret} />}
        </div>
      )}

      {pickup && ret && (() => {
        const c = compareInspections(pickup, ret)
        return (
          <p className="rounded-xl bg-muted p-3 text-sm">
            Rodou <strong>{c.km.toLocaleString('pt-BR')} km</strong>
            {c.missingEighths > 0 ? `, voltou com ${c.missingEighths}/8 a menos de combustível` : ', combustível em dia'}
            {c.newDamages.length > 0 ? `, ${c.newDamages.length} avaria(s) nova(s)` : ', sem avarias novas'}
            . Cobranças extras: <strong>{formatBRL(Number(ret.extra_total))}</strong>.
          </p>
        )
      })()}

      {!next && !pickup && status === 'pending' && (
        <p className="text-sm text-muted-foreground">Aprove a reserva para registrar a vistoria de retirada.</p>
      )}

      {next && (
        <form onSubmit={save} className="space-y-4 rounded-xl border p-4">
          <h3 className="flex items-center gap-2 font-semibold">
            <ClipboardCheck className="h-4 w-4 text-electric" aria-hidden /> Vistoria de {KIND_LABEL[next].toLowerCase()}
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm">
              Quilometragem (km)
              <input className={field} type="number" inputMode="numeric" min={next === 'return' ? pickup?.odometer_km : 0} required value={km} onChange={(e) => setKm(e.target.value)} />
            </label>
            <label className="grid gap-1 text-sm">
              Combustível
              <select className={field} value={fuel} onChange={(e) => setFuel(Number(e.target.value))}>
                {[8, 7, 6, 5, 4, 3, 2, 1, 0].map((n) => (
                  <option key={n} value={n}>
                    {fuelLabel(n)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Avarias</legend>
            {damages.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma avaria anotada.</p>}
            {damages.map((d, idx) => (
              <div key={idx} className="grid gap-2 sm:grid-cols-[1fr_2fr_auto]">
                <select aria-label="Parte do carro" className={field} value={d.area} onChange={(e) => setDamages(damages.map((x, j) => (j === idx ? { ...x, area: e.target.value } : x)))}>
                  {DAMAGE_AREAS.map((a) => (
                    <option key={a}>{a}</option>
                  ))}
                </select>
                <input aria-label="Descrição da avaria" className={field} maxLength={200} required placeholder="Ex.: risco de 10 cm" value={d.description} onChange={(e) => setDamages(damages.map((x, j) => (j === idx ? { ...x, description: e.target.value } : x)))} />
                <Button type="button" variant="ghost" size="icon" aria-label="Remover avaria" onClick={() => setDamages(damages.filter((_, j) => j !== idx))}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => setDamages([...damages, { area: DAMAGE_AREAS[0], description: '' }])}>
              <Plus className="h-4 w-4" /> Anotar avaria
            </Button>
          </fieldset>

          {next === 'return' && (
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Cobranças extras</legend>
              {preview && (
                <p className="text-sm text-muted-foreground">
                  Rodou {preview.km.toLocaleString('pt-BR')} km
                  {preview.missingEighths > 0 ? `; faltam ${preview.missingEighths}/8 do tanque (sugestão: ${formatBRL(preview.suggestedFuelCharge)})` : '; combustível em dia'}
                  {preview.newDamages.length > 0 ? `; ${preview.newDamages.length} avaria(s) nova(s)` : ''}.
                </p>
              )}
              {preview && preview.missingEighths > 0 && !hasFuelCharge && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCharges([...charges, { label: `Combustível (${preview.missingEighths}/8 do tanque)`, amount: preview.suggestedFuelCharge }])}
                >
                  <Fuel className="h-4 w-4" /> Cobrar combustível ({formatBRL(preview.suggestedFuelCharge)})
                </Button>
              )}
              {charges.map((c, idx) => (
                <div key={idx} className="grid gap-2 sm:grid-cols-[2fr_1fr_auto]">
                  <input aria-label="O que está sendo cobrado" className={field} maxLength={80} required value={c.label} onChange={(e) => setCharges(charges.map((x, j) => (j === idx ? { ...x, label: e.target.value } : x)))} />
                  <input aria-label="Valor" className={field} type="number" min={0.01} step={0.01} required value={c.amount} onChange={(e) => setCharges(charges.map((x, j) => (j === idx ? { ...x, amount: Number(e.target.value) } : x)))} />
                  <Button type="button" variant="ghost" size="icon" aria-label="Remover cobrança" onClick={() => setCharges(charges.filter((_, j) => j !== idx))}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setCharges([...charges, { label: '', amount: 0 }])}>
                  <Plus className="h-4 w-4" /> Outra cobrança
                </Button>
                {charges.length > 0 && <span className="text-sm">Total extra: <strong className="tabular">{formatBRL(extraTotal(charges))}</strong></span>}
              </div>
            </fieldset>
          )}

          <label className="grid gap-1 text-sm">
            Observações (opcional)
            <textarea className={`${field} h-20 py-2`} maxLength={1000} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>

          <Button type="submit" variant="brand" disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {next === 'pickup' ? 'Registrar retirada' : 'Registrar devolução e concluir'}
          </Button>
        </form>
      )}
    </div>
  )
}
