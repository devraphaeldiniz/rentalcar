import { NextResponse } from 'next/server'
import * as speakeasy from 'speakeasy'
import * as QRCode from 'qrcode'

export async function POST() {
  try {
    // Gerar secret
    const secret = speakeasy.generateSecret({
      name: 'RentalCar (admin@rental.com)',
      issuer: 'RentalCar',
    })

    // Gerar QR Code
    const qrCode = await QRCode.toDataURL(secret.otpauth_url || '')

    return NextResponse.json({
      secret: secret.base32,
      qrCode,
    })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao gerar 2FA' }, { status: 500 })
  }
}
