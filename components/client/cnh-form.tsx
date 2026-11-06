'use client'

import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, BadgeCheck, IdCard, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CAR_CATEGORIES, MIN_LICENSE_YEARS } from '@/lib/cnh'
import { todayIso } from '@/lib/rental'

type Saved = { cnh_number: string; cnh_category: string; cnh_expires_on: string; cnh_first_issued_on: string } | null

const field =
  'h-11 w-full rounded-lg border border-input bg-background px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

const br = (iso: string) => iso.split('-').reverse().join('/')

/**
 * CNH do cliente. No checkout recebe a data de retirada e avisa (onReady) se a CNH serve;
 * no perfil é só o cadastro.
 */
export function CnhForm({ pickupDate, onReady }: { pickupDate?: string; onReady?: (ready: boolean) => void }) {
  const [saved, setSaved] = useState<Saved>(null)
  const [problems, setProblems] = useState<string[]>([])
  const [demo, setDemo] = useState(false)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ cnh_number: '', cnh_category: 'B', cnh_expires_on: '', cnh_first_issued_on: '' })

  const load = useCallback(async () => {
    const qs = pickupDate ? `?retirada=${pickupDate}` : ''
    const res = await fetch(`/api/profile/cnh${qs}`, { credentials: 'include' })
    const data = await res.json().catch(() => ({}))
    setLoading(false)
    if (!res.ok) {
      // Sem a migração aplicada o checkout não pode travar: o servidor também deixa passar.
      onReady?.(true)
      return
    }
    setDemo(Boolean(data.demo))
    setSaved(data.cnh)
    setProblems(data.problems ?? [])
    setEditing(!data.cnh && !data.demo)
    onReady?.((data.problems ?? []).length === 0)
  }, [pickupDate, onReady])

  useEffect(() => {
    load()
  }, [load])

  // Sem <form>: no checkout este bloco fica dentro do formulário da reserva, e formulário não pode ter outro dentro.
  const save = async () => {
    if (!form.cnh_number.trim() || !form.cnh_expires_on || !form.cnh_first_issued_on) {
      return setError('Preencha o número, a validade e a data da 1ª habilitação.')
    }
    setSaving(true)
    setError('')
    const res = await fetch('/api/profile/cnh', {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json().catch(() => ({}))
    setSaving(false)
    if (!res.ok) return setError(data.error ?? 'Não foi possível salvar.')
    await load()
  }

  if (loading) return <p className="text-sm text-muted-foreground">Carregando CNH…</p>

  if (demo) {
    return (
      <p className="flex items-start gap-2 text-sm text-muted-foreground">
        <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
        Na conta de demonstração a CNH não é pedida. Numa conta de verdade, ela é conferida aqui antes da reserva.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {saved && !editing && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <p className="flex items-center gap-2">
            <IdCard className="h-4 w-4 text-electric" aria-hidden />
            CNH {saved.cnh_number} · categoria {saved.cnh_category} · válida até {br(saved.cnh_expires_on)}
          </p>
          <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(true)}>
            Atualizar
          </Button>
        </div>
      )}

      {problems.length > 0 && !(editing && !saved) && (
        <ul className="space-y-1 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm" role="alert">
          {problems.map((p) => (
            <li key={p} className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden /> {p}
            </li>
          ))}
        </ul>
      )}

      {saved && !editing && problems.length === 0 && pickupDate && (
        <p className="flex items-center gap-2 text-sm text-success">
          <BadgeCheck className="h-4 w-4" aria-hidden /> CNH conferida para a retirada.
        </p>
      )}

      {editing && (
        <fieldset
          aria-label="Dados da CNH"
          className="grid gap-3 sm:grid-cols-2"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.target instanceof HTMLInputElement) {
              e.preventDefault()
              save()
            }
          }}
        >
          <label className="grid gap-1.5 text-sm sm:col-span-2">
            Nº de registro da CNH
            <input
              className={field}
              inputMode="numeric"
              autoComplete="off"
              maxLength={14}
              required
              placeholder="11 dígitos"
              value={form.cnh_number}
              onChange={(e) => setForm({ ...form, cnh_number: e.target.value })}
            />
          </label>
          <label className="grid gap-1.5 text-sm">
            Categoria
            <select className={field} value={form.cnh_category} onChange={(e) => setForm({ ...form, cnh_category: e.target.value })}>
              {CAR_CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm">
            Validade
            <input className={field} type="date" required min={todayIso()} value={form.cnh_expires_on} onChange={(e) => setForm({ ...form, cnh_expires_on: e.target.value })} />
          </label>
          <label className="grid gap-1.5 text-sm sm:col-span-2">
            Data da 1ª habilitação
            <input className={field} type="date" required max={todayIso()} value={form.cnh_first_issued_on} onChange={(e) => setForm({ ...form, cnh_first_issued_on: e.target.value })} />
            <span className="text-xs text-muted-foreground">Fica no campo &quot;1ª habilitação&quot; da CNH. É preciso ter pelo menos {MIN_LICENSE_YEARS} anos de habilitação.</span>
          </label>
          {error && (
            <p className="text-sm text-destructive sm:col-span-2" role="alert">
              {error}
            </p>
          )}
          <div className="flex gap-2 sm:col-span-2">
            <Button type="button" variant="brand" disabled={saving} onClick={save}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} Salvar CNH
            </Button>
            {saved && (
              <Button type="button" variant="ghost" onClick={() => setEditing(false)}>
                Cancelar
              </Button>
            )}
          </div>
        </fieldset>
      )}
    </div>
  )
}
