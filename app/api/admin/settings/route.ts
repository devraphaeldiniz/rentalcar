import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
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
  try {
    // Aqui você buscaria as configurações do banco de dados
    const settings = {
      siteName: 'RentalCar',
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

    return NextResponse.json({ settings })
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro ao buscar configurações' },
      { status: 500 }
    )
  }
}
