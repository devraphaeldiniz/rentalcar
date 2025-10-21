'use client'

import { useAuth } from '@/lib/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Link from 'next/link'
import { 
  LayoutDashboard, 
  Users, 
  Car, 
  Calendar, 
  Shield, 
  Settings,
  TrendingUp
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePathname } from 'next/navigation'

const adminRoutes = [
  {
    label: 'Dashboard',
    icon: LayoutDashboard,
    href: '/admin',
    color: 'text-sky-500'
  },
  {
    label: 'Usuários',
    icon: Users,
    href: '/admin/users',
    color: 'text-violet-500'
  },
  {
    label: 'Veículos',
    icon: Car,
    href: '/admin/vehicles',
    color: 'text-pink-500'
  },
  {
    label: 'Reservas',
    icon: Calendar,
    href: '/admin/bookings',
    color: 'text-orange-500'
  },
  {
    label: 'Segurança',
    icon: Shield,
    href: '/admin/security',
    color: 'text-green-500'
  },
  {
    label: 'Estatísticas',
    icon: TrendingUp,
    href: '/admin/analytics',
    color: 'text-blue-500'
  },
  {
    label: 'Configurações',
    icon: Settings,
    href: '/admin/settings',
    color: 'text-gray-500'
  },
]

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, isAdmin, isAuthenticated } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/signin')
    } else if (!isAdmin) {
      router.push('/')
    }
  }, [isAuthenticated, isAdmin, router])

  if (!isAuthenticated || !isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Verificando permissões...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex">
      {/* Sidebar */}
      <div className="hidden md:flex md:w-72 md:flex-col md:fixed md:inset-y-0 z-50 bg-muted">
        <div className="flex flex-col flex-grow pt-5 overflow-y-auto border-r">
          <div className="flex items-center flex-shrink-0 px-4">
            <Shield className="h-8 w-8 text-primary" />
            <span className="ml-2 text-xl font-bold">Admin Panel</span>
          </div>
          <div className="mt-8 flex-1 flex flex-col">
            <nav className="flex-1 px-2 space-y-1">
              {adminRoutes.map((route) => (
                <Link
                  key={route.href}
                  href={route.href}
                  className={cn(
                    'group flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-colors',
                    pathname === route.href
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted-foreground/10'
                  )}
                >
                  <route.icon
                    className={cn(
                      'mr-3 flex-shrink-0 h-5 w-5',
                      pathname === route.href ? '' : route.color
                    )}
                  />
                  {route.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex-shrink-0 flex border-t p-4">
            <div className="flex items-center">
              <div>
                <p className="text-sm font-medium">{user?.displayName}</p>
                <p className="text-xs text-muted-foreground">Administrador</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="md:pl-72 flex flex-col flex-1">
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
