import Link from 'next/link'
import { PageHero } from '@/components/layout/page-hero'
import { CookiePreferencesButton } from '@/components/analytics/cookie-preferences-button'

export const metadata = { title: 'Privacidade e cookies' }

const SECTIONS: { title: string; body: string[] }[] = [
  {
    title: 'O que coletamos para a reserva',
    body: [
      'Para criar sua conta e suas reservas guardamos nome, e-mail e, se você informar, celular e CPF. Esses dados servem só para identificar quem vai retirar o carro e você pode editá-los em Meus dados.',
    ],
  },
  {
    title: 'Monitoramento de uso (cookies próprios)',
    body: [
      'Se você aceitar no aviso de cookies, registramos as páginas que você visita, os carros que abre e se chegou a iniciar ou concluir uma reserva. Isso mostra para a equipe onde o site pode melhorar.',
      'Para isso usamos dois cookies próprios: um que identifica a visita (expira após 30 minutos sem atividade) e um que reconhece o navegador em visitas futuras (expira em 1 ano). Não guardamos seu endereço IP no monitoramento, não usamos ferramentas de terceiros e nada é vendido ou compartilhado.',
      'Se você recusar, nenhuma navegação é registrada.',
    ],
  },
  {
    title: 'Pergunta sobre desistência',
    body: [
      'Na revisão da reserva existe uma pergunta opcional sobre o motivo de não reservar. A resposta só é enviada se você clicar em Enviar e é usada para entender preços e a concorrência.',
    ],
  },
  {
    title: 'Seus direitos',
    body: [
      'Você pode mudar sua escolha de cookies a qualquer momento pelo botão abaixo ou pelo rodapé do site. Para pedir a exclusão dos seus dados, use a página de contato.',
    ],
  },
]

export default function PrivacyPage() {
  return (
    <main>
      <PageHero eyebrow="Transparência" title="Privacidade e cookies" subtitle="O que a AstaCar guarda, por quê e como você controla isso." />
      <section className="container max-w-3xl space-y-10 py-14">
        {SECTIONS.map((s) => (
          <div key={s.title}>
            <h2 className="text-xl font-bold">{s.title}</h2>
            {s.body.map((p) => (
              <p key={p.slice(0, 24)} className="mt-3 leading-relaxed text-muted-foreground">{p}</p>
            ))}
          </div>
        ))}
        <div className="flex flex-wrap gap-3 border-t pt-8">
          <CookiePreferencesButton />
          <Link href="/contato" className="inline-flex h-10 items-center rounded-lg border px-4 text-sm font-semibold hover:bg-accent">Falar com a AstaCar</Link>
        </div>
      </section>
    </main>
  )
}
