import { redirect } from 'next/navigation'
import { CheckCircle2, CircleDashed } from 'lucide-react'
import { requireAdminView } from '@/lib/auth/authorization'
import { MIN_LICENSE_YEARS } from '@/lib/cnh'
import { DEMO_LIMITS, demoAdminEnabled, demoEnabled } from '@/lib/demo'
import { emailEnabled } from '@/lib/email/send'
import { onlinePaymentEnabled } from '@/lib/payments/mercadopago'
import { TERMS_VERSION } from '@/lib/policies'
import { MAX_RENTAL_DAYS } from '@/lib/rental'
import { SITE_URL } from '@/lib/site'
import { STORE_WHATSAPP } from '@/lib/whatsapp'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Configurações' }

type Item = { label: string; on: boolean; detail: string; env: string }

/**
 * O que está ligado neste ambiente e as regras que valem hoje.
 * As integrações se configuram nas variáveis da Vercel; esta tela só mostra se estão presentes (nunca os valores).
 */
export default async function SettingsPage() {
  if (!(await requireAdminView())) redirect('/')

  const integrations: Item[] = [
    { label: 'Pagamento online (Mercado Pago)', on: onlinePaymentEnabled(), detail: 'Pix, cartão e boleto no checkout.', env: 'MP_ACCESS_TOKEN, NEXT_PUBLIC_MP_PUBLIC_KEY' },
    { label: 'Confirmação de pagamento (webhook)', on: Boolean(process.env.MP_WEBHOOK_SECRET), detail: 'Valida a assinatura das notificações do Mercado Pago.', env: 'MP_WEBHOOK_SECRET' },
    { label: 'E-mails da reserva (Resend)', on: emailEnabled(), detail: 'Confirmação e lembrete na véspera da retirada.', env: 'RESEND_API_KEY, EMAIL_FROM' },
    { label: 'Lembrete diário (Vercel Cron)', on: Boolean(process.env.CRON_SECRET), detail: 'Roda todo dia às 18h de Brasília.', env: 'CRON_SECRET' },
    { label: 'WhatsApp do atendimento', on: Boolean(STORE_WHATSAPP), detail: 'Botão flutuante, rodapé, contato e confirmação.', env: 'NEXT_PUBLIC_WHATSAPP_NUMBER' },
    { label: 'Conta de demonstração (cliente)', on: demoEnabled(), detail: 'Botão "Entrar como cliente de demonstração" no login.', env: 'DEMO_CLIENT_EMAIL, DEMO_CLIENT_PASSWORD' },
    { label: 'Painel de demonstração (admin)', on: demoAdminEnabled(), detail: 'Botão "Ver o painel do admin", só leitura e com dados mascarados.', env: 'DEMO_ADMIN_EMAIL, DEMO_ADMIN_PASSWORD' },
  ]

  const rules: [string, string][] = [
    ['Período da locação', `De 1 a ${MAX_RENTAL_DAYS} diárias`],
    ['Cancelamento pelo cliente', 'Pelo site, até o dia anterior à retirada, sem custo (calendário de Brasília)'],
    ['CNH', `Categoria B ou superior, válida na retirada e com ${MIN_LICENSE_YEARS} anos de habilitação`],
    ['Conta de demonstração', `Até ${DEMO_LIMITS.openBookings} reservas abertas, ${DEMO_LIMITS.maxDays} diárias e retirada em até ${DEMO_LIMITS.maxAdvanceDays} dias`],
    ['Termos da locação', `Versão ${TERMS_VERSION}`],
    ['Endereço do site', SITE_URL],
    ['Versão no ar', process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'local'],
  ]

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div>
        <h1 className="text-3xl font-bold">Configurações</h1>
        <p className="text-muted-foreground">
          Integrações ligadas neste ambiente e as regras em vigor. Preços, cupons e banners se ajustam nas próprias telas do painel.
        </p>
      </div>

      <section className="rounded-2xl border bg-card p-5" aria-labelledby="integracoes">
        <h2 id="integracoes" className="font-bold">Integrações</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Configuradas nas variáveis de ambiente da Vercel. Esta tela só mostra se estão presentes, nunca os valores.
        </p>
        <ul className="mt-4 divide-y">
          {integrations.map((i) => (
            <li key={i.label} className="flex items-start gap-3 py-3 text-sm">
              {i.on ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden />
              ) : (
                <CircleDashed className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
              )}
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{i.label}</span>
                <span className="block text-muted-foreground">{i.detail}</span>
                {!i.on && <code className="mt-1 block break-all text-xs text-electric">{i.env}</code>}
              </span>
              <span className={`shrink-0 text-xs font-semibold ${i.on ? 'text-success' : 'text-muted-foreground'}`}>{i.on ? 'Ligado' : 'Desligado'}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border bg-card p-5" aria-labelledby="regras">
        <h2 id="regras" className="font-bold">Regras em vigor</h2>
        <dl className="mt-4 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-[14rem_1fr]">
          {rules.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="font-semibold text-muted-foreground">{k}</dt>
              <dd className="break-words">{v}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  )
}
