export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import * as speakeasy from 'speakeasy'
import * as QRCode from 'qrcode'
import { requireUser } from '@/lib/auth/authorization'

export async function POST() {
  const user = await requireUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  try {
    // O app autenticador mostra o e-mail de quem está ativando o 2FA
    const secret = speakeasy.generateSecret({
      name: `RentalCar (${user.email ?? user.userId})`,
      issuer: 'RentalCar',
    })

    const qrCode = await QRCode.toDataURL(secret.otpauth_url || '')

    return NextResponse.json({
      secret: secret.base32,
      qrCode,
    })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao gerar 2FA' }, { status: 500 })
  }
}
