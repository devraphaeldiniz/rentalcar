'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function Footer() {
  const pathname = usePathname()
  if (pathname?.startsWith('/admin')) return null

  return (
    <footer className="bg-asphalt text-asphalt-foreground mt-16">

      <div className="container py-10 grid gap-8 md:grid-cols-3 text-sm">
        <div>
          <p className="text-lg font-bold" style={{ fontStretch: '112%' }}>RentalCar</p>
          <p className="mt-2 text-asphalt-foreground/70 max-w-xs">
            Aluguel de carros com reserva online e valor total antes de confirmar.
          </p>
        </div>
        <nav className="flex flex-col gap-2" aria-label="Rodapé">
          <Link href="/" className="hover:text-lane">Carros disponíveis</Link>
          <Link href="/profile/bookings" className="hover:text-lane">Minhas reservas</Link>
          <Link href="/sobre" className="hover:text-lane">Sobre</Link>
          <Link href="/contato" className="hover:text-lane">Contato</Link>
        </nav>
        <p className="text-asphalt-foreground/60 md:text-right">
          Projeto de portfólio. Reservas não geram cobrança.
        </p>
      </div>
    </footer>
  )
}
