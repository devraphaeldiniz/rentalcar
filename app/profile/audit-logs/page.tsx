'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Shield, 
  LogIn, 
  LogOut, 
  UserPlus, 
  Key, 
  Car, 
  Edit, 
  Trash2,
  Calendar,
  MapPin,
  Monitor
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

type AuditLog = {
  id: string
  action: string
  resource?: string
  resource_id?: string
  ip_address?: string
  user_agent?: string
  metadata?: Record<string, any>
  created_at: string
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  useEffect(() => {
    fetchLogs()
  }, [page])

  const fetchLogs = async () => {
    try {
      const response = await fetch(`/api/profile/audit-logs?page=${page}&limit=20`)
      const data = await response.json()
      
      if (page === 1) {
        setLogs(data.logs || [])
      } else {
        setLogs(prev => [...prev, ...(data.logs || [])])
      }
      
      setHasMore(data.hasMore || false)
    } catch (error) {
      console.error('Erro ao buscar logs:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getActionIcon = (action: string) => {
    const iconMap: Record<string, any> = {
      'user.login': LogIn,
      'user.logout': LogOut,
      'user.register': UserPlus,
      'user.password_reset': Key,
      'user.2fa_enabled': Shield,
      'user.2fa_disabled': Shield,
      'booking.created': Car,
      'booking.updated': Edit,
      'booking.cancelled': Trash2,
      'vehicle.created': Car,
      'vehicle.updated': Edit,
      'vehicle.deleted': Trash2,
      'admin.access': Shield,
    }
    
    const Icon = iconMap[action] || Monitor
    return <Icon className="h-4 w-4" />
  }

  const getActionColor = (action: string) => {
    if (action.includes('login') || action.includes('register')) return 'text-green-600'
    if (action.includes('logout')) return 'text-blue-600'
    if (action.includes('delete') || action.includes('cancel')) return 'text-red-600'
    if (action.includes('2fa') || action.includes('admin')) return 'text-purple-600'
    return 'text-gray-600'
  }

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      'user.login': 'Login realizado',
      'user.logout': 'Logout realizado',
      'user.register': 'Conta criada',
      'user.password_reset': 'Senha redefinida',
      'user.2fa_enabled': '2FA ativado',
      'user.2fa_disabled': '2FA desativado',
      'booking.created': 'Reserva criada',
      'booking.updated': 'Reserva atualizada',
      'booking.cancelled': 'Reserva cancelada',
      'vehicle.created': 'Veículo adicionado',
      'vehicle.updated': 'Veículo atualizado',
      'vehicle.deleted': 'Veículo removido',
      'admin.access': 'Acesso admin',
    }
    
    return labels[action] || action
  }

  const getBrowserInfo = (userAgent?: string) => {
    if (!userAgent) return 'Desconhecido'
    
    const ua = userAgent.toLowerCase()
    if (ua.includes('chrome')) return 'Chrome'
    if (ua.includes('firefox')) return 'Firefox'
    if (ua.includes('safari')) return 'Safari'
    if (ua.includes('edge')) return 'Edge'
    return 'Navegador desconhecido'
  }

  if (isLoading && page === 1) {
    return <div className="container mx-auto px-4 py-8">Carregando...</div>
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Histórico de Atividades</h1>
        <p className="text-muted-foreground">
          Acompanhe todas as ações realizadas em sua conta
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Atividades Recentes</CardTitle>
          <CardDescription>
            {logs.length} {logs.length === 1 ? 'atividade registrada' : 'atividades registradas'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhuma atividade registrada
            </p>
          ) : (
            <div className="space-y-4">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className={`mt-1 ${getActionColor(log.action)}`}>
                    {getActionIcon(log.action)}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium">{getActionLabel(log.action)}</p>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(log.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </div>
                          
                          {log.ip_address && (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {log.ip_address}
                            </div>
                          )}
                          
                          {log.user_agent && (
                            <div className="flex items-center gap-1">
                              <Monitor className="h-3 w-3" />
                              {getBrowserInfo(log.user_agent)}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {log.resource && (
                        <Badge variant="secondary">
                          {log.resource}
                        </Badge>
                      )}
                    </div>
                    
                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                      <div className="mt-2 p-2 bg-muted/50 rounded text-xs">
                        <pre className="text-muted-foreground overflow-x-auto">
                          {JSON.stringify(log.metadata, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {hasMore && logs.length > 0 && (
            <div className="mt-6 text-center">
              <Button
                variant="outline"
                onClick={() => setPage(prev => prev + 1)}
                disabled={isLoading}
              >
                {isLoading ? 'Carregando...' : 'Carregar mais'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Informações sobre o Histórico</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            <strong>Segurança:</strong> Todas as atividades importantes são registradas e 
            armazenadas de forma segura.
          </p>
          <p>
            <strong>Privacidade:</strong> Apenas você e administradores autorizados podem 
            visualizar seu histórico.
          </p>
          <p>
            <strong>Retenção:</strong> Os registros são mantidos por 90 dias para fins de 
            auditoria e segurança.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
