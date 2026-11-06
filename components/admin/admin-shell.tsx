'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Activity,
  LayoutDashboard,
  Users,
  Car,
  Calendar,
  Shield,
  TrendingUp,
  Settings,
  FileBarChart,
  LogOut,
  Star,
  Mail,
  Menu,
  X,
  ExternalLink,
  Filter,
  Tags,
  Megaphone,
  CalendarClock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme/theme-toggle'
import { Logo } from '@/components/brand/logo'

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/admin' },
  { icon: CalendarClock, label: 'Agenda', href: '/admin/agenda' },
  { icon: Users, label: 'Usuários', href: '/admin/users' },
  { icon: Car, label: 'Veículos', href: '/admin/vehicles' },
  { icon: Calendar, label: 'Reservas', href: '/admin/bookings' },
  { icon: Tags, label: 'Preços e opcionais', href: '/admin/precos' },
  { icon: Megaphone, label: 'Banners', href: '/admin/banners' },
  { icon: Star, label: 'Avaliações', href: '/admin/reviews' },
  { icon: Mail, label: 'Mensagens', href: '/admin/messages' },
  { icon: Shield, label: 'Segurança', href: '/admin/security' },
  { icon: FileBarChart, label: 'Relatórios', href: '/admin/reports' },
  { icon: TrendingUp, label: 'Estatísticas', href: '/admin/analytics' },
  { icon: Filter, label: 'Funil e visitas', href: '/admin/funil' },
  { icon: Activity, label: 'Erros e saúde', href: '/admin/erros' },
  { icon: Settings, label: 'Configurações', href: '/admin/settings' },
]

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)

  useEffect(() => { setOpen(false) }, [pathname])

  const handleLogout = async () => {
    await fetch('/api/auth/signout', { method: 'POST' })
    router.push('/auth/signin')
  }

  const isActive = (href: string) => (href === '/admin' ? pathname === href : pathname?.startsWith(href))

  return (
    <div className="flex h-screen bg-background">
      {/* Fundo escuro atrás do menu no celular */}
      {open && <button type="button" aria-label="Fechar menu" className="fixed inset-0 z-30 bg-black/60 lg:hidden" onClick={() => setOpen(false)} />}

      <aside
        id="admin-menu"
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-asphalt text-asphalt-foreground transition-transform lg:static lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-[4.5rem] items-center justify-between border-b border-white/5 px-5">
          <Logo href="/admin" onDark tagline={false} />
          <span className="rounded-md bg-[hsl(186_100%_50%/0.12)] px-2 py-0.5 text-[0.625rem] font-bold uppercase tracking-wider text-[hsl(186_100%_60%)]">Admin</span>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3" aria-label="Painel">
          {menuItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-[hsl(217_100%_50%)] text-white shadow-lg shadow-[hsl(217_100%_50%/0.3)]'
                    : 'text-asphalt-foreground/70 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon className="h-5 w-5" aria-hidden />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="space-y-1 border-t border-white/5 p-3">
          <Link href="/" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-asphalt-foreground/70 hover:bg-white/5 hover:text-white">
            <ExternalLink className="h-5 w-5" aria-hidden /> Abrir o site
          </Link>
          <button type="button" onClick={handleLogout} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-asphalt-foreground/70 hover:bg-white/5 hover:text-white">
            <LogOut className="h-5 w-5" aria-hidden /> Sair
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-14 shrink-0 items-center justify-between border-b px-4 lg:h-[4.5rem] lg:px-8">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label={open ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={open}
            aria-controls="admin-menu"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <p className="text-sm font-semibold text-muted-foreground">
            {menuItems.find((i) => isActive(i.href))?.label ?? 'Painel administrativo'}
          </p>
          <ThemeToggle />
        </div>
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  )
}
