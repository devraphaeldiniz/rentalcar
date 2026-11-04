import Link from 'next/link'
import { PageHero } from '@/components/layout/page-hero'
import { POLICIES, REQUIREMENTS, TERMS_VERSION } from '@/lib/policies'

export const metadata = { title: 'Termos da locação' }

export default function TermsPage() {
  const [year, month] = TERMS_VERSION.split('-')
  return (
    <main>
      <PageHero eyebrow="Regras claras" title="Termos da locação" subtitle="O que você precisa para retirar o carro e como funcionam combustível, cancelamento e proteções." />
      <section className="container max-w-3xl py-14">
        <h2 className="text-2xl font-extrabold">Para retirar o carro</h2>
        <ul className="mt-6 grid gap-4 sm:grid-cols-3">
          {REQUIREMENTS.map((r) => (
            <li key={r.title} className="rounded-2xl border bg-card p-5">
              <p className="font-bold">{r.title}</p>
              <p className="mt-1.5 text-sm text-muted-foreground">{r.text}</p>
            </li>
          ))}
        </ul>

        <h2 className="mt-14 text-2xl font-extrabold">Durante e depois da locação</h2>
        <dl className="mt-6 divide-y rounded-2xl border bg-card">
          {POLICIES.map((p) => (
            <div key={p.title} className="grid gap-1 p-5 sm:grid-cols-[220px_1fr]">
              <dt className="font-semibold">{p.title}</dt>
              <dd className="text-muted-foreground">{p.text}</dd>
            </div>
          ))}
        </dl>

        <p className="mt-10 text-sm text-muted-foreground">
          Versão de {month}/{year}. Ao confirmar uma reserva você aceita estes termos; a data do aceite fica registrada na reserva.
          Dúvidas? <Link href="/contato" className="text-electric hover:underline">Fale com a AstaCar</Link>.
        </p>
      </section>
    </main>
  )
}
