'use client'

import { useAuth } from '@/lib/hooks/useAuth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Mail, Phone, Calendar, Shield, User } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import Link from 'next/link'

export default function ProfilePage() {
  const { user, isAdmin } = useAuth()

  if (!user) {
    return <div className="container mx-auto px-4 py-8">Carregando...</div>
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Meu Perfil</h1>
        <p className="text-muted-foreground">Gerencie suas informações pessoais e configurações de segurança</p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Informações Básicas</CardTitle>
            <CardDescription>Suas informações pessoais</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-6">
              <Avatar className="h-24 w-24">
                <AvatarImage src={user.avatarUrl || undefined} alt={user.displayName || 'User'} />
                <AvatarFallback className="text-2xl">{getInitials(user.displayName || user.email || 'U')}</AvatarFallback>
              </Avatar>

              <div className="flex-1 space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Nome</span>
                  </div>
                  <p className="font-medium">{user.displayName || 'Não informado'}</p>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">E-mail</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{user.email}</p>
                    {user.emailVerified ? (
                      <Badge variant="secondary" className="text-green-600">
                        ✓ Verificado
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        Não verificado
                      </Badge>
                    )}
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Telefone</span>
                  </div>
                  <p className="font-medium">{user.phoneNumber || 'Não informado'}</p>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Membro desde</span>
                  </div>
                  <p className="font-medium">
                    {format(new Date(user.createdAt), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </p>
                </div>

                {isAdmin && (
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Shield className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Role</span>
                    </div>
                    <Badge variant="secondary">
                      <Shield className="h-3 w-3 mr-1" />
                      Administrador
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Configurações de Segurança</CardTitle>
            <CardDescription>Gerencie sua conta e segurança</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href="/profile/sessions">
                <Shield className="mr-2 h-4 w-4" />
                Sessões Ativas
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href="/profile/security">
                <Shield className="mr-2 h-4 w-4" />
                Autenticação de 2 Fatores
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href="/profile/audit-logs">
                <Shield className="mr-2 h-4 w-4" />
                Histórico de Atividades
              </Link>
            </Button>
            <Separator />
            <Button variant="outline" className="w-full justify-start text-red-600 hover:text-red-700" asChild>
              <Link href="/profile/change-password">
                Alterar Senha
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
