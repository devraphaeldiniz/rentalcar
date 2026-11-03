'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Logo } from '@/components/brand/logo'
import { CookiePreferencesButton } from '@/components/analytics/cookie-preferences-button'

const COLUMNS: { title: string; links: [string, string][] }[] = [
  {
    title: 'Aluguel',
    links: [
      ['/', 'Carros disponíveis'],
      ['/#carros', 'Categorias da frota'],
      ['/profile/bookings', 'Minhas reservas'],
    ],
  },
  {
    title: 'AstaCar',
    links: [
      ['/sobre', 'Sobre o projeto'],
      ['/termos', 'Termos da locação'],
      ['/privacidade', 'Privacidade e cookies'],
      ['/creditos', 'Créditos das fotos'],
    ],
  },
  {
    title: 'Atendimento',
    links: [
      ['/contato', 'Fale com a gente'],
      ['/profile', 'Meus dados'],
    ],
  },
]

export function Footer() {
  const pathname = usePathname()
  if (pathname?.startsWith('/admin')) return null

  return (
    <footer className="mt-20 border-t border-white/5 bg-asphalt text-asphalt-foreground">
      <div className="container grid gap-10 py-14 text-sm md:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <Logo onDark />
          <p className="mt-4 max-w-sm text-asphalt-foreground/65">
            Aluguel de carros com reserva online e o valor total do período antes de você confirmar.
          </p>
        </div>
        {COLUMNS.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <h2 className="text-xs font-bold uppercase tracking-widest text-white">{col.title}</h2>
            <ul className="mt-4 space-y-2.5">
              {col.links.map(([href, label]) => (
                <li key={href}>
                  <Link href={href} className="text-asphalt-foreground/65 transition-colors hover:text-[hsl(186_100%_50%)]">
                    {label}
                  </Link>
                </li>
              ))}
              {col.title === 'Atendimento' && (
                <li><CookiePreferencesButton variant="link" /></li>
              )}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-white/5">
        <div className="container flex flex-col gap-2 py-6 text-xs text-asphalt-foreground/50 md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} AstaCar. Projeto de portfólio de Raphael Diniz.</p>
          <p>Demonstração: as reservas não geram cobrança.</p>
        </div>
      </div>
    </footer>
  )
}
