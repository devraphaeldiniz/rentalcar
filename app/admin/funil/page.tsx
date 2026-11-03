import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Eye, MousePointerClick, ShoppingCart, Users, Smartphone, Monitor, Tablet, LogOut as Exit } from 'lucide-react'
import { adminGraphql, requireAdmin } from '@/lib/auth/authorization'
import { addDaysIso, formatBRL, todayIso } from '@/lib/rental'
import { OUTCOME_LABELS, summarize, type RawEvent, type SessionOutcome } from '@/lib/analytics/summary'
import { FEEDBACK_REASONS } from '@/lib/analytics/events'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Funil e visitas' }

const PERIODS = [7, 30, 90] as const
const MAX_EVENTS = 20000

const OUTCOME_STYLE: Record<SessionOutcome, string> = {
  reservou: 'bg-success/15 text-success',
  desistiu_no_checkout: 'bg-warning/15 text-warning',
  viu_carros: 'bg-electric/10 text-electric',
  so_visitou: 'bg-muted text-muted-foreground',
}

const DEVICE_ICON = { mobile: Smartphone, tablet: Tablet, desktop: Monitor } as const
const DEVICE_LABEL: Record<string, string> = { mobile: 'Celular', tablet: 'Tablet', desktop: 'Computador' }

const time = (iso: string) =>
  new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' }).format(new Date(iso))
const minutes = (a: string, b: string) => Math.max(1, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 60000))

export default async function FunnelPage(props: { searchParams: Promise<{ periodo?: string }> }) {
  // O layout já barra quem não é admin; a checagem se repete aqui porque a
  // página também é carregada sozinha na navegação entre telas do painel.
  if (!(await requireAdmin())) redirect('/')

  const { periodo } = await props.searchParams
  const period = PERIODS.find((p) => String(p) === periodo) ?? 30
  const to = todayIso()
  const from = addDaysIso(to, -(period - 1))
  const since = new Date(`${from}T03:00:00Z`).toISOString() // meia-noite em Brasília

  let data: { analytics_events: RawEvent[]; vehicles: { id: string; brand: string; model: string }[] } | null = null
  let error = false
  try {
    data = await adminGraphql(
      `query Funnel($since: timestamptz!, $limit: Int!) {
        analytics_events(where: { created_at: { _gte: $since } }, order_by: { created_at: desc }, limit: $limit) {
          session_id visitor_id user_id event vehicle_id path referrer device meta created_at
        }
        vehicles { id brand model }
      }`,
      { since, limit: MAX_EVENTS },
    )
  } catch (e) {
    console.error('[admin/funil]', e)
    error = true
  }

  if (error || !data) {
    return (
      <div className="p-6 lg:p-8">
        <h1 className="text-3xl font-bold">Funil e visitas</h1>
        <p className="mt-4 max-w-xl rounded-2xl border p-5 text-muted-foreground">
          Não foi possível carregar o monitoramento. Se a tabela ainda não existe, rode <code className="text-foreground">npm run db:setup</code>.
        </p>
      </div>
    )
  }

  const s = summarize(data.analytics_events, { from, to })
  const truncated = data.analytics_events.length >= MAX_EVENTS
  const carName = new Map(data.vehicles.map((v) => [v.id, `${v.brand} ${v.model}`]))

  const userIds = [...new Set(s.sessions.slice(0, 25).map((x) => x.userId).filter(Boolean))] as string[]
  const users = userIds.length
    ? (await adminGraphql<{ profiles: { id: string; email: string | null; full_name: string | null }[] }>(
        `query P($ids: [uuid!]!) { profiles(where: { id: { _in: $ids } }) { id email full_name } }`,
        { ids: userIds },
      ).catch(() => ({ profiles: [] }))).profiles
    : []
  const userName = new Map(users.map((u) => [u.id, u.full_name || u.email || 'Cliente']))

  const maxDay = Math.max(1, ...s.days.map((d) => d.sessions))
  const maxReason = Math.max(1, ...s.reasons.map((r) => r.count))
  const kpis = [
    { icon: Eye, label: 'Visitas', value: s.totals.sessions.toLocaleString('pt-BR'), hint: `${s.totals.visitors} visitantes únicos` },
    { icon: MousePointerClick, label: 'Conversão', value: `${s.totals.conversion.toLocaleString('pt-BR')}%`, hint: 'visitas que viraram reserva' },
    { icon: ShoppingCart, label: 'Reservas pelo site', value: String(s.totals.bookings), hint: formatBRL(s.totals.revenue) },
    { icon: Exit, label: 'Desistências na reserva', value: String(Math.max(0, s.totals.abandoned)), hint: `${s.reasons.reduce((n, r) => n + r.count, 0)} disseram o motivo` },
  ]

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Funil e visitas</h1>
          <p className="text-muted-foreground">Como as pessoas chegam, o que olham e onde desistem.</p>
        </div>
        <nav className="flex gap-1 rounded-xl border bg-card p-1" aria-label="Período">
          {PERIODS.map((p) => (
            <Link
              key={p}
              href={`/admin/funil?periodo=${p}`}
              aria-current={p === period ? 'page' : undefined}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${p === period ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {p} dias
            </Link>
          ))}
        </nav>
      </div>

      {truncated && (
        <p className="rounded-xl border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
          Muitos eventos no período: mostrando os {MAX_EVENTS.toLocaleString('pt-BR')} mais recentes. Escolha um período menor para números exatos.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map(({ icon: Icon, label, value, hint }) => (
          <div key={label} className="rounded-2xl border bg-card p-5">
            <div className="flex items-center justify-between text-sm font-medium text-muted-foreground">
              {label}
              <Icon className="h-4 w-4 text-electric" aria-hidden />
            </div>
            <p className="tabular mt-2 text-3xl font-black">{value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border bg-card p-5">
          <h2 className="font-bold">Funil de conversão</h2>
          <p className="text-sm text-muted-foreground">Visitas que chegaram a cada etapa.</p>
          <ol className="mt-5 space-y-4">
            {s.funnel.map((step, i) => (
              <li key={step.key}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="font-medium">{step.label}</span>
                  <span className="tabular text-muted-foreground">
                    <strong className="text-foreground">{step.sessions}</strong>
                    {i > 0 && ` · ${step.ofPrevious.toLocaleString('pt-BR')}% da etapa anterior`}
                  </span>
                </div>
                <div className="mt-1.5 h-3 overflow-hidden rounded-full bg-muted">
                  <div className="bg-brand-gradient h-full rounded-full" style={{ width: `${Math.max(step.ofTotal, step.sessions ? 2 : 0)}%` }} />
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="rounded-2xl border bg-card p-5">
          <h2 className="font-bold">Por que desistiram</h2>
          <p className="text-sm text-muted-foreground">Respostas da pergunta opcional no checkout.</p>
          {s.reasons.length === 0 ? (
            <p className="mt-6 text-sm text-muted-foreground">Ninguém respondeu ainda.</p>
          ) : (
            <ul className="mt-5 space-y-3">
              {s.reasons.map((r) => (
                <li key={r.reason}>
                  <div className="flex justify-between text-sm"><span>{r.label}</span><strong className="tabular">{r.count}</strong></div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-warning" style={{ width: `${(r.count / maxReason) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="rounded-2xl border bg-card p-5">
        <h2 className="font-bold">Visitas por dia</h2>
        <div className="mt-5 flex h-40 items-end gap-[3px]" role="img" aria-label={`Visitas por dia nos últimos ${period} dias`}>
          {s.days.map((d) => (
            <div key={d.day} className="group relative flex h-full flex-1 items-end" title={`${d.day.split('-').reverse().join('/')}: ${d.sessions}`}>
              <div className="w-full rounded-t bg-electric/70 transition-colors group-hover:bg-electric" style={{ height: `${(d.sessions / maxDay) * 100}%`, minHeight: d.sessions ? 3 : 1 }} />
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-between text-xs text-muted-foreground">
          <span>{from.split('-').reverse().join('/')}</span>
          <span>pico: {maxDay} visitas/dia</span>
          <span>{to.split('-').reverse().join('/')}</span>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-3">
        <section className="rounded-2xl border bg-card p-5 xl:col-span-2">
          <h2 className="font-bold">Carros mais vistos</h2>
          {s.vehicles.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">Sem dados no período.</p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr><th className="py-2 font-semibold">Carro</th><th className="py-2 text-right font-semibold">Visitas</th><th className="py-2 text-right font-semibold">Iniciaram</th><th className="py-2 text-right font-semibold">Reservaram</th><th className="py-2 text-right font-semibold">Conversão</th></tr>
                </thead>
                <tbody className="tabular">
                  {s.vehicles.map((v) => (
                    <tr key={v.vehicleId} className="border-t">
                      <td className="py-2.5 font-medium">{carName.get(v.vehicleId) ?? 'Carro removido'}</td>
                      <td className="py-2.5 text-right">{v.views}</td>
                      <td className="py-2.5 text-right">{v.checkouts}</td>
                      <td className="py-2.5 text-right">{v.bookings}</td>
                      <td className="py-2.5 text-right">{v.conversion.toLocaleString('pt-BR')}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="space-y-6 rounded-2xl border bg-card p-5">
          <div>
            <h2 className="font-bold">Aparelhos</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {s.devices.length === 0 && <li className="text-muted-foreground">Sem dados.</li>}
              {s.devices.map((d) => {
                const Icon = DEVICE_ICON[d.device as keyof typeof DEVICE_ICON] ?? Monitor
                return (
                  <li key={d.device} className="flex items-center justify-between">
                    <span className="flex items-center gap-2"><Icon className="h-4 w-4 text-electric" aria-hidden />{DEVICE_LABEL[d.device] ?? d.device}</span>
                    <strong className="tabular">{d.sessions}</strong>
                  </li>
                )
              })}
            </ul>
          </div>
          <div>
            <h2 className="font-bold">De onde vieram</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {s.referrers.length === 0 && <li className="text-muted-foreground">Sem dados.</li>}
              {s.referrers.map((r) => (
                <li key={r.source} className="flex items-center justify-between gap-3">
                  <span className="truncate">{r.source}</span><strong className="tabular">{r.sessions}</strong>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>

      <section className="rounded-2xl border bg-card p-5">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-electric" aria-hidden />
          <h2 className="font-bold">Visitas recentes</h2>
        </div>
        <p className="text-sm text-muted-foreground">O caminho de cada visita. Visitantes sem conta aparecem como anônimos.</p>
        {s.sessions.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Nenhuma visita registrada ainda. As visitas aparecem aqui depois que alguém aceita os cookies no site.
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr><th className="py-2 font-semibold">Quando</th><th className="py-2 font-semibold">Quem</th><th className="py-2 font-semibold">Caminho</th><th className="py-2 font-semibold">Resultado</th></tr>
              </thead>
              <tbody>
                {s.sessions.slice(0, 25).map((x) => {
                  const Icon = DEVICE_ICON[x.device as keyof typeof DEVICE_ICON] ?? Monitor
                  return (
                    <tr key={x.sessionId} className="border-t align-top">
                      <td className="py-3 pr-4">
                        <p className="whitespace-nowrap">{time(x.startedAt)}</p>
                        <p className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Icon className="h-3 w-3" aria-hidden /> {minutes(x.startedAt, x.endedAt)} min · {x.referrer ?? 'direto'}
                        </p>
                      </td>
                      <td className="py-3 pr-4">
                        {x.userId ? userName.get(x.userId) ?? 'Cliente' : <span className="text-muted-foreground">Anônimo #{(x.visitorId ?? x.sessionId).slice(0, 4)}</span>}
                      </td>
                      <td className="py-3 pr-4">
                        <p>{x.pages} {x.pages === 1 ? 'página' : 'páginas'}{x.vehicles.length ? ` · ${x.vehicles.length} ${x.vehicles.length === 1 ? 'carro' : 'carros'}` : ''}</p>
                        {x.lastVehicle && <p className="text-xs text-muted-foreground">Último: {carName.get(x.lastVehicle) ?? 'carro removido'}</p>}
                      </td>
                      <td className="py-3">
                        <span className={`inline-block rounded-md px-2 py-0.5 text-xs font-semibold ${OUTCOME_STYLE[x.outcome]}`}>{OUTCOME_LABELS[x.outcome]}</span>
                        {x.reason && <p className="mt-1 text-xs text-muted-foreground">Motivo: {FEEDBACK_REASONS[x.reason as keyof typeof FEEDBACK_REASONS] ?? x.reason}</p>}
                        {x.comment && <p className="mt-0.5 max-w-xs text-xs italic text-muted-foreground">“{x.comment}”</p>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
