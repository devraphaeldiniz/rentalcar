import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const data = await req.json()
    const userId = params.id

    console.log('=== UPDATE PROFILE ===')
    console.log('User ID:', userId)
    console.log('Data:', data)

    const url = `https://${process.env.NEXT_PUBLIC_NHOST_SUBDOMAIN}.graphql.${process.env.NEXT_PUBLIC_NHOST_REGION}.nhost.run/v1`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-hasura-admin-secret': process.env.NHOST_ADMIN_SECRET!,
      },
      body: JSON.stringify({
        query: `
          mutation UpdateProfile($id: uuid!, $_set: profiles_set_input!) {
            update_profiles_by_pk(
              pk_columns: { id: $id }
              _set: $_set
            ) {
              id
              full_name
              phone
              cpf
            }
          }
        `,
        variables: { 
          id: userId,
          _set: {
            full_name: data.fullName,
            phone: data.phone,
            cpf: data.cpf
          }
        }
      }),
    })

    const result = await response.json()
    console.log('GraphQL Response:', JSON.stringify(result, null, 2))

    if (result.errors) {
      console.error('GraphQL errors:', result.errors)
      return NextResponse.json(
        { error: result.errors[0].message },
        { status: 500 }
      )
    }

    console.log('✅ Profile updated successfully!')

    return NextResponse.json({ 
      success: true, 
      profile: result.data?.update_profiles_by_pk 
    })
  } catch (error: any) {
    console.error('❌ Update error:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao atualizar perfil' },
      { status: 500 }
    )
  }
}
