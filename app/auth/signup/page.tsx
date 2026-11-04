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
import { AlertTriangle } from 'lucide-react'

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
      // O cadastro passa pelo servidor (como o login): mensagens em português,
      // limite de tentativas e a sessão já gravada em cookie seguro.
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(result.error || 'Não foi possível criar a conta. Tente novamente.')
        setIsLoading(false)
        return
      }
      if (result.signedIn) {
        window.location.href = safeRedirect(new URLSearchParams(window.location.search).get('redirect'))
        return
      }
      router.push(`/auth/signin?cadastro=confirmar&email=${encodeURIComponent(formData.email)}`)
    } catch {
      setError('Sem conexão com o servidor. Verifique sua internet e tente novamente.')
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