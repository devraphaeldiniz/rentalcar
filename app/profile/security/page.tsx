import { redirect } from 'next/navigation'

// Ainda não implementado de verdade (os dados eram de exemplo).
// Fica fora do ar até existir; quem acessar o endereço volta para Meus dados.
export default function Page() {
  redirect('/profile')
}
