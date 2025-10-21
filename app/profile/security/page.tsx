'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Shield, Key, CheckCircle, AlertTriangle, Copy, QrCode } from 'lucide-react'
import Image from 'next/image'

export default function SecurityPage() {
  const [is2FAEnabled, setIs2FAEnabled] = useState(false)
  const [qrCode, setQrCode] = useState('')
  const [secret, setSecret] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'success' | 'error'>('success')
  const [step, setStep] = useState<'initial' | 'setup' | 'verify'>('initial')

  useEffect(() => {
    check2FAStatus()
  }, [])

  const check2FAStatus = async () => {
    try {
      const response = await fetch('/api/profile/2fa/status')
      const data = await response.json()
      setIs2FAEnabled(data.enabled)
    } catch (error) {
      console.error('Erro ao verificar 2FA:', error)
    }
  }

  const generate2FA = async () => {
    setIsLoading(true)
    setMessage('')
    
    try {
      const response = await fetch('/api/profile/2fa/generate', {
        method: 'POST',
      })
      const data = await response.json()
      
      if (data.qrCode && data.secret) {
        setQrCode(data.qrCode)
        setSecret(data.secret)
        setStep('setup')
      } else {
        setMessage('Erro ao gerar QR Code')
        setMessageType('error')
      }
    } catch (error) {
      setMessage('Erro ao gerar 2FA')
      setMessageType('error')
    } finally {
      setIsLoading(false)
    }
  }

  const enable2FA = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setMessage('Digite um código de 6 dígitos')
      setMessageType('error')
      return
    }

    setIsLoading(true)
    setMessage('')

    try {
      const response = await fetch('/api/profile/2fa/enable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: verificationCode }),
      })

      const data = await response.json()

      if (data.success) {
        setBackupCodes(data.backupCodes || [])
        setIs2FAEnabled(true)
        setStep('verify')
        setMessage('2FA ativado com sucesso!')
        setMessageType('success')
      } else {
        setMessage(data.error || 'Código inválido')
        setMessageType('error')
      }
    } catch (error) {
      setMessage('Erro ao ativar 2FA')
      setMessageType('error')
    } finally {
      setIsLoading(false)
    }
  }

  const disable2FA = async () => {
    if (!confirm('Tem certeza que deseja desativar a autenticação de 2 fatores?')) return

    const code = prompt('Digite um código de verificação para confirmar:')
    if (!code) return

    setIsLoading(true)

    try {
      const response = await fetch('/api/profile/2fa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })

      const data = await response.json()

      if (data.success) {
        setIs2FAEnabled(false)
        setStep('initial')
        setQrCode('')
        setSecret('')
        setBackupCodes([])
        setMessage('2FA desativado com sucesso')
        setMessageType('success')
      } else {
        setMessage(data.error || 'Código inválido')
        setMessageType('error')
      }
    } catch (error) {
      setMessage('Erro ao desativar 2FA')
      setMessageType('error')
    } finally {
      setIsLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setMessage('Copiado para a área de transferência!')
    setMessageType('success')
    setTimeout(() => setMessage(''), 3000)
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Segurança & 2FA</h1>
        <p className="text-muted-foreground">Configure a autenticação de dois fatores para maior segurança</p>
      </div>

      {message && (
        <Alert className={`mb-6 ${messageType === 'error' ? 'border-red-500' : ''}`}>
          {messageType === 'success' ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <AlertTriangle className="h-4 w-4" />
          )}
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      {/* Status do 2FA */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Autenticação de Dois Fatores (2FA)</CardTitle>
              <CardDescription>
                Adicione uma camada extra de segurança à sua conta
              </CardDescription>
            </div>
            {is2FAEnabled ? (
              <Badge variant="secondary" className="text-green-600">
                <CheckCircle className="h-3 w-3 mr-1" />
                Ativado
              </Badge>
            ) : (
              <Badge variant="destructive">
                Desativado
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {step === 'initial' && !is2FAEnabled && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                A autenticação de dois fatores adiciona uma camada extra de segurança à sua conta. 
                Além da senha, você precisará de um código gerado por um aplicativo autenticador.
              </p>
              <div className="flex items-center gap-2 text-sm">
                <Shield className="h-4 w-4 text-green-600" />
                <span>Recomendamos o uso de Google Authenticator ou Authy</span>
              </div>
              <Button onClick={generate2FA} disabled={isLoading}>
                <Key className="mr-2 h-4 w-4" />
                Ativar 2FA
              </Button>
            </div>
          )}

          {step === 'setup' && qrCode && (
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-4">1. Escaneie o QR Code</h3>
                <div className="flex flex-col items-center gap-4">
                  <div className="p-4 bg-white rounded-lg">
                    <Image
                      src={qrCode}
                      alt="QR Code 2FA"
                      width={200}
                      height={200}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground text-center">
                    Escaneie este código com seu aplicativo autenticador
                  </p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">2. Ou digite o código manualmente:</h3>
                <div className="flex items-center gap-2">
                  <code className="flex-1 p-2 bg-muted rounded text-sm">
                    {secret}
                  </code>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(secret)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">3. Digite o código de 6 dígitos:</h3>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    maxLength={6}
                    placeholder="000000"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                    className="text-center text-2xl tracking-widest"
                  />
                  <Button onClick={enable2FA} disabled={isLoading}>
                    Verificar
                  </Button>
                </div>
              </div>
            </div>
          )}

          {step === 'verify' && backupCodes.length > 0 && (
            <div className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Importante!</strong> Salve estes códigos de backup em um local seguro. 
                  Você pode usá-los se perder acesso ao seu aplicativo autenticador.
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-2 gap-2">
                {backupCodes.map((code, index) => (
                  <div
                    key={index}
                    className="p-3 bg-muted rounded font-mono text-sm text-center"
                  >
                    {code}
                  </div>
                ))}
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  copyToClipboard(backupCodes.join('\n'))
                }}
              >
                <Copy className="mr-2 h-4 w-4" />
                Copiar todos os códigos
              </Button>

              <Button
                className="w-full"
                onClick={() => {
                  setStep('initial')
                  setBackupCodes([])
                }}
              >
                Concluir
              </Button>
            </div>
          )}

          {is2FAEnabled && step === 'initial' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">2FA está ativo e protegendo sua conta</span>
              </div>
              <Button variant="destructive" onClick={disable2FA} disabled={isLoading}>
                Desativar 2FA
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Informações adicionais */}
      <Card>
        <CardHeader>
          <CardTitle>Sobre a Autenticação de Dois Fatores</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            <strong>O que é 2FA?</strong><br />
            A autenticação de dois fatores adiciona uma segunda verificação ao fazer login, 
            tornando sua conta muito mais segura.
          </p>
          <p>
            <strong>Como funciona?</strong><br />
            Após inserir sua senha, você precisará digitar um código de 6 dígitos gerado 
            pelo seu aplicativo autenticador.
          </p>
          <p>
            <strong>Aplicativos recomendados:</strong><br />
            • Google Authenticator (Android/iOS)<br />
            • Microsoft Authenticator (Android/iOS)<br />
            • Authy (Android/iOS/Desktop)
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
