'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

type Banner = {
  id: string
  placement: 'home' | 'vehicle_sidebar'
  title: string
  body: string | null
  cta_label: string | null
  cta_href: string | null
  coupon_code: string | null
  tone: 'brand' | 'electric' | 'success' | 'warning'
  starts_on: string | null
  ends_on: string | null
  active: boolean
  sort: number
}

const PLACEMENT_LABEL = { home: 'Home, acima do catálogo', vehicle_sidebar: 'Página do carro, ao lado' }
const TONE_LABEL = { brand: 'Azul AstaCar', electric: 'Ciano', success: 'Verde', warning: 'Âmbar' }
const TONE_DOT = { brand: 'bg-primary', electric: 'bg-electric', success: 'bg-success', warning: 'bg-warning' }
const field = 'h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
const br = (d: string | null) => (d ? d.split('-').reverse().join('/') : '')
const empty = { placement: 'home', title: '', body: '', cta_label: '', cta_href: '', coupon_code: '', tone: 'brand', starts_on: '', ends_on: '', sort: '0' }

export default function BannersPage() {
  const [banners, setBanners] = useState<Banner[] | null>(null)
  const [form, setForm] = useState(empty)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const r = await fetch('/api/admin/banners')
    const d = await r.json().catch(() => ({}))
    setBanners(r.ok ? d.banners : [])
  }, [])
  useEffect(() => { load() }, [load])

  const send = async (method: string, body?: unknown, query = '') => {
    setBusy(true)
    setError('')
    const r = await fetch(`/api/admin/banners${query}`, { method, headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined })
    const d = await r.json().catch(() => ({}))
    setBusy(false)
    if (!r.ok) { setError(d.error ?? 'Erro ao salvar'); return false }
    await load()
    return true
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const ok = await send('POST', {
      ...form,
      sort: Number(form.sort) || 0,
      starts_on: form.starts_on || null,
      ends_on: form.ends_on || null,
    })
    if (ok) setForm(empty)
  }

  const set = (patch: Partial<typeof empty>) => setForm((f) => ({ ...f, ...patch }))

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div>
        <h1 className="text-3xl font-bold">Banners</h1>
        <p className="text-muted-foreground">Ofertas da própria AstaCar nos espaços do site. Sem anúncios de terceiros.</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_400px]">
        <div className="space-y-6">
          {banners === null ? (
            <Loader2 className="h-6 w-6 animate-spin text-electric" aria-label="Carregando" />
          ) : banners.length === 0 ? (
            <p className="rounded-2xl border p-5 text-muted-foreground">Nenhum banner. Se a tabela ainda não existe, rode <code className="text-foreground">npm run db:setup</code>.</p>
          ) : (
            (Object.keys(PLACEMENT_LABEL) as (keyof typeof PLACEMENT_LABEL)[]).map((place) => (
              <section key={place} className="rounded-2xl border bg-card p-5">
                <h2 className="font-bold">{PLACEMENT_LABEL[place]}</h2>
                <ul className="mt-3 space-y-2">
                  {banners.filter((b) => b.placement === place).map((b) => (
                    <li key={b.id} className={`flex flex-wrap items-start justify-between gap-3 rounded-xl border p-3 ${b.active ? '' : 'opacity-60'}`}>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2 font-semibold"><span className={`h-2.5 w-2.5 rounded-full ${TONE_DOT[b.tone]}`} aria-hidden />{b.title}</span>
                        {b.body && <span className="block text-sm text-muted-foreground">{b.body}</span>}
                        <span className="mt-1 block text-xs text-muted-foreground">
                          {[b.coupon_code && `Cupom ${b.coupon_code}`, b.cta_label && `Botão "${b.cta_label}" → ${b.cta_href}`, (b.starts_on || b.ends_on) && `Vigência ${br(b.starts_on) || '…'} a ${br(b.ends_on) || '…'}`, `Ordem ${b.sort}`].filter(Boolean).join(' · ')}
                        </span>
                      </span>
                      <span className="flex items-center gap-2">
                        <label className="flex cursor-pointer items-center gap-2 text-sm">
                          <input type="checkbox" checked={b.active} disabled={busy} onChange={(e) => send('PATCH', { id: b.id, active: e.target.checked })} className="h-4 w-4 accent-[hsl(var(--electric))]" />
                          No ar
                        </label>
                        <Button variant="ghost" size="icon" disabled={busy} aria-label={`Excluir ${b.title}`} onClick={() => send('DELETE', undefined, `?id=${b.id}`)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </span>
                    </li>
                  ))}
                  {banners.every((b) => b.placement !== place) && <li className="text-sm text-muted-foreground">Nenhum banner aqui.</li>}
                </ul>
              </section>
            ))
          )}
        </div>

        <form onSubmit={submit} className="grid content-start gap-3 rounded-2xl border bg-card p-5">
          <h2 className="font-bold">Novo banner</h2>
          <label className="grid gap-1 text-sm">Onde aparece
            <select className={field} value={form.placement} onChange={(e) => set({ placement: e.target.value })}>
              {Object.entries(PLACEMENT_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-sm">Título<input className={field} value={form.title} onChange={(e) => set({ title: e.target.value })} required maxLength={80} /></label>
          <label className="grid gap-1 text-sm">Texto (opcional)<input className={field} value={form.body} onChange={(e) => set({ body: e.target.value })} maxLength={200} /></label>
          <div className="grid grid-cols-2 gap-2">
            <label className="grid gap-1 text-sm">Texto do botão<input className={field} value={form.cta_label} onChange={(e) => set({ cta_label: e.target.value })} maxLength={30} placeholder="Ver carros" /></label>
            <label className="grid gap-1 text-sm">Link do botão<input className={field} value={form.cta_href} onChange={(e) => set({ cta_href: e.target.value })} maxLength={200} placeholder="/#carros" /></label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="grid gap-1 text-sm">Cupom em destaque<input className={`${field} uppercase`} value={form.coupon_code} onChange={(e) => set({ coupon_code: e.target.value.toUpperCase() })} maxLength={20} placeholder="opcional" /></label>
            <label className="grid gap-1 text-sm">Cor
              <select className={field} value={form.tone} onChange={(e) => set({ tone: e.target.value })}>
                {Object.entries(TONE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </label>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <label className="grid gap-1 text-xs text-muted-foreground">Início<input className={field} type="date" value={form.starts_on} onChange={(e) => set({ starts_on: e.target.value })} /></label>
            <label className="grid gap-1 text-xs text-muted-foreground">Fim<input className={field} type="date" value={form.ends_on} onChange={(e) => set({ ends_on: e.target.value })} /></label>
            <label className="grid gap-1 text-xs text-muted-foreground">Ordem<input className={field} inputMode="numeric" value={form.sort} onChange={(e) => set({ sort: e.target.value })} /></label>
          </div>
          <p className="text-xs text-muted-foreground">Links só para páginas do próprio site. Sem datas, o banner fica no ar até ser desligado.</p>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <Button type="submit" variant="brand" disabled={busy}>Publicar banner</Button>
        </form>
      </div>
    </div>
  )
}
