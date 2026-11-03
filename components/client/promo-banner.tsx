import Link from 'next/link'
import { ArrowRight, Megaphone } from 'lucide-react'
import type { Banner } from '@/lib/banners'
import { CopyCode } from '@/components/client/copy-code'

const TONE: Record<Banner['tone'], { box: string; icon: string }> = {
  brand: { box: 'border-primary/30 bg-primary/10', icon: 'bg-brand-gradient text-white' },
  electric: { box: 'border-electric/30 bg-electric/10', icon: 'bg-electric text-electric-foreground' },
  success: { box: 'border-success/30 bg-success/10', icon: 'bg-success text-success-foreground' },
  warning: { box: 'border-warning/30 bg-warning/10', icon: 'bg-warning text-warning-foreground' },
}

/** Banner de oferta da própria AstaCar. "wide" ocupa a largura toda (home). */
export function PromoBanner({ banner, wide = false }: { banner: Banner; wide?: boolean }) {
  const tone = TONE[banner.tone] ?? TONE.brand
  return (
    <aside
      aria-label="Oferta AstaCar"
      className={`flex gap-4 rounded-2xl border p-5 ${tone.box} ${wide ? 'flex-col sm:flex-row sm:items-center' : 'flex-col'}`}
    >
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone.icon}`} aria-hidden>
        <Megaphone className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-bold">{banner.title}</p>
        {banner.body && <p className="mt-1 text-sm text-muted-foreground">{banner.body}</p>}
      </div>
      {(banner.coupon_code || (banner.cta_href && banner.cta_label)) && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {banner.coupon_code && <CopyCode code={banner.coupon_code} />}
          {banner.cta_href && banner.cta_label && (
            <Link href={banner.cta_href} className="inline-flex items-center gap-1.5 text-sm font-semibold text-electric hover:underline">
              {banner.cta_label} <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          )}
        </div>
      )}
    </aside>
  )
}
