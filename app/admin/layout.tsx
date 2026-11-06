import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { requireAdminView, requireUser } from '@/lib/auth/authorization'
import { AdminShell } from '@/components/admin/admin-shell'

export const metadata: Metadata = {
  title: { default: 'Painel', template: '%s | Painel AstaCar' },
  robots: { index: false, follow: false },
}

// Barreira no servidor: só admins (e a conta de demonstração do painel, só leitura) chegam a renderizar o painel.
// Antes, um cliente que digitasse /admin via uma tela quebrada.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!(await requireUser())) redirect('/auth/signin?redirect=%2Fadmin')
  const viewer = await requireAdminView()
  if (!viewer) redirect('/')
  return <AdminShell demo={viewer.demo}>{children}</AdminShell>
}
