import Link from 'next/link'
import { CalendarRange, Database, LockKeyhole, ReceiptText, ShieldCheck, Smartphone } from 'lucide-react'
import { PageHero } from '@/components/layout/page-hero'

export const metadata = { title: 'Sobre' }

const PILLARS = [
  { icon: ReceiptText, title: 'Preço sem surpresa', text: 'O valor total do período aparece antes da reserva e é calculado no servidor, não no navegador.' },
  { icon: CalendarRange, title: 'Agenda sem conflito', text: 'O banco impede duas reservas do mesmo carro em datas sobrepostas, mesmo com cliques simultâneos.' },
  { icon: ShieldCheck, title: 'Conta protegida', text: 'Sessão em cookie seguro, limite de tentativas de login e registro das ações importantes.' },
  { icon: Smartphone, title: 'Feito para o celular', text: 'Busca, reserva e acompanhamento funcionam em qualquer tela, no tema claro ou escuro.' },
  { icon: Database, title: 'Gestão completa', text: 'Painel administrativo com frota, reservas, usuários, mensagens e relatórios.' },
  { icon: LockKeyhole, title: 'Dados mínimos', text: 'Pedimos só o necessário para a reserva, e você pode editar seus dados quando quiser.' },
]

export default function SobrePage() {
  return (
    <main>
      <PageHero
        eyebrow="Sobre a AstaCar"
        title="Aluguel de carros simples, transparente e digital"
        subtitle="A AstaCar é um projeto de portfólio que reproduz a experiência de uma locadora moderna, do catálogo ao painel de gestão."
      />

      <section className="container py-16">
        <div className="mx-auto max-w-3xl space-y-4 text-lg text-muted-foreground">
          <p>
            A ideia é simples: quem aluga um carro quer saber quanto vai pagar e se o carro estará disponível. Por isso a AstaCar
            mostra o valor total do período em cada modelo e só deixa reservar o que está livre nas datas escolhidas.
          </p>
          <p>
            Por trás da vitrine existe um sistema completo: contas de cliente e de administrador, reservas com cancelamento e
            avaliação, gestão da frota e trilha de auditoria. As reservas são de demonstração e não geram cobrança.
          </p>
        </div>
      </section>

      <section className="border-y bg-muted/40">
        <div className="container py-16">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-electric">Como o sistema funciona</p>
            <h2 className="mt-1 text-3xl font-extrabold">Os pilares da AstaCar</h2>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {PILLARS.map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-2xl border bg-card p-6">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-electric/25 bg-electric/10 text-electric">
                  <Icon className="h-6 w-6" aria-hidden />
                </span>
                <h3 className="mt-4 text-lg font-bold">{title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container py-16 text-center">
        <h2 className="text-3xl font-extrabold">Pronto para pegar a estrada?</h2>
        <p className="mt-2 text-muted-foreground">Escolha as datas e veja o valor total de cada carro.</p>
        <Link href="/" className="bg-brand-gradient mt-8 inline-flex h-12 items-center rounded-lg px-8 font-semibold text-white shadow-lg shadow-primary/25 hover:brightness-110">
          Ver carros disponíveis
        </Link>
      </section>
    </main>
  )
}
