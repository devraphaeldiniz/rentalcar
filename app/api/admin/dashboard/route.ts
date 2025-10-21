import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // TODO: Buscar dados reais do banco
    // Por enquanto, dados mockados
    
    const stats = {
      totalUsers: 127,
      totalVehicles: 15,
      totalBookings: 89,
      activeBookings: 12,
      revenue: 45800,
      securityAlerts: 0,
      usersGrowth: 15.3,
      bookingsGrowth: 23.7,
    }

    return NextResponse.json(stats)
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro ao buscar estatísticas' },
      { status: 500 }
    )
  }
}
