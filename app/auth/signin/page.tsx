'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/hooks/useAuth'
import { safeRedirect } from '@/lib/safe-redirect'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AstaMark } from '@/components/brand/logo'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, AlertCircle, Sparkles } from 'lucide-react'

export default function SignInPage() {
  // Quem já está logado não precisa ver esta tela.
  const { isAuthenticated: alreadyIn } = useAuth()
  useEffect(() => {
    if (!alreadyIn) return
    window.location.replace(safeRedirect(new URLSearchParams(window.location.search).get('redirect')))
  }, [alreadyIn])
  const router = useRouter()
  const params = useSearchParams()
  const cadastro = params.get('cadastro')
  const [email, setEmail] = useState(params.get('email') ?? '')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [demoEnabled, setDemoEnabled] = useState(false)
  const [demoLoading, setDemoLoading] = useState(false)

  useEffect(() => {
    fetch('/api/auth/demo').then((r) => r.json()).then((d) => setDemoEnabled(Boolean(d.enabled))).catch(() => {})
  }, [])

  // Entra na conta de demonstração (as credenciais ficam no servidor).
  const enterDemo = async () => {
    setError('')
    setDemoLoading(true)
    try {
      const response = await fetch('/api/auth/demo', { method: 'POST', credentials: 'include' })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(data.error || 'Demonstração indisponível no momento.')
        setDemoLoading(false)
        return
      }
      window.location.href = safeRedirect(new URLSearchParams(window.location.search).get('redirect'))
    } catch {
      setError('Erro ao conectar ao servidor')
      setDemoLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Erro ao fazer login')
        return
      }

      // Volta para onde a pessoa estava (só caminhos internos).
      window.location.href = safeRedirect(new URLSearchParams(window.location.search).get('redirect'))
    } catch (err) {
      setError('Erro ao conectar ao servidor')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container py-16 flex items-center justify-center min-h-[70vh]">
      <Card className="w-full max-w-md">
        <CardHeader className="items-center text-center">
          <AstaMark className="mb-2 h-12 w-12" />
          <CardTitle className="text-2xl">Acesse sua conta</CardTitle>
          <CardDescription>Gerencie suas reservas na AstaCar</CardDescription>
        </CardHeader>
        <CardContent>
          {cadastro && !error && (
            <Alert className="mb-6">
              <AlertDescription>
                {cadastro === 'ok'
                  ? 'Conta criada. Entre com seu e-mail e senha para continuar.'
                  : 'Conta criada. Confirme seu e-mail pelo link que enviamos e depois entre aqui.'}
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                placeholder="seu@email.com"
              />
            </div>

            <div>
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                placeholder="••••••••"
              />
            </div>

            <Button type="submit" variant="brand" size="lg" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Entrar
            </Button>
          </form>

          {demoEnabled && (
            <div className="mt-6">
              <div className="relative flex items-center gap-3 text-xs uppercase tracking-wider text-muted-foreground">
                <span className="h-px flex-1 bg-border" />ou<span className="h-px flex-1 bg-border" />
              </div>
              <Button type="button" variant="outline" size="lg" className="mt-4 w-full" onClick={enterDemo} disabled={demoLoading || isLoading}>
                {demoLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-electric" />}
                Entrar como cliente de demonstração
              </Button>
              <p className="mt-2 text-center text-xs text-muted-foreground">
                Sem cadastro: faça reservas, use cupons e cancele à vontade.
              </p>
            </div>
          )}

          <div className="mt-4 text-center text-sm">
            <span className="text-muted-foreground">Não tem uma conta? </span>
            <Link href="/auth/signup" className="text-electric hover:underline">
              Cadastre-se
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
