import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type StatsCardProps = {
  title: string
  value: string | number
}

export function StatsCard({ title, value }: StatsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value}</div>
      </CardContent>
    </Card>
  )
}