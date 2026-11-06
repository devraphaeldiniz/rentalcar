'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Search, Shield, User, Edit, Loader2, Ban, CheckCircle2 } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useConfirm } from '@/components/admin/confirm-dialog'
import { useToast } from '@/lib/contexts/toast-context'

type Profile = {
  id: string
  full_name: string
  phone: string
  cpf: string
  email: string
  email_verified: boolean
  role: string
  created_at: string
  blocked: boolean
}

export default function UsersAdminPage() {
  const { confirm, dialog } = useConfirm()
  const { showToast } = useToast()
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null)
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    cpf: ''
  })

  useEffect(() => {
    fetchProfiles()
  }, [])

  const fetchProfiles = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/admin/profiles')
      const data = await response.json()
      setProfiles(data.profiles || [])
    } catch (error) {
      console.error('Erro ao buscar perfis:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const [busyId, setBusyId] = useState<string | null>(null)
  const [actionError, setActionError] = useState('')

  const busyRef = useRef(false)
  const runAction = async (profile: Profile, url: string, body: object, confirmText: string, destructive = false) => {
    if (busyRef.current) return
    if (!(await confirm({ title: confirmText, confirmLabel: 'Confirmar', destructive }))) return
    busyRef.current = true
    setBusyId(profile.id)
    setActionError('')
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) setActionError(result.error || 'Não foi possível concluir a ação.')
      else await fetchProfiles()
    } finally {
      busyRef.current = false
      setBusyId(null)
    }
  }

  const toggleAdmin = (profile: Profile) => {
    const role = profile.role === 'admin' ? 'client' : 'admin'
    runAction(profile, '/api/admin/users/role', { userId: profile.id, role },
      role === 'admin'
        ? `Dar acesso de administrador para ${profile.email}?`
        : `Remover o acesso de administrador de ${profile.email}?`, role !== 'admin')
  }

  const toggleBlock = (profile: Profile) => {
    const block = !profile.blocked
    runAction(profile, '/api/admin/users/block', { userId: profile.id, block },
      block
        ? `Bloquear ${profile.email}? A pessoa não consegue mais entrar e as sessões abertas são encerradas.`
        : `Desbloquear ${profile.email}?`, block)
  }

  const handleEdit = (profile: Profile) => {
    setEditingProfile(profile)
    setFormData({
      fullName: profile.full_name || '',
      phone: profile.phone || '',
      cpf: profile.cpf || ''
    })
    setIsDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingProfile) return

    try {
      const response = await fetch(`/api/admin/profiles/${editingProfile.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: formData.fullName,
          phone: formData.phone,
          cpf: formData.cpf
        }),
      })

      if (response.ok) {
        fetchProfiles()
        setIsDialogOpen(false)
        setEditingProfile(null)
      } else {
        const result = await response.json().catch(() => ({}))
        showToast(result.error || 'Não foi possível salvar o perfil.', 'error')
      }
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error)
      showToast('Sem conexão com o servidor.', 'error')
    }
  }

  const filteredProfiles = profiles.filter(profile =>
    profile.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    profile.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="p-8">
      {dialog}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Usuários</h1>
        <p className="text-muted-foreground">Gerencie os perfis dos usuários</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por email ou nome..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <>
              <div className="mb-4 text-sm text-muted-foreground">
                Total de usuários: {profiles.length} | Exibindo: {filteredProfiles.length}
              </div>
              {actionError && (
                <p role="alert" className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">{actionError}</p>
              )}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>CPF</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Cadastro</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProfiles.map((profile) => (
                    <TableRow key={profile.id}>
                      <TableCell>{profile.email || '-'}</TableCell>
                      <TableCell>{profile.full_name || '-'}</TableCell>
                      <TableCell>{profile.phone || '-'}</TableCell>
                      <TableCell>{profile.cpf || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={profile.role === 'admin' ? 'default' : 'secondary'}>
                          {profile.role === 'admin' ? (
                            <>
                              <Shield className="h-3 w-3 mr-1" />
                              Admin
                            </>
                          ) : (
                            <>
                              <User className="h-3 w-3 mr-1" />
                              Cliente
                            </>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={profile.blocked ? 'destructive' : 'default'}>
                          {profile.blocked ? 'Bloqueado' : 'Ativo'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(profile.created_at), "dd/MM/yyyy", { locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(profile)}
                            aria-label={`Editar dados de ${profile.email}`}
                            title="Editar dados"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={busyId === profile.id}
                            onClick={() => toggleAdmin(profile)}
                            aria-label={profile.role === 'admin' ? `Remover admin de ${profile.email}` : `Tornar ${profile.email} admin`}
                            title={profile.role === 'admin' ? 'Remover acesso de admin' : 'Tornar admin'}
                          >
                            {profile.role === 'admin' ? <User className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={busyId === profile.id}
                            onClick={() => toggleBlock(profile)}
                            aria-label={profile.blocked ? `Desbloquear ${profile.email}` : `Bloquear ${profile.email}`}
                            title={profile.blocked ? 'Desbloquear' : 'Bloquear'}
                            className={profile.blocked ? '' : 'text-destructive hover:text-destructive'}
                          >
                            {profile.blocked ? <CheckCircle2 className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}

          {!isLoading && filteredProfiles.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum usuário encontrado
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Perfil</DialogTitle>
            <DialogDescription>
              Altere as informações do perfil do usuário
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Email</Label>
              <Input value={editingProfile?.email} disabled />
            </div>
            <div>
              <Label>Nome Completo</Label>
              <Input
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div>
              <Label>CPF</Label>
              <Input
                value={formData.cpf}
                onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
