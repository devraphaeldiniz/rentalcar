import type { Metadata } from 'next'

// A página de contato é um componente de cliente; o título fica aqui.
export const metadata: Metadata = {
  title: 'Contato',
  description: 'Fale com a AstaCar: dúvidas sobre reservas, frota e atendimento.',
}

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children
}
