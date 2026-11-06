export const dynamic = 'force-dynamic'
import { type NextRequest, NextResponse } from 'next/server'
import { requireAdmin, requireAdminView } from '@/lib/auth/authorization'
import { viewerJson } from '@/lib/auth/admin-view'

export async function POST(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  try {
    const settings = await req.json()
    
    // Aqui você salvaria as configurações no banco de dados
    // Por enquanto, apenas retorna sucesso
    
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro ao salvar configurações' },
      { status: 500 }
    )
  }
}

export async function GET() {
  const viewer = await requireAdminView()
  if (!viewer) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  try {
    // Aqui você buscaria as configurações do banco de dados
    const settings = {
      siteName: 'AstaCar',
      siteDescription: 'Sistema de aluguel de veículos',
      contactEmail: 'contato@rentalcar.com',
      supportEmail: 'suporte@rentalcar.com',
      enableNotifications: true,
      enableEmailAlerts: true,
      enableAutoApproval: false,
      maintenanceMode: false,
      maxBookingDays: 30,
      minBookingDays: 1,
      cancellationDeadline: 24
    }

    return viewerJson(viewer, { settings })
  } catch (error) {
    return viewerJson(viewer, 
      { error: 'Erro ao buscar configurações' },
      { status: 500 }
    )
  }
}
