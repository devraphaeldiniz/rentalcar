// Endereço público do site, usado em links absolutos (sitemap, Open Graph).
// Em produção na Vercel vem do domínio principal do projeto; dá para fixar com NEXT_PUBLIC_SITE_URL.
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '') ||
  'http://localhost:3000'
).replace(/\/$/, '')

export const SITE_NAME = 'AstaCar'

/** Páginas de categoria com endereço amigável (ex.: /aluguel/suv). */
export const CATEGORY_SLUGS: Record<string, string> = {
  economy: 'economico',
  standard: 'intermediario',
  suv: 'suv',
  minivan: '7-lugares',
  pickup: 'picape',
  electric: 'eletrico-e-hibrido',
  luxury: 'executivo',
  sports: 'esportivo',
}

export const CATEGORY_BY_SLUG = Object.fromEntries(Object.entries(CATEGORY_SLUGS).map(([k, v]) => [v, k])) as Record<string, string>

export const CATEGORY_INTRO: Record<string, string> = {
  economy: 'Carros compactos e econômicos para rodar na cidade gastando pouco combustível.',
  standard: 'Sedãs e hatches médios com mais espaço e conforto para viagens.',
  suv: 'SUVs com posição de dirigir elevada, porta-malas amplo e conforto para estrada.',
  minivan: 'Sete lugares para a família inteira ou para o grupo de amigos viajar junto.',
  pickup: 'Picapes para trabalho, carga ou aventura fora do asfalto.',
  electric: 'Elétricos e híbridos para economizar e rodar com menos emissões.',
  luxury: 'Sedãs e SUVs executivos para viagens de negócio com mais requinte.',
  sports: 'Esportivos para quem quer dirigir por prazer, de fim de semana ou em ocasiões especiais.',
}
