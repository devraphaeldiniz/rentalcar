'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatBRL } from '@/lib/rental'

type Coupon = {
  id: string
  code: string
  description: string | null
  percent: number | null
  amount: number | null
  min_days: number
  valid_from: string | null
  valid_until: string | null
  max_uses: number | null
  uses: number
  active: boolean
}

const field = 'h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
const br = (d: string | null) => (d ? d.split('-').reverse().join('/') : '')
const empty = { code: '', description: '', type: 'percent', value: '', min_days: '1', valid_from: '', valid_until: '', max_uses: '' }

export function CouponsEditor() {
  const [coupons, setCoupons] = useState<Coupon[] | null>(null)
  const [form, setForm] = useState(empty)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const r = await fetch('/api/admin/coupons')
    const d = await r.json().catch(() => ({}))
    setCoupons(r.ok ? d.coupons : [])
  }, [])
  useEffect(() => { load() }, [load])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    const r = await fetch('/api/admin/coupons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: form.code,
        description: form.description || undefined,
        type: form.type,
        value: Number(form.value.replace(',', '.')),
        min_days: Number(form.min_days) || 1,
        valid_from: form.valid_from || null,
        valid_until: form.valid_until || null,
        max_uses: form.max_uses ? Number(form.max_uses) : null,
      }),
    })
    const d = await r.json().catch(() => ({}))
    setBusy(false)
    if (!r.ok) return setError(d.error ?? 'Erro ao criar o cupom')
    setForm(empty)
    load()
  }

  const toggle = async (c: Coupon) => {
    setBusy(true)
    await fetch('/api/admin/coupons', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: c.id, active: !c.active }) })
    setBusy(false)
    load()
  }

  if (coupons === null) return <Loader2 className="h-6 w-6 animate-spin text-electric" aria-label="Carregando" />

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
      <div className="overflow-x-auto rounded-2xl border bg-card p-5">
        {coupons.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum cupom criado.</p>
        ) : (
          <table className="w-full min-w-[560px] text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr><th className="pb-2 font-semibold">Código</th><th className="pb-2 font-semibold">Desconto</th><th className="pb-2 font-semibold">Regras</th><th className="pb-2 text-right font-semibold">Usos</th><th className="pb-2 text-right font-semibold">Ativo</th></tr>
            </thead>
            <tbody>
              {coupons.map((c) => (
                <tr key={c.id} className={`border-t ${c.active ? '' : 'opacity-60'}`}>
                  <td className="py-3"><code className="font-bold text-electric">{c.code}</code>{c.description && <span className="block text-xs text-muted-foreground">{c.description}</span>}</td>
                  <td className="py-3">{c.percent != null ? `${Number(c.percent)}%` : formatBRL(Number(c.amount))}</td>
                  <td className="py-3 text-xs text-muted-foreground">
                    {c.min_days > 1 && <span className="block">A partir de {c.min_days} diárias</span>}
                    {(c.valid_from || c.valid_until) && <span className="block">{c.valid_from ? `De ${br(c.valid_from)} ` : ''}{c.valid_until ? `até ${br(c.valid_until)}` : ''}</span>}
                    {c.min_days <= 1 && !c.valid_from && !c.valid_until && 'Sem restrições'}
                  </td>
                  <td className="tabular py-3 text-right">{c.uses}{c.max_uses ? ` / ${c.max_uses}` : ''}</td>
                  <td className="py-3 text-right">
                    <input type="checkbox" checked={c.active} disabled={busy} onChange={() => toggle(c)} aria-label={`Cupom ${c.code} ativo`} className="h-4 w-4 accent-[hsl(var(--electric))]" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <form onSubmit={submit} className="grid content-start gap-3 rounded-2xl border bg-card p-5">
        <h3 className="font-bold">Novo cupom</h3>
        <input className={`${field} uppercase`} placeholder="CÓDIGO (ex.: FERIAS15)" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} required maxLength={20} aria-label="Código" />
        <input className={field} placeholder="Descrição interna (opcional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={200} aria-label="Descrição" />
        <div className="grid grid-cols-2 gap-2">
          <select className={field} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} aria-label="Tipo de desconto">
            <option value="percent">Percentual (%)</option>
            <option value="amount">Valor fixo (R$)</option>
          </select>
          <input className={field} inputMode="decimal" placeholder={form.type === 'percent' ? '10' : '50,00'} value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} required aria-label="Valor do desconto" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="grid gap-1 text-xs text-muted-foreground">Mínimo de diárias<input className={field} inputMode="numeric" value={form.min_days} onChange={(e) => setForm({ ...form, min_days: e.target.value })} /></label>
          <label className="grid gap-1 text-xs text-muted-foreground">Limite de usos<input className={field} inputMode="numeric" placeholder="ilimitado" value={form.max_uses} onChange={(e) => setForm({ ...form, max_uses: e.target.value })} /></label>
          <label className="grid gap-1 text-xs text-muted-foreground">Válido a partir de<input className={field} type="date" value={form.valid_from} onChange={(e) => setForm({ ...form, valid_from: e.target.value })} /></label>
          <label className="grid gap-1 text-xs text-muted-foreground">Válido até<input className={field} type="date" value={form.valid_until} onChange={(e) => setForm({ ...form, valid_until: e.target.value })} /></label>
        </div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <Button type="submit" variant="brand" disabled={busy}>Criar cupom</Button>
      </form>
    </div>
  )
}
