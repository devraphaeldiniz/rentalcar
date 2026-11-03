'use client'

import { Check, ShieldCheck, Shield, ShieldPlus, Baby, Navigation, Fuel, UserPlus, Plus } from 'lucide-react'
import { extraDetail, extraTotal, type Extra } from '@/lib/pricing'
import { formatBRL } from '@/lib/rental'

const ICONS: Record<string, typeof Shield> = {
  protecao_basica: Shield,
  protecao_completa: ShieldPlus,
  protecao_total: ShieldCheck,
  condutor_adicional: UserPlus,
  cadeirinha: Baby,
  gps: Navigation,
  tanque_cheio: Fuel,
}

type Props = {
  extras: Extra[]
  days: number
  protection: string
  addons: string[]
  onProtection: (code: string) => void
  onToggleAddon: (code: string) => void
}

export function CheckoutExtras({ extras, days, protection, addons, onProtection, onToggleAddon }: Props) {
  const protections = extras.filter((e) => e.kind === 'protection')
  const optionals = extras.filter((e) => e.kind === 'addon')
  const n = Math.max(days, 1)

  const price = (e: Extra) => {
    const total = extraTotal(e, n)
    if (total === 0) return 'Incluída'
    return e.pricing === 'per_rental' ? `+ ${formatBRL(total)}` : `+ ${formatBRL(e.price)}/dia`
  }

  return (
    <>
      {protections.length > 0 && (
        <section className="rounded-2xl border bg-card p-5">
          <h2 className="text-lg font-bold">Proteção do carro</h2>
          <p className="text-sm text-muted-foreground">A franquia é o máximo que você paga se acontecer algo com o carro.</p>
          <fieldset className="mt-4 grid gap-3">
            <legend className="sr-only">Escolha a proteção</legend>
            {protections.map((p) => {
              const Icon = ICONS[p.code] ?? Shield
              const active = protection === p.code
              return (
                <label
                  key={p.code}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring ${
                    active ? 'border-electric bg-electric/5' : 'hover:border-electric/40'
                  }`}
                >
                  <input type="radio" name="protecao" value={p.code} checked={active} onChange={() => onProtection(p.code)} className="sr-only" />
                  <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${active ? 'text-electric' : 'text-muted-foreground'}`} aria-hidden />
                  <span className="flex-1">
                    <span className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="font-semibold">{p.name}</span>
                      <span className={`text-sm font-semibold ${active ? 'text-electric' : ''}`}>{price(p)}</span>
                    </span>
                    {p.description && <span className="mt-0.5 block text-sm text-muted-foreground">{p.description}</span>}
                  </span>
                  <span
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${active ? 'border-electric bg-electric text-electric-foreground' : ''}`}
                    aria-hidden
                  >
                    {active && <Check className="h-3 w-3" />}
                  </span>
                </label>
              )
            })}
          </fieldset>
        </section>
      )}

      {optionals.length > 0 && (
        <section className="rounded-2xl border bg-card p-5">
          <h2 className="text-lg font-bold">Opcionais</h2>
          <p className="text-sm text-muted-foreground">Escolha só o que precisar.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {optionals.map((a) => {
              const Icon = ICONS[a.code] ?? Plus
              const active = addons.includes(a.code)
              return (
                <label
                  key={a.code}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring ${
                    active ? 'border-electric bg-electric/5' : 'hover:border-electric/40'
                  }`}
                >
                  <input type="checkbox" checked={active} onChange={() => onToggleAddon(a.code)} className="sr-only" />
                  <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${active ? 'text-electric' : 'text-muted-foreground'}`} aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{a.name}</span>
                    <span className="block text-sm text-muted-foreground">{price(a)}</span>
                    {active && <span className="mt-1 block text-xs text-muted-foreground">{extraDetail(a, n)}</span>}
                  </span>
                  <span
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${active ? 'border-electric bg-electric text-electric-foreground' : ''}`}
                    aria-hidden
                  >
                    {active && <Check className="h-3 w-3" />}
                  </span>
                </label>
              )
            })}
          </div>
        </section>
      )}
    </>
  )
}
