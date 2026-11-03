import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <main className="container flex min-h-[60vh] flex-col items-start justify-center py-16">
      <p className="text-sm font-medium text-muted-foreground">Erro 404</p>
      <h1 className="mt-2 text-4xl font-bold">Essa página não existe.</h1>
      <p className="mt-3 max-w-md text-muted-foreground">
        O endereço pode ter mudado, ou o carro não está mais disponível na frota.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/#carros">Ver carros disponíveis</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/contato">Falar com o atendimento</Link>
        </Button>
      </div>
    </main>
  )
}
