'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { nhost } from '@/lib/nhost/client'
import { Shield, AlertTriangle } from 'lucide-react'

export default function SignInPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [rateLimited, setRateLimited] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    setRateLimited(false)

    try {
      // Verificar rate limit no servidor
      const rateLimitCheck = await fetch('/api/auth/check-rate-limit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const rateLimitResult = await rateLimitCheck.json()

      if (!rateLimitResult.allowed) {
        setRateLimited(true)
        setError(`Muitas tentativas. Tente novamente em ${Math.ceil(rateLimitResult.resetMinutes)} minutos.`)
        setIsLoading(false)
        return
      }

      const { session, error: signInError } = await nhost.auth.signIn({ 
        email, 
        password 
      })

      // Registrar tentativa
      await fetch('/api/auth/log-attempt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email, 
          success: !!session,
          failureReason: signInError?.message 
        }),
      })

      if (signInError) {
        setError(signInError.message)
        setIsLoading(false)
      } else {
        // Criar audit log
        await fetch('/api/auth/audit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            action: 'user.login',
            userId: session?.user?.id 
          }),
        })

        router.push('/')
        router.refresh()
      }
    } catch (err: any) {
  console.error('Erro completo:', err)
  setError(err.message || 'Erro ao conectar. Tente novamente.')
  setIsLoading(false)
}
  }

  return (
    <div className="container mx-auto px-4 py-16 max-w-md">
      <div className="text-center mb-8">
        <Shield className="h-12 w-12 mx-auto mb-4 text-primary" />
        <h1 className="text-3xl font-bold">Acesso Seguro</h1>
        <p className="text-muted-foreground mt-2">
          Sistema protegido com criptografia de ponta
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Entrar</CardTitle>
          <CardDescription>Entre com sua conta para continuar</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant={rateLimited ? "destructive" : "default"}>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div>
              <label className="text-sm font-medium mb-2 block">E-mail</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                disabled={isLoading || rateLimited}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Senha</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                disabled={isLoading || rateLimited}
              />
            </div>

            <div className="text-right">
              <Link href="/auth/reset-password" className="text-sm text-primary hover:underline">
                Esqueceu a senha?
              </Link>
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading || rateLimited}
            >
              {isLoading ? 'Entrando...' : 'Entrar com segurança'}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Não tem conta?{' '}
              <Link href="/auth/signup" className="text-primary hover:underline">
                Cadastre-se
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>

      <div className="mt-6 text-center text-xs text-muted-foreground">
        <p>🔒 Conexão segura com SSL/TLS</p>
        <p>🛡️ Protegido contra ataques de força bruta</p>
      </div>
    </div>
  )
}