'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

type Rule = {
  id: string
  kind: 'duration' | 'season'
  name: string
  min_days: number | null
  start_date: string | null
  end_date: string | null
  percent: number
  active: boolean
}

const field = 'h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
const br = (d: string | null) => (d ? d.split('-').reverse().join('/') : '')
const num = (v: string) => Number(v.replace(',', '.'))

export function PricingRulesEditor() {
  const [rules, setRules] = useState<Rule[] | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [dur, setDur] = useState({ name: '', min_days: '', percent: '' })
  const [season, setSeason] = useState({ name: '', start_date: '', end_date: '', percent: '' })

  const load = useCallback(async () => {
    const r = await fetch('/api/admin/pricing-rules')
    const d = await r.json().catch(() => ({}))
    setRules(r.ok ? d.rules : [])
  }, [])
  useEffect(() => { load() }, [load])

  const call = async (method: string, body?: unknown, query = '') => {
    setBusy(true)
    setError('')
    const r = await fetch(`/api/admin/pricing-rules${query}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    })
    const d = await r.json().catch(() => ({}))
    setBusy(false)
    if (!r.ok) { setError(d.error ?? 'Erro ao salvar'); return false }
    await load()
    return true
  }

  const addDuration = async (e: React.FormEvent) => {
    e.preventDefault()
    if (await call('POST', { kind: 'duration', name: dur.name, min_days: num(dur.min_days), percent: num(dur.percent) })) setDur({ name: '', min_days: '', percent: '' })
  }
  const addSeason = async (e: React.FormEvent) => {
    e.preventDefault()
    if (await call('POST', { kind: 'season', name: season.name, start_date: season.start_date, end_date: season.end_date, percent: num(season.percent) }))
      setSeason({ name: '', start_date: '', end_date: '', percent: '' })
  }

  if (rules === null) return <Loader2 className="h-6 w-6 animate-spin text-electric" aria-label="Carregando" />

  const row = (r: Rule, text: string) => (
    <li key={r.id} className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3 ${r.active ? '' : 'opacity-60'}`}>
      <span>
        <span className="font-semibold">{r.name}</span>
        <span className="block text-sm text-muted-foreground">{text}</span>
      </span>
      <span className="flex items-center gap-2">
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input type="checkbox" checked={r.active} disabled={busy} onChange={(e) => call('PATCH', { id: r.id, active: e.target.checked })} className="h-4 w-4 accent-[hsl(var(--electric))]" />
          Ativa
        </label>
        <Button variant="ghost" size="icon" disabled={busy} aria-label={`Excluir ${r.name}`} onClick={() => call('DELETE', undefined, `?id=${r.id}`)}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </span>
    </li>
  )

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <div className="rounded-2xl border bg-card p-5">
        <h3 className="font-bold">Desconto por duração</h3>
        <p className="text-sm text-muted-foreground">Vale o maior desconto que o período alcançar. Não acumulam entre si.</p>
        <ul className="mt-4 space-y-2">
          {rules.filter((r) => r.kind === 'duration').map((r) => row(r, `${Number(r.percent)}% a partir de ${r.min_days} diárias`))}
        </ul>
        <form onSubmit={addDuration} className="mt-4 grid gap-2 sm:grid-cols-[1fr_90px_90px_auto]">
          <input className={field} placeholder="Nome (ex.: Desconto semanal)" value={dur.name} onChange={(e) => setDur({ ...dur, name: e.target.value })} required aria-label="Nome do desconto" />
          <input className={field} inputMode="numeric" placeholder="Diárias" value={dur.min_days} onChange={(e) => setDur({ ...dur, min_days: e.target.value })} required aria-label="A partir de quantas diárias" />
          <input className={field} inputMode="decimal" placeholder="%" value={dur.percent} onChange={(e) => setDur({ ...dur, percent: e.target.value })} required aria-label="Percentual de desconto" />
          <Button type="submit" disabled={busy}>Adicionar</Button>
        </form>
      </div>

      <div className="rounded-2xl border bg-card p-5">
        <h3 className="font-bold">Temporadas e feriados</h3>
        <p className="text-sm text-muted-foreground">Percentual positivo encarece (alta temporada); negativo barateia (baixa temporada).</p>
        <ul className="mt-4 space-y-2">
          {rules.filter((r) => r.kind === 'season').map((r) =>
            row(r, `${Number(r.percent) > 0 ? '+' : ''}${Number(r.percent)}% de ${br(r.start_date)} a ${br(r.end_date)}`),
          )}
        </ul>
        <form onSubmit={addSeason} className="mt-4 grid gap-2 sm:grid-cols-2">
          <input className={`${field} sm:col-span-2`} placeholder="Nome (ex.: Feriado de Tiradentes)" value={season.name} onChange={(e) => setSeason({ ...season, name: e.target.value })} required aria-label="Nome da temporada" />
          <input className={field} type="date" value={season.start_date} onChange={(e) => setSeason({ ...season, start_date: e.target.value })} required aria-label="Início" />
          <input className={field} type="date" value={season.end_date} onChange={(e) => setSeason({ ...season, end_date: e.target.value })} required aria-label="Fim" />
          <input className={field} inputMode="decimal" placeholder="% (ex.: 20 ou -10)" value={season.percent} onChange={(e) => setSeason({ ...season, percent: e.target.value })} required aria-label="Ajuste em percentual" />
          <Button type="submit" disabled={busy}>Adicionar temporada</Button>
        </form>
      </div>
      {error && <p role="alert" className="text-sm text-destructive xl:col-span-2">{error}</p>}
    </div>
  )
}
