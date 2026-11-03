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
import { Logo } from '@/components/brand/logo'
import { ThemeToggle } from '@/components/theme/theme-toggle'
import { useAuth } from '@/lib/hooks/useAuth'
import { User, Shield, CalendarCheck, LogOut, ChevronDown, Menu, X } from 'lucide-react'

const LINKS: [string, string][] = [
  ['/', 'Alugar carro'],
  ['/profile/bookings', 'Minhas reservas'],
  ['/sobre', 'Sobre'],
  ['/contato', 'Atendimento'],
]

export function Header() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, isAuthenticated, isAdmin, isLoading, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  // Fecha o menu do celular ao trocar de página.
  useEffect(() => { setMenuOpen(false) }, [pathname])

  // O painel admin tem a própria navegação lateral.
  if (pathname?.startsWith('/admin')) return null

  const signinHref = `/auth/signin${pathname && pathname !== '/' && !pathname.startsWith('/auth') ? `?redirect=${encodeURIComponent(pathname)}` : ''}`

  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur-lg supports-[backdrop-filter]:bg-background/70">
      <div className="container flex h-[4.5rem] items-center justify-between gap-4">
        <div className="flex items-center gap-8">
          <Logo />
          <nav className="hidden lg:flex items-center gap-1" aria-label="Principal">
            {LINKS.map(([href, label]) => {
              const active = pathname === href
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className={`rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
                    active
                      ? 'bg-electric/10 text-electric ring-1 ring-inset ring-electric/25'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  }`}
                >
                  {label}
                </Link>
              )
            })}
          </nav>
        </div>

        <div className="flex items-center justify-end gap-1.5 sm:gap-2">
          <ThemeToggle />
          {isLoading ? (
            <span className="h-10 w-24 animate-pulse rounded-lg bg-muted" aria-hidden />
          ) : isAuthenticated && user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2 px-3" aria-label="Minha conta">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-electric/15 text-xs font-bold uppercase text-electric" aria-hidden>
                    {(user.displayName || user.email || '?').charAt(0)}
                  </span>
                  <span className="hidden max-w-[9rem] truncate sm:inline">{user.displayName || user.email?.split('@')[0] || 'Minha conta'}</span>
                  <ChevronDown className="hidden h-4 w-4 opacity-60 sm:inline" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-60" align="end">
                <DropdownMenuLabel className="font-normal">
                  <p className="text-sm font-semibold">{user.displayName || 'Minha conta'}</p>
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
              <Button variant="outline" asChild className="hidden sm:inline-flex">
                <Link href={signinHref}><User className="h-4 w-4" /> Entrar</Link>
              </Button>
              <Button variant="brand" asChild className="hidden sm:inline-flex">
                <Link href="/auth/signup">Cadastre-se</Link>
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={menuOpen}
            aria-controls="menu-celular"
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {menuOpen && (
        <nav id="menu-celular" aria-label="Menu" className="border-t bg-background lg:hidden">
          <div className="container flex flex-col gap-1 py-3">
            {LINKS.map(([href, label]) => (
              <Link
                key={href}
                href={href}
                aria-current={pathname === href ? 'page' : undefined}
                className={`rounded-lg px-3 py-3 text-base font-medium ${pathname === href ? 'bg-electric/10 text-electric' : 'hover:bg-accent'}`}
              >
                {label}
              </Link>
            ))}
            {!isLoading && !isAuthenticated && (
              <div className="mt-2 grid grid-cols-2 gap-2 border-t pt-4 sm:hidden">
                <Button variant="outline" asChild><Link href={signinHref}>Entrar</Link></Button>
                <Button variant="brand" asChild><Link href="/auth/signup">Criar conta</Link></Button>
              </div>
            )}
          </div>
        </nav>
      )}
    </header>
  )
}
