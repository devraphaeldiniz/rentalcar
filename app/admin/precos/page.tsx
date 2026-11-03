'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatBRL } from '@/lib/rental'

type Extra = {
  id: string
  code: string
  kind: 'protection' | 'addon'
  name: string
  description: string | null
  price: number
  pricing: 'per_day' | 'per_rental'
  max_total: number | null
  is_default: boolean
  active: boolean
}

type Draft = { name: string; description: string; price: string; max_total: string; active: boolean }

const toDraft = (e: Extra): Draft => ({
  name: e.name,
  description: e.description ?? '',
  price: String(Number(e.price)),
  max_total: e.max_total == null ? '' : String(Number(e.max_total)),
  active: e.active,
})

const parseMoney = (v: string) => {
  const n = Number(v.replace(',', '.'))
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : Number.NaN
}

const field = 'h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

export default function PricesPage() {
  const [extras, setExtras] = useState<Extra[] | null>(null)
  const [drafts, setDrafts] = useState<Record<string, Draft>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [message, setMessage] = useState<{ id: string; ok: boolean; text: string } | null>(null)

  const load = useCallback(async () => {
    const r = await fetch('/api/admin/extras')
    const d = await r.json().catch(() => ({}))
    const list: Extra[] = d.extras ?? []
    setExtras(list)
    setDrafts(Object.fromEntries(list.map((e) => [e.id, toDraft(e)])))
  }, [])

  useEffect(() => { load() }, [load])

  const save = async (e: Extra) => {
    const d = drafts[e.id]
    const price = parseMoney(d.price)
    const max = d.max_total.trim() === '' ? null : parseMoney(d.max_total)
    if (Number.isNaN(price) || (max !== null && Number.isNaN(max))) {
      setMessage({ id: e.id, ok: false, text: 'Use apenas números, como 29,90.' })
      return
    }
    setSaving(e.id)
    setMessage(null)
    const r = await fetch('/api/admin/extras', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: e.id, name: d.name, description: d.description || null, price, max_total: max, active: d.active }),
    })
    const res = await r.json().catch(() => ({}))
    setSaving(null)
    setMessage({ id: e.id, ok: r.ok, text: r.ok ? 'Salvo. Vale para as próximas reservas.' : res.error ?? 'Erro ao salvar' })
    if (r.ok) load()
  }

  const set = (id: string, patch: Partial<Draft>) => setDrafts((all) => ({ ...all, [id]: { ...all[id], ...patch } }))

  const groups: [string, Extra['kind'], string][] = [
    ['Proteções', 'protection', 'O cliente escolhe uma. A padrão já vem marcada e não pode ser desativada.'],
    ['Opcionais', 'addon', 'O cliente marca quantos quiser. O teto limita o valor cobrado por reserva.'],
  ]

  return (
    <div className="space-y-8 p-6 lg:p-8">
      <div>
        <h1 className="text-3xl font-bold">Preços e opcionais</h1>
        <p className="text-muted-foreground">Mudanças valem para novas reservas; as já feitas mantêm o valor aceito pelo cliente.</p>
      </div>

      {extras === null ? (
        <Loader2 className="h-6 w-6 animate-spin text-electric" aria-label="Carregando" />
      ) : extras.length === 0 ? (
        <p className="max-w-xl rounded-2xl border p-5 text-muted-foreground">
          Nenhum item encontrado. Se a tabela ainda não existe, rode <code className="text-foreground">npm run db:setup</code>.
        </p>
      ) : (
        groups.map(([title, kind, hint]) => (
          <section key={kind}>
            <h2 className="text-xl font-bold">{title}</h2>
            <p className="text-sm text-muted-foreground">{hint}</p>
            <div className="mt-4 grid gap-4 xl:grid-cols-2">
              {extras.filter((e) => e.kind === kind).map((e) => {
                const d = drafts[e.id]
                if (!d) return null
                return (
                  <div key={e.id} className={`rounded-2xl border bg-card p-5 ${d.active ? '' : 'opacity-70'}`}>
                    <div className="flex items-center justify-between gap-3">
                      <code className="text-xs text-muted-foreground">{e.code}</code>
                      <span className="text-xs text-muted-foreground">
                        {e.pricing === 'per_rental' ? 'valor por reserva' : 'valor por diária'}
                        {e.is_default ? ' · padrão' : ''}
                      </span>
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <label className="grid gap-1 text-sm sm:col-span-2">
                        Nome
                        <input className={field} value={d.name} onChange={(ev) => set(e.id, { name: ev.target.value })} maxLength={80} />
                      </label>
                      <label className="grid gap-1 text-sm sm:col-span-2">
                        Descrição para o cliente
                        <input className={field} value={d.description} onChange={(ev) => set(e.id, { description: ev.target.value })} maxLength={300} />
                      </label>
                      <label className="grid gap-1 text-sm">
                        Preço (R$)
                        <input className={field} inputMode="decimal" value={d.price} onChange={(ev) => set(e.id, { price: ev.target.value })} />
                      </label>
                      {e.pricing === 'per_day' && (
                        <label className="grid gap-1 text-sm">
                          Teto por reserva (R$, opcional)
                          <input className={field} inputMode="decimal" value={d.max_total} placeholder="sem teto" onChange={(ev) => set(e.id, { max_total: ev.target.value })} />
                        </label>
                      )}
                    </div>
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                      <label className={`flex items-center gap-2 text-sm ${e.is_default ? 'opacity-50' : 'cursor-pointer'}`}>
                        <input type="checkbox" checked={d.active} disabled={e.is_default} onChange={(ev) => set(e.id, { active: ev.target.checked })} className="h-4 w-4 accent-[hsl(var(--electric))]" />
                        Disponível para o cliente
                      </label>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground">Atual: {Number(e.price) === 0 ? 'incluída' : formatBRL(Number(e.price))}</span>
                        <Button size="sm" onClick={() => save(e)} disabled={saving === e.id}>
                          {saving === e.id && <Loader2 className="h-4 w-4 animate-spin" />}Salvar
                        </Button>
                      </div>
                    </div>
                    {message?.id === e.id && (
                      <p role="status" className={`mt-3 text-sm ${message.ok ? 'text-success' : 'text-destructive'}`}>{message.text}</p>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        ))
      )}
    </div>
  )
}
