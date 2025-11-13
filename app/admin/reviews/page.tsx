'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Star, Check, X } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/lib/contexts/toast-context'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Review {
  id: string
  rating: number
  comment: string
  status: string
  created_at: string
  user: {
    email: string
    displayName?: string
  }
  vehicle: {
    brand: string
    model: string
  }
}

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { showToast } = useToast()

  useEffect(() => {
    loadReviews()
  }, [])

  const loadReviews = async () => {
    try {
      const response = await fetch('/api/admin/reviews')
      const data = await response.json()
      setReviews(data)
    } catch (error) {
      showToast('Erro ao carregar avaliações', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const updateStatus = async (id: string, status: string) => {
    try {
      const response = await fetch('/api/admin/reviews', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status })
      })

      if (!response.ok) throw new Error()

      showToast(`Avaliação ${status === 'approved' ? 'aprovada' : 'rejeitada'}!`, 'success')
      loadReviews()
    } catch (error) {
      showToast('Erro ao atualizar avaliação', 'error')
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      pending: { variant: 'secondary', text: 'Pendente' },
      approved: { variant: 'default', text: 'Aprovada' },
      rejected: { variant: 'destructive', text: 'Rejeitada' }
    }
    const config = variants[status] || variants.pending
    return <Badge variant={config.variant}>{config.text}</Badge>
  }

  if (isLoading) {
    return (
      <div className="p-8 space-y-4">
        <Skeleton className="h-12 w-64" />
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Moderação de Avaliações</h1>
        <p className="text-muted-foreground">Aprovar ou rejeitar avaliações de clientes</p>
      </div>

      <div className="space-y-4">
        {reviews.map((review) => (
          <Card key={review.id}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-semibold">
                      {review.user.displayName || review.user.email}
                    </span>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-4 w-4 ${
                            star <= review.rating
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                    {getStatusBadge(review.status)}
                  </div>

                  <div className="text-sm text-muted-foreground mb-2">
                    <strong>{review.vehicle.brand} {review.vehicle.model}</strong>
                  </div>

                  {review.comment && (
                    <p className="mb-2">{review.comment}</p>
                  )}

                  <p className="text-sm text-muted-foreground">
                    {format(new Date(review.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>

                {review.status === 'pending' && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateStatus(review.id, 'approved')}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Aprovar
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => updateStatus(review.id, 'rejected')}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Rejeitar
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        {reviews.length === 0 && (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
              Nenhuma avaliação encontrada.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
