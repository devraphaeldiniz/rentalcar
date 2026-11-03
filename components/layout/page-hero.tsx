/** Faixa de título das páginas institucionais, no mesmo estilo do hero da home. */
export function PageHero({ eyebrow, title, subtitle }: { eyebrow?: string; title: string; subtitle?: string }) {
  return (
    <section className="relative overflow-hidden bg-asphalt text-asphalt-foreground">
      <div className="bg-dot-grid pointer-events-none absolute inset-0 opacity-40" aria-hidden />
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[320px] w-[680px] -translate-x-1/2 rounded-full bg-[hsl(217_100%_50%/0.2)] blur-[110px]" aria-hidden />
      <div className="container relative py-16 text-center md:py-20">
        {eyebrow && <p className="text-xs font-bold uppercase tracking-widest text-[hsl(186_100%_55%)]">{eyebrow}</p>}
        <h1 className="mx-auto mt-2 max-w-3xl text-4xl font-extrabold text-white text-balance md:text-5xl">{title}</h1>
        {subtitle && <p className="mx-auto mt-4 max-w-xl text-lg text-asphalt-foreground/70">{subtitle}</p>}
      </div>
    </section>
  )
}
