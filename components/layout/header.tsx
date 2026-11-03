'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/lib/hooks/useAuth'
import { User, Shield, CalendarCheck, LogOut, ChevronDown, Menu, X } from 'lucide-react'

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2" aria-label="RentalCar, página inicial">
      {/* Marca: placa retangular com a faixa amarela */}
      <span className="relative inline-flex h-8 w-11 items-center justify-center rounded-md bg-primary text-primary-foreground text-sm font-bold" style={{ fontStretch: '125%' }}>
        RC
        <span className="absolute bottom-1 left-2 right-2 h-0.5 bg-lane" aria-hidden />
      </span>
      <span className="text-lg font-bold" style={{ fontStretch: '112%' }}>RentalCar</span>
    </Link>
  )
}

export function Header() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, isAuthenticated, isAdmin, isLoading, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  // Fecha o menu do celular ao trocar de página.
  useEffect(() => { setMenuOpen(false) }, [pathname])

  // O painel admin tem a própria navegação lateral.
  if (pathname?.startsWith('/admin')) return null

  const links: [string, string][] = [
    ['/', 'Carros'],
    ['/profile/bookings', 'Minhas reservas'],
    ['/sobre', 'Sobre'],
    ['/contato', 'Contato'],
  ]

  const navLink = (href: string, label: string) => (
    <Link
      key={href}
      href={href}
      aria-current={pathname === href ? 'page' : undefined}
      className={`text-sm font-medium hover:text-primary ${pathname === href ? 'text-primary' : 'text-foreground/80'}`}
    >
      {label}
    </Link>
  )

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container flex h-16 items-center justify-between gap-4">
        <Logo />

        <nav className="hidden md:flex items-center gap-6" aria-label="Principal">
          {links.map(([href, label]) => navLink(href, label))}
        </nav>

        <div className="flex items-center justify-end gap-1 sm:gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={menuOpen}
            aria-controls="menu-celular"
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          {isLoading ? null : isAuthenticated && user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2 px-3" aria-label="Minha conta">
                  <User className="h-4 w-4" />
                  <span className="hidden max-w-[9rem] truncate sm:inline">{user.displayName || user.email?.split('@')[0] || 'Minha conta'}</span>
                  <ChevronDown className="hidden h-4 w-4 opacity-60 sm:inline" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end">
                <DropdownMenuLabel className="font-normal">
                  <p className="text-sm font-medium">{user.displayName || 'Minha conta'}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push('/profile/bookings')}>
                  <CalendarCheck className="mr-2 h-4 w-4" />
                  Minhas reservas
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/profile')}>
                  <User className="mr-2 h-4 w-4" />
                  Meus dados
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem onClick={() => router.push('/admin')}>
                    <Shield className="mr-2 h-4 w-4" />
                    Painel administrativo
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button variant="ghost" asChild>
                <Link href={`/auth/signin${pathname && pathname !== '/' ? `?redirect=${encodeURIComponent(pathname)}` : ''}`}>Entrar</Link>
              </Button>
              <Button asChild className="hidden sm:inline-flex">
                <Link href="/auth/signup">Criar conta</Link>
              </Button>
            </>
          )}
        </div>
      </div>
      {menuOpen && (
        <nav id="menu-celular" aria-label="Menu" className="border-t bg-background md:hidden">
          <div className="container flex flex-col py-2">
            {links.map(([href, label]) => (
              <Link
                key={href}
                href={href}
                aria-current={pathname === href ? 'page' : undefined}
                className={`py-3 text-base font-medium ${pathname === href ? 'text-primary' : ''}`}
              >
                {label}
              </Link>
            ))}
            {!isAuthenticated && (
              <Link href="/auth/signup" className="py-3 text-base font-medium text-primary">Criar conta</Link>
            )}
          </div>
        </nav>
      )}
    </header>
  )
}
