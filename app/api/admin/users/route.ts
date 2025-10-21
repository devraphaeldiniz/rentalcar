import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // TODO: Buscar usuários reais do banco
    // Mock data por enquanto
    const users = [
      {
        id: '5b521caa-b71d-44b9-a867-30cbc6c4c13d',
        email: 'admin@rental.com',
        displayName: 'Administrador',
        role: 'admin',
        emailVerified: true,
        disabled: false,
        createdAt: '2025-10-17T20:50:59.417569+00:00',
        lastLogin: new Date().toISOString(),
      },
      {
        id: '6c632bbb-c82e-55c0-b978-41ddc7d5d24e',
        email: 'joao@example.com',
        displayName: 'João Silva',
        role: 'user',
        emailVerified: true,
        disabled: false,
        createdAt: '2025-10-18T10:30:00.000000+00:00',
        lastLogin: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: '7d743ccc-d93f-66d1-c089-52eed8e6e35f',
        email: 'maria@example.com',
        displayName: 'Maria Santos',
        role: 'user',
        emailVerified: false,
        disabled: false,
        createdAt: '2025-10-19T15:45:00.000000+00:00',
        lastLogin: null,
      },
      {
        id: '8e854ddd-ea40-77e2-d190-63ffe9f7f46g',
        email: 'pedro@example.com',
        displayName: 'Pedro Costa',
        role: 'user',
        emailVerified: true,
        disabled: true,
        createdAt: '2025-10-15T08:20:00.000000+00:00',
        lastLogin: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ]

    return NextResponse.json({ users })
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro ao buscar usuários' },
      { status: 500 }
    )
  }
}
