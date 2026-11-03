import { redirect } from 'next/navigation'
import { requireUser, getUserRole } from '@/lib/auth/authorization'
import { AdminShell } from '@/components/admin/admin-shell'

// Barreira no servidor: só admins chegam a renderizar o painel.
// Antes, um cliente que digitasse /admin via uma tela quebrada.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser()
  if (!user) redirect('/auth/signin?redirect=%2Fadmin')
  if ((await getUserRole(user.userId)) !== 'admin') redirect('/')
  return <AdminShell>{children}</AdminShell>
}
