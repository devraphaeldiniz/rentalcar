// Formato das respostas de /api/admin/reports/*, compartilhado pela tela e pelas exportações.

export type ReportBooking = {
  id: string
  start_date: string
  end_date: string
  total_amount: number | string
  status: string
  created_at: string
  user: { email: string | null; displayName: string | null } | null
  vehicle: { brand: string; model: string; plate: string | null } | null
}

export type VehicleRevenue = { brand: string; model: string; bookings: number; revenue: number }

export type FinancialReport = {
  totalRevenue: number
  totalBookings: number
  averageTicket: number
  confirmedBookings: number
  confirmationRate: string | number
  vehiclePerformance: VehicleRevenue[]
  period: string
}
