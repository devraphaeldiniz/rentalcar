import Link from 'next/link'
import { cn } from '@/lib/utils'

/**
 * Símbolo AstaCar: um "A" desenhado como uma estrada em perspectiva,
 * com a faixa central tracejada. Funciona sozinho (favicon) ou com o nome.
 */
export function AstaMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={cn('h-9 w-9 shrink-0', className)} aria-hidden focusable="false">
      <defs>
        <linearGradient id="asta-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#0A5BFF" />
          <stop offset="1" stopColor="#00C2E0" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="10" fill="url(#asta-g)" />
      <path d="M8.5 31.5 20 8.5l11.5 23" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 30.5v-3.2M20 23.6v-2.6M20 17.6v-1.8" stroke="#0B1220" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  )
}

type LogoProps = {
  href?: string
  /** Mostra a assinatura "Rent & Freedom" embaixo do nome. */
  tagline?: boolean
  /** Para fundos sempre escuros (hero, rodapé, menu do admin). */
  onDark?: boolean
  className?: string
}

export function Logo({ href = '/', tagline = true, onDark = false, className }: LogoProps) {
  return (
    <Link href={href} className={cn('group inline-flex items-center gap-2.5', className)} aria-label="AstaCar, página inicial">
      <AstaMark className="transition-transform group-hover:-rotate-6" />
      <span className="flex flex-col leading-none">
        <span className={cn('text-xl font-black tracking-wide', onDark ? 'text-white' : 'text-foreground')}>
          ASTA<span className={onDark ? 'text-[hsl(186_100%_50%)]' : 'text-electric'}>CAR</span>
        </span>
        {tagline && (
          <span className={cn('mt-1 text-[0.625rem] font-semibold uppercase tracking-[0.22em]', onDark ? 'text-white/60' : 'text-muted-foreground')}>
            Rent &amp; Freedom
          </span>
        )}
      </span>
    </Link>
  )
}
