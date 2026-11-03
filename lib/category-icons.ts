import { Car, Leaf, Mountain, Users, Truck, Zap, Gem, Gauge, type LucideIcon } from 'lucide-react'

/** Ícone de cada categoria da frota (mesmas chaves de CATEGORY_LABELS). */
export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  economy: Leaf,
  standard: Car,
  suv: Mountain,
  minivan: Users,
  pickup: Truck,
  electric: Zap,
  luxury: Gem,
  sports: Gauge,
}

export const categoryIcon = (category?: string): LucideIcon => (category && CATEGORY_ICONS[category]) || Car
