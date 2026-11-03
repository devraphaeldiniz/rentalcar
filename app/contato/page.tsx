'use client'

import { useState } from 'react'
import { PageHero } from '@/components/layout/page-hero'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Mail, Phone, MapPin, Clock, Send } from 'lucide-react'

export default function ContatoPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [sendError, setSendError] = useState('')
  const [website, setWebsite] = useState('') // campo-isca anti-robô, invisível

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmitting) return
    setIsSubmitting(true)
    setSendError('')
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, website }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) {
        setSendError(result.error || 'Não foi possível enviar. Tente de novo.')
        return
      }
      setSubmitted(true)
      setFormData({ name: '', email: '', phone: '', subject: '', message: '' })
    } catch {
      setSendError('Sem conexão com o servidor. Verifique sua internet e tente de novo.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const contactInfo = [
    {
      icon: Mail,
      title: 'Email',
      info: 'contato@rentalcar.com',
      link: 'mailto:contato@rentalcar.com'
    },
    {
      icon: Phone,
      title: 'Telefone',
      info: '(31) 99440-2252',
      link: 'tel:+5531994402252'
    },
    {
      icon: MapPin,
      title: 'Endereço',
      info: 'Belo Horizonte, MG - Brasil',
      link: '#'
    },
    {
      icon: Clock,
      title: 'Horário',
      info: 'Seg-Sex: 8h-18h | Sáb: 9h-13h',
      link: '#'
    }
  ]

  return (
    <div className="min-h-screen">
      <PageHero eyebrow="Atendimento" title="Fale com a AstaCar" subtitle="Dúvidas sobre uma reserva ou sobre a frota? Envie sua mensagem e respondemos por e-mail." />

      {/* Contact Info Cards */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto mb-16">
            {contactInfo.map((item, index) => {
              const Icon = item.icon
              return (
                <Card key={index} className="hover:shadow-lg transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex flex-col items-center text-center">
                      <div className="mb-4 rounded-xl border border-electric/25 bg-electric/10 p-3">
                        <Icon className="h-6 w-6 text-electric" />
                      </div>
                      <h3 className="font-semibold mb-2">{item.title}</h3>
                      <a 
                        href={item.link}
                        className="text-sm text-muted-foreground hover:text-electric transition-colors"
                      >
                        {item.info}
                      </a>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Contact Form */}
          <div className="max-w-3xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl text-center">Envie sua Mensagem</CardTitle>
              </CardHeader>
              <CardContent>
                {submitted && (
                  <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800 text-center">
                    ✓ Mensagem enviada com sucesso! Entraremos em contato em breve.
                  </div>
                )}
                
                <form onSubmit={handleSubmit} className="space-y-6">
                  <input type="text" name="website" value={website} onChange={(e) => setWebsite(e.target.value)}
                    tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 opacity-0" />
                  {sendError && (
                    <p role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{sendError}</p>
                  )}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Nome *</Label>
                      <Input
                        id="name"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Seu nome completo"
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="seu@email.com"
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="phone">Telefone</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="(00) 00000-0000"
                      />
                    </div>
                    <div>
                      <Label htmlFor="subject">Assunto *</Label>
                      <Input
                        id="subject"
                        required
                        value={formData.subject}
                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                        placeholder="Como podemos ajudar?"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="message">Mensagem *</Label>
                    <Textarea
                      id="message"
                      required
                      rows={6}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      placeholder="Conte-nos mais sobre sua dúvida ou solicitação..."
                    />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isSubmitting}
                    size="lg"
                  >
                    {isSubmitting ? (
                      'Enviando...'
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Enviar Mensagem
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold mb-8 text-center">Perguntas Frequentes</h2>
            <div className="space-y-4">
              <Card>
                <CardContent className="pt-6">
                  <h3 className="font-semibold mb-2">Como faço para alugar um veículo?</h3>
                  <p className="text-muted-foreground">
                    Basta navegar pelo nosso catálogo, escolher o veículo desejado e fazer sua reserva online.
                    É rápido, fácil e seguro!
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <h3 className="font-semibold mb-2">Quais documentos são necessários?</h3>
                  <p className="text-muted-foreground">
                    CNH válida, documento de identidade e comprovante de residência.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <h3 className="font-semibold mb-2">Posso cancelar minha reserva?</h3>
                  <p className="text-muted-foreground">
                    Sim! Você pode cancelar sua reserva através da área do cliente.
                    Consulte nossa política de cancelamento para mais detalhes.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
