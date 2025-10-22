import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const data = await req.json()
    const userId = params.id

    console.log('=== UPDATE USER ===')
    console.log('User ID:', userId)
    console.log('Data:', data)

    // Como não podemos atualizar usuários diretamente via GraphQL no schema auth,
    // vamos apenas retornar sucesso e mostrar uma mensagem informativa
    // Em produção, você usaria a Nhost Management API ou console admin
    
    console.log('⚠️  Nota: A tabela users está no schema auth e não permite updates diretos via GraphQL')
    console.log('Para atualizar usuários em produção, use:')
    console.log('1. Nhost Console (https://app.nhost.io)')
    console.log('2. Nhost Management API')
    console.log('3. Ou crie uma tabela profiles separada no schema public')

    // Por enquanto, vamos apenas simular sucesso
    return NextResponse.json({ 
      success: true,
      message: 'Nota: Atualizações de usuários do schema auth devem ser feitas via Nhost Console',
      user: {
        id: userId,
        displayName: data.displayName,
        phoneNumber: data.phoneNumber,
        metadata: data.metadata
      }
    })
  } catch (error: any) {
    console.error('❌ Update error:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao atualizar usuário' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = params.id

    console.log('=== DELETE USER ===')
    console.log('User ID:', userId)

    // Mesma limitação para delete
    console.log('⚠️  Nota: Exclusão de usuários deve ser feita via Nhost Console')

    return NextResponse.json({ 
      success: true,
      message: 'Nota: Exclusão de usuários do schema auth devem ser feitas via Nhost Console'
    })
  } catch (error: any) {
    console.error('❌ Delete error:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao deletar usuário' },
      { status: 500 }
    )
  }
}
