import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { requireUser, getUserRole } from '@/lib/auth/authorization'
import { AdminShell } from '@/components/admin/admin-shell'

export const metadata: Metadata = {
  title: { default: 'Painel', template: '%s | Painel AstaCar' },
  robots: { index: false, follow: false },
}

// Barreira no servidor: só admins chegam a renderizar o painel.
// Antes, um cliente que digitasse /admin via uma tela quebrada.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser()
  if (!user) redirect('/auth/signin?redirect=%2Fadmin')
  if ((await getUserRole(user.userId)) !== 'admin') redirect('/')
  return <AdminShell>{children}</AdminShell>
}
