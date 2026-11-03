'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/hooks/useAuth'
import { safeRedirect } from '@/lib/safe-redirect'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AstaMark } from '@/components/brand/logo'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { nhost } from '@/lib/nhost/client'
import { AlertTriangle, CheckCircle } from 'lucide-react'

export default function SignUpPage() {
  // Quem já está logado não precisa ver esta tela.
  const { isAuthenticated: alreadyIn } = useAuth()
  useEffect(() => {
    if (!alreadyIn) return
    window.location.replace(safeRedirect(new URLSearchParams(window.location.search).get('redirect')))
  }, [alreadyIn])
  const router = useRouter()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    phone: '',
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    if (formData.password.length < 9) {
      setError('A senha deve ter pelo menos 9 caracteres')
      setIsLoading(false)
      return
    }

    try {
      const { session, error: signUpError } = await nhost.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          displayName: formData.full_name,
          metadata: {
            phone: formData.phone,
          },
          defaultRole: 'user',
        },
      })

      if (signUpError) {
        setError(signUpError.message)
        setIsLoading(false)
      } else {
        // O site usa sessão em cookie, criada pela rota de login. Depois do cadastro,
        // a pessoa entra por lá (ou confirma o e-mail antes, se o projeto exigir).
        if (session) await nhost.auth.signOut().catch(() => {})
        router.push(`/auth/signin?cadastro=${session ? 'ok' : 'confirmar'}&email=${encodeURIComponent(formData.email)}`)
      }
    } catch (err: any) {
      setError('Erro ao criar conta. Tente novamente.')
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-16 max-w-md">
      <Card>
        <CardHeader className="items-center text-center">
          <AstaMark className="mb-2 h-12 w-12" />
          <CardTitle className="text-2xl">Crie sua conta AstaCar</CardTitle>
          <CardDescription>Reserve, acompanhe e avalie seus aluguéis</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div>
              <label htmlFor="su-nome" className="text-sm font-medium mb-2 block">Nome completo</label>
              <Input
                id="su-nome"
                autoComplete="name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="João da Silva"
                required
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="su-email" className="text-sm font-medium mb-2 block">E-mail</label>
              <Input
                id="su-email"
                autoComplete="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="seu@email.com"
                required
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="su-telefone" className="text-sm font-medium mb-2 block">Telefone</label>
              <Input
                id="su-telefone"
                autoComplete="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="(11) 99999-9999"
                required
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="su-senha" className="text-sm font-medium mb-2 block">Senha</label>
              <Input
                id="su-senha"
                autoComplete="new-password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Mínimo 9 caracteres"
                required
                minLength={9}
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Mínimo 9 caracteres. Misture letras, números e símbolos.
              </p>
            </div>

            <div className="space-y-2 p-3 bg-muted rounded-lg text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>Criptografia bcrypt</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>Proteção contra SQL injection</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>Dados armazenados com segurança</span>
              </div>
            </div>

            <Button type="submit" variant="brand" size="lg" className="w-full" disabled={isLoading}>
              {isLoading ? 'Criando conta...' : 'Criar minha conta'}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Já tem conta?{' '}
              <Link href="/auth/signin" className="text-electric hover:underline">
                Entrar
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}