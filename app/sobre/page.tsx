'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Car, Shield, Clock, Users, Star, Award } from 'lucide-react'

export default function SobrePage() {
  const features = [
    {
      icon: Car,
      title: 'Frota Moderna',
      description: 'Veículos novos e bem mantidos para sua segurança e conforto'
    },
    {
      icon: Shield,
      title: 'Segurança Total',
      description: 'Todos os veículos com seguro completo e assistência 24h'
    },
    {
      icon: Clock,
      title: 'Disponibilidade',
      description: 'Atendimento e suporte disponível todos os dias da semana'
    },
    {
      icon: Users,
      title: 'Atendimento Personalizado',
      description: 'Equipe dedicada para atender suas necessidades'
    },
    {
      icon: Star,
      title: 'Qualidade Garantida',
      description: 'Avaliações positivas de centenas de clientes satisfeitos'
    },
    {
      icon: Award,
      title: 'Experiência',
      description: 'Anos de experiência no mercado de locação de veículos'
    }
  ]

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary to-primary/80 text-white py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Sobre a RentalCar
            </h1>
            <p className="text-xl text-white/90">
              Conectando você ao veículo ideal para cada momento da sua vida
            </p>
          </div>
        </div>
      </section>

      {/* Nossa História */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold mb-8 text-center">Nossa História</h2>
            <div className="prose prose-lg mx-auto">
              <p className="text-lg text-muted-foreground mb-6">
                A RentalCar nasceu com um objetivo claro: transformar a experiência de aluguel de veículos,
                tornando-a mais simples, transparente e acessível para todos. 
              </p>
              <p className="text-lg text-muted-foreground mb-6">
                Desde o início, investimos em tecnologia de ponta e em uma frota diversificada para atender
                às mais variadas necessidades - desde viagens de negócios até aventuras em família.
              </p>
              <p className="text-lg text-muted-foreground">
                Hoje, somos referência no mercado, com milhares de clientes satisfeitos e uma equipe
                apaixonada por proporcionar a melhor experiência em mobilidade.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Nossos Diferenciais */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold mb-12 text-center">Nossos Diferenciais</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {features.map((feature, index) => {
              const Icon = feature.icon
              return (
                <Card key={index} className="hover:shadow-lg transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex flex-col items-center text-center">
                      <div className="mb-4 p-3 bg-primary/10 rounded-full">
                        <Icon className="h-8 w-8 text-primary" />
                      </div>
                      <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                      <p className="text-muted-foreground">{feature.description}</p>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </section>

      {/* Missão, Visão e Valores */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-8">
            <Card>
              <CardContent className="pt-6">
                <h3 className="text-2xl font-bold mb-4 text-center">Missão</h3>
                <p className="text-muted-foreground text-center">
                  Proporcionar mobilidade de qualidade, com segurança e transparência,
                  facilitando a vida dos nossos clientes.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <h3 className="text-2xl font-bold mb-4 text-center">Visão</h3>
                <p className="text-muted-foreground text-center">
                  Ser a plataforma de locação de veículos mais confiável e inovadora do mercado.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <h3 className="text-2xl font-bold mb-4 text-center">Valores</h3>
                <p className="text-muted-foreground text-center">
                  Transparência, qualidade, compromisso com o cliente e inovação constante.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-primary text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Pronto para começar?</h2>
          <p className="text-xl mb-8 text-white/90">
            Encontre o veículo perfeito para você
          </p>
          
            href="/vehicles"
            className="inline-block bg-white text-primary px-8 py-3 rounded-lg font-semibold hover:bg-white/90 transition-colors"
          >
            Ver Veículos Disponíveis
          </a>
        </div>
      </section>
    </div>
  )
}
