'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Laptop, Smartphone, Monitor, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

type Session = {
  id: string
  user_agent: string
  ip_address: string
  last_active: string
  created_at: string
  device_name?: string
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetchSessions()
  }, [])

  const fetchSessions = async () => {
    try {
      const response = await fetch('/api/profile/sessions')
      const data = await response.json()
      setSessions(data.sessions || [])
    } catch (error) {
      console.error('Erro ao buscar sessões:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const revokeSession = async (sessionId: string) => {
    try {
      const response = await fetch('/api/profile/sessions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      })

      if (response.ok) {
        setMessage('Sessão encerrada com sucesso!')
        fetchSessions()
      }
    } catch (error) {
      setMessage('Erro ao encerrar sessão')
    }
  }

  const revokeAllSessions = async () => {
    if (!confirm('Tem certeza que deseja encerrar todas as outras sessões?')) return

    try {
      const response = await fetch('/api/profile/sessions/revoke-all', {
        method: 'POST',
      })

      if (response.ok) {
        setMessage('Todas as outras sessões foram encerradas!')
        fetchSessions()
      }
    } catch (error) {
      setMessage('Erro ao encerrar sessões')
    }
  }

  const getDeviceIcon = (userAgent: string) => {
    const ua = userAgent.toLowerCase()
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
      return <Smartphone className="h-5 w-5" />
    }
    if (ua.includes('tablet') || ua.includes('ipad')) {
      return <Monitor className="h-5 w-5" />
    }
    return <Laptop className="h-5 w-5" />
  }

  const getDeviceInfo = (userAgent: string) => {
    const ua = userAgent.toLowerCase()
    if (ua.includes('chrome')) return 'Chrome'
    if (ua.includes('firefox')) return 'Firefox'
    if (ua.includes('safari')) return 'Safari'
    if (ua.includes('edge')) return 'Edge'
    return 'Navegador desconhecido'
  }

  if (isLoading) {
    return <div className="container mx-auto px-4 py-8">Carregando...</div>
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Sessões Ativas</h1>
        <p className="text-muted-foreground">Gerencie os dispositivos conectados à sua conta</p>
      </div>

      {message && (
        <Alert className="mb-6">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      <div className="mb-6">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Por questões de segurança, recomendamos encerrar sessões de dispositivos que você não reconhece.
          </AlertDescription>
        </Alert>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Dispositivos Conectados</CardTitle>
          <CardDescription>
            {sessions.length} {sessions.length === 1 ? 'sessão ativa' : 'sessões ativas'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {sessions.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Nenhuma sessão ativa encontrada
            </p>
          ) : (
            sessions.map((session, index) => (
              <div
                key={session.id}
                className="flex items-start justify-between p-4 border rounded-lg"
              >
                <div className="flex items-start gap-4">
                  <div className="mt-1">
                    {getDeviceIcon(session.user_agent)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium">{getDeviceInfo(session.user_agent)}</p>
                      {index === 0 && (
                        <Badge variant="secondary">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Sessão atual
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">IP: {session.ip_address}</p>
                    <p className="text-sm text-muted-foreground">
                      Última atividade: {format(new Date(session.last_active), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Conectado desde: {format(new Date(session.created_at), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  </div>
                </div>
                {index !== 0 && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => revokeSession(session.id)}
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Encerrar
                  </Button>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {sessions.length > 1 && (
        <Button
          variant="destructive"
          className="w-full"
          onClick={revokeAllSessions}
        >
          Encerrar todas as outras sessões
        </Button>
      )}
    </div>
  )
}
