import Link from 'next/link'

/**
 * Faixa fixa no topo de todas as páginas: deixa claro, antes de qualquer clique,
 * que a AstaCar é um projeto de portfólio e que nenhuma reserva é real.
 */
export function DemoNotice() {
  return (
    <div role="note" aria-label="Aviso de projeto de portfólio" className="border-b border-electric/40 bg-electric/10 px-4 py-2 text-center text-xs sm:text-sm">
      <strong className="font-semibold">Projeto de portfólio.</strong> A AstaCar não é uma locadora real: nenhum carro é alugado e nenhum pagamento é cobrado.{' '}
      <Link href="/sobre" className="font-semibold underline underline-offset-2">
        Saiba mais
      </Link>
    </div>
  )
}
