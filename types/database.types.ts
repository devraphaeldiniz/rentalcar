export type Profile = {
  id: string
  email: string
  full_name: string | null
  phone: string | null
  role: 'admin' | 'client'
  created_at: string
  updated_at: string
}

export type Vehicle = {
  id: string
  brand: string
  model: string
  year: number
  plate: string
  category: 'economy' | 'standard' | 'suv' | 'luxury'
  daily_rate: number
  status: 'available' | 'rented' | 'maintenance'
  image_url: string | null
  images: string[]
  features: string[]
  description: string | null
  transmission: string | null
  fuel_type: string | null
  passengers: number | null
  doors: number | null
  air_conditioning: boolean | null
  trunk_capacity: string | null
  created_at: string
  updated_at: string
}

export type Booking = {
  id: string
  user_id: string
  vehicle_id: string
  start_date: string
  end_date: string
  total_amount: number
  status: 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled'
  payment_status: 'pending' | 'paid' | 'refunded'
  notes: string | null
  customer_name: string | null
  customer_email: string | null
  customer_phone: string | null
  customer_cpf: string | null
  created_at: string
  updated_at: string
}