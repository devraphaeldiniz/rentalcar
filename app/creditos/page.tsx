import { adminGraphql } from '@/lib/auth/authorization'

export const metadata = { title: 'Créditos das fotos' }

type Row = {
  id: string
  brand: string
  model: string
  image_credits: { author: string; license: string; source: string }[] | null
}

export default async function CreditsPage() {
  const data = await adminGraphql<{ vehicles: Row[] }>(
    `query Credits { vehicles(order_by: [{ brand: asc }, { model: asc }]) { id brand model image_credits } }`,
  ).catch(() => ({ vehicles: [] as Row[] }))

  const rows = data.vehicles.filter((v) => v.image_credits && v.image_credits.length > 0)

  return (
    <main className="container max-w-3xl py-12">
      <h1 className="text-3xl font-bold">Créditos das fotos</h1>
      <p className="mt-3 text-muted-foreground">
        As fotos dos carros são imagens ilustrativas dos modelos, publicadas no Wikimedia Commons por seus autores
        sob licenças Creative Commons. Cada link leva à página original da foto, com a licença completa.
      </p>
      <ul className="mt-8 divide-y border-y">
        {rows.map((v) =>
          v.image_credits!.map((c, i) => (
            <li key={`${v.id}-${i}`} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-baseline sm:justify-between">
              <span className="font-medium">{v.brand} {v.model}</span>
              <span className="text-sm text-muted-foreground">
                <a href={c.source} target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">{c.author}</a>
                {', '}{c.license}
              </span>
            </li>
          )),
        )}
      </ul>
    </main>
  )
}
