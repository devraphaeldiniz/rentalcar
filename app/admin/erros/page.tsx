import { redirect } from 'next/navigation'
import { Activity, AlertTriangle, CheckCircle2, Monitor, Server } from 'lucide-react'
import { adminGraphql, requireAdminView } from '@/lib/auth/authorization'
import { maskPersonalData } from '@/lib/demo-admin'
import { type ErrorRow, groupErrors } from '@/lib/monitoring/summary'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Erros e saúde' }

const DAYS = 7
const KEEP_DAYS = 30

const when = (iso: string) =>
  new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' }).format(new Date(iso))

export default async function ErrorsPage() {
  // Repetida aqui porque a página também é carregada sozinha na navegação do painel.
  const viewer = await requireAdminView()
  if (!viewer) redirect('/')

  const since = new Date(Date.now() - DAYS * 86_400_000).toISOString()
  const started = Date.now()
  let rows: ErrorRow[] | null = null
  let dbMs = 0
  try {
    const data = await adminGraphql<{ app_errors: ErrorRow[] }>(
      `query Errors($since: timestamptz!) {
        app_errors(where: { created_at: { _gte: $since } }, order_by: { created_at: desc }, limit: 1000) {
          id source fingerprint message route path method stack created_at
        }
      }`,
      { since },
    )
    dbMs = Date.now() - started
    // Painel de demonstração: as mensagens já saem sem dados pessoais, mas mascara de novo por garantia.
    rows = viewer.demo ? maskPersonalData(data.app_errors) : data.app_errors
    // Retenção: erros com mais de 30 dias não ajudam mais e só ocupam espaço (só um admin de verdade apaga).
    if (!viewer.demo) await adminGraphql('mutation Old($before: timestamptz!) { delete_app_errors(where: { created_at: { _lt: $before } }) { affected_rows } }', {
      before: new Date(Date.now() - KEEP_DAYS * 86_400_000).toISOString(),
    }).catch(() => {})
  } catch (error) {
    console.error('[admin/erros]', error)
  }

  const groups = rows ? groupErrors(rows) : []
  const last24h = rows?.filter((r) => Date.parse(r.created_at) > Date.now() - 86_400_000).length ?? 0
  const version = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'local'
  const healthy = rows !== null

  const summary = [
    { label: 'Banco de dados', value: healthy ? `${dbMs} ms` : 'Sem resposta', alert: !healthy },
    { label: 'Erros nas últimas 24h', value: String(last24h), alert: last24h > 0 },
    { label: `Erros diferentes em ${DAYS} dias`, value: String(groups.length) },
    { label: 'Versão no ar', value: version },
  ]

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div>
        <h1 className="text-3xl font-bold">Erros e saúde</h1>
        <p className="text-muted-foreground">
          Erros do servidor e do navegador dos últimos {DAYS} dias, agrupados. Monitores externos podem consultar <code className="text-electric">/api/health</code>.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summary.map((s) => (
          <div key={s.label} className={`rounded-2xl border bg-card p-5 ${s.alert ? 'border-destructive/40' : ''}`}>
            <p className="text-sm font-medium text-muted-foreground">{s.label}</p>
            <p className={`tabular mt-2 text-3xl font-black ${s.alert ? 'text-destructive' : ''}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {!healthy ? (
        <section className="rounded-2xl border border-destructive/40 bg-destructive/5 p-5">
          <h2 className="flex items-center gap-2 font-bold text-destructive"><AlertTriangle className="h-4 w-4" aria-hidden /> Não foi possível ler os erros</h2>
          <p className="mt-2 text-sm text-muted-foreground">O banco não respondeu ou a migração 013 ainda não foi aplicada (npm run db:setup).</p>
        </section>
      ) : groups.length === 0 ? (
        <section className="flex items-center gap-3 rounded-2xl border bg-card p-5">
          <CheckCircle2 className="h-5 w-5 text-success" aria-hidden />
          <p className="text-sm">Nenhum erro registrado nos últimos {DAYS} dias.</p>
        </section>
      ) : (
        <ul className="space-y-3">
          {groups.map((g) => (
            <li key={g.fingerprint} className="rounded-2xl border bg-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {g.source === 'server' ? <Server className="h-3.5 w-3.5" aria-hidden /> : <Monitor className="h-3.5 w-3.5" aria-hidden />}
                    {g.source === 'server' ? 'Servidor' : 'Navegador'}
                    {g.route && <span className="normal-case tracking-normal">· {g.route}</span>}
                  </p>
                  <p className="mt-1 break-words font-semibold">{g.message}</p>
                  {g.paths.length > 0 && <p className="mt-1 truncate text-xs text-muted-foreground">Em: {g.paths.join(', ')}</p>}
                </div>
                <div className="text-right text-sm">
                  <p className="tabular text-2xl font-black">{g.count}×</p>
                  <p className="text-xs text-muted-foreground">última {when(g.lastSeen)}</p>
                  {g.count > 1 && <p className="text-xs text-muted-foreground">primeira {when(g.firstSeen)}</p>}
                </div>
              </div>
              {g.sample.stack && (
                <details className="mt-3">
                  <summary className="cursor-pointer text-xs font-semibold text-electric">Ver pilha do erro</summary>
                  <pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-muted p-3 text-xs leading-relaxed">{g.sample.stack}</pre>
                </details>
              )}
            </li>
          ))}
        </ul>
      )}

      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <Activity className="h-3.5 w-3.5" aria-hidden /> Também ficam no log da Vercel (linhas com &quot;type&quot;:&quot;app_error&quot;). Guardamos {KEEP_DAYS} dias, sem IP e sem dados de formulário.
      </p>
    </div>
  )
}
