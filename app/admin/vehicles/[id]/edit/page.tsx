'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowLeft, Save, AlertTriangle, Upload, X, Loader2 } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

type Vehicle = {
  id: string
  brand: string
  model: string
  year: number
  plate: string
  category: string
  daily_rate: number
  status: string
  description: string
  transmission: string
  fuel_type: string
  passengers: number
  doors: number
  trunk_capacity: string
  features: string[]
  images: string[]
}

export default function EditVehiclePage() {
  const params = useParams()
  const vehicleId = params.id as string
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [vehicle, setVehicle] = useState<Vehicle | null>(null)
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [newImageUrl, setNewImageUrl] = useState('')

  const [formData, setFormData] = useState({
    brand: '',
    model: '',
    year: new Date().getFullYear(),
    plate: '',
    category: 'standard',
    daily_rate: 0,
    status: 'available',
    description: '',
    transmission: 'Automático',
    fuel_type: 'Flex',
    passengers: 5,
    doors: 4,
    trunk_capacity: '',
    features: [] as string[],
  })

  useEffect(() => {
    if (vehicleId) {
      fetchVehicle()
    }
  }, [vehicleId])

  const fetchVehicle = async () => {
    try {
      const url = `https://${process.env.NEXT_PUBLIC_NHOST_SUBDOMAIN}.graphql.${process.env.NEXT_PUBLIC_NHOST_REGION}.nhost.run/v1`

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `
            query GetVehicle($id: uuid!) {
              vehicles_by_pk(id: $id) {
                id
                brand
                model
                year
                plate
                category
                daily_rate
                status
                description
                transmission
                fuel_type
                passengers
                doors
                trunk_capacity
                features
                images
              }
            }
          `,
          variables: { id: vehicleId }
        }),
      })

      const result = await response.json()
      
      if (result.data?.vehicles_by_pk) {
        const vehicleData = result.data.vehicles_by_pk
        setVehicle(vehicleData)
        setFormData({
          brand: vehicleData.brand || '',
          model: vehicleData.model || '',
          year: vehicleData.year || new Date().getFullYear(),
          plate: vehicleData.plate || '',
          category: vehicleData.category || 'standard',
          daily_rate: vehicleData.daily_rate || 0,
          status: vehicleData.status || 'available',
          description: vehicleData.description || '',
          transmission: vehicleData.transmission || 'Automático',
          fuel_type: vehicleData.fuel_type || 'Flex',
          passengers: vehicleData.passengers || 5,
          doors: vehicleData.doors || 4,
          trunk_capacity: vehicleData.trunk_capacity || '',
          features: vehicleData.features || [],
        })
        setImageUrls(vehicleData.images || [])
      } else {
        setError('Veículo não encontrado')
      }
    } catch (err) {
      console.error('Erro ao buscar veículo:', err)
      setError('Erro ao carregar dados do veículo')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch(`/api/admin/vehicles/${vehicleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          images: imageUrls,
          features: formData.features.filter(f => f.trim() !== ''),
        }),
      })

      const result = await response.json()

      if (!response.ok || result.error) {
        setError(result.error || 'Erro ao atualizar veículo')
      } else {
        setSuccess('Veículo atualizado com sucesso!')
        setTimeout(() => {
          router.push('/admin/vehicles')
        }, 1500)
      }
    } catch (err: any) {
      console.error('Erro completo:', err)
      setError('Erro ao salvar veículo: ' + err.message)
    } finally {
      setIsSaving(false)
    }
  }

  const addImageUrl = () => {
    if (newImageUrl.trim() && !imageUrls.includes(newImageUrl)) {
      setImageUrls([...imageUrls, newImageUrl])
      setNewImageUrl('')
    }
  }

  const removeImageUrl = (index: number) => {
    setImageUrls(imageUrls.filter((_, i) => i !== index))
  }

  const addFeature = () => {
    setFormData({
      ...formData,
      features: [...formData.features, '']
    })
  }

  const updateFeature = (index: number, value: string) => {
    const newFeatures = [...formData.features]
    newFeatures[index] = value
    setFormData({ ...formData, features: newFeatures })
  }

  const removeFeature = (index: number) => {
    setFormData({
      ...formData,
      features: formData.features.filter((_, i) => i !== index)
    })
  }

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando dados do veículo...</p>
        </div>
      </div>
    )
  }

  if (error && !vehicle) {
    return (
      <div className="p-8">
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={() => router.push('/admin/vehicles')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para Veículos
        </Button>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <Link href="/admin/vehicles">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        </Link>
        <h1 className="text-3xl font-bold mb-2">Editar Veículo</h1>
        <p className="text-muted-foreground">
          Atualize as informações do {formData.brand} {formData.model}
        </p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="mb-6 border-green-500">
          <AlertDescription className="text-green-600">{success}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6">
          {/* Informações Básicas */}
          <Card>
            <CardHeader>
              <CardTitle>Informações Básicas</CardTitle>
              <CardDescription>Dados principais do veículo</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="brand">Marca *</Label>
                  <Input
                    id="brand"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="model">Modelo *</Label>
                  <Input
                    id="model"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="year">Ano *</Label>
                  <Input
                    id="year"
                    type="number"
                    min="2000"
                    max={new Date().getFullYear() + 1}
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="plate">Placa *</Label>
                  <Input
                    id="plate"
                    value={formData.plate}
                    onChange={(e) => setFormData({ ...formData, plate: e.target.value.toUpperCase() })}
                    placeholder="ABC1D23"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="daily_rate">Diária (R$) *</Label>
                  <Input
                    id="daily_rate"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.daily_rate}
                    onChange={(e) => setFormData({ ...formData, daily_rate: parseFloat(e.target.value) })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category">Categoria *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="economy">Econômico</SelectItem>
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="suv">SUV</SelectItem>
                      <SelectItem value="luxury">Luxo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="status">Status *</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="available">Disponível</SelectItem>
                      <SelectItem value="rented">Alugado</SelectItem>
                      <SelectItem value="maintenance">Manutenção</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descreva o veículo..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Especificações */}
          <Card>
            <CardHeader>
              <CardTitle>Especificações</CardTitle>
              <CardDescription>Detalhes técnicos do veículo</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="transmission">Transmissão</Label>
                  <Input
                    id="transmission"
                    value={formData.transmission}
                    onChange={(e) => setFormData({ ...formData, transmission: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="fuel_type">Combustível</Label>
                  <Input
                    id="fuel_type"
                    value={formData.fuel_type}
                    onChange={(e) => setFormData({ ...formData, fuel_type: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="passengers">Passageiros</Label>
                  <Input
                    id="passengers"
                    type="number"
                    min="1"
                    max="9"
                    value={formData.passengers}
                    onChange={(e) => setFormData({ ...formData, passengers: parseInt(e.target.value) })}
                  />
                </div>
                <div>
                  <Label htmlFor="doors">Portas</Label>
                  <Input
                    id="doors"
                    type="number"
                    min="2"
                    max="5"
                    value={formData.doors}
                    onChange={(e) => setFormData({ ...formData, doors: parseInt(e.target.value) })}
                  />
                </div>
                <div>
                  <Label htmlFor="trunk_capacity">Capacidade Porta-Malas</Label>
                  <Input
                    id="trunk_capacity"
                    value={formData.trunk_capacity}
                    onChange={(e) => setFormData({ ...formData, trunk_capacity: e.target.value })}
                    placeholder="ex: 470 litros"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Imagens */}
          <Card>
            <CardHeader>
              <CardTitle>Imagens ({imageUrls.length}/10)</CardTitle>
              <CardDescription>
                Cole as URLs das imagens do ImgBB (Direct link)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="https://i.ibb.co/..."
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addImageUrl())}
                />
                <Button type="button" onClick={addImageUrl}>
                  <Upload className="h-4 w-4 mr-2" />
                  Adicionar
                </Button>
              </div>

              {imageUrls.length > 0 && (
                <div className="grid grid-cols-3 gap-4">
                  {imageUrls.map((url, index) => (
                    <div key={index} className="relative group">
                      <div className="relative h-32 rounded-lg overflow-hidden border">
                        <Image
                          src={url}
                          alt={`Imagem ${index + 1}`}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 h-8 w-8"
                        onClick={() => removeImageUrl(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Características */}
          <Card>
            <CardHeader>
              <CardTitle>Características</CardTitle>
              <CardDescription>Itens e equipamentos do veículo</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {formData.features.map((feature, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={feature}
                    onChange={(e) => updateFeature(index, e.target.value)}
                    placeholder="Ex: Ar condicionado"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    onClick={() => removeFeature(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" onClick={addFeature}>
                Adicionar Característica
              </Button>
            </CardContent>
          </Card>

          {/* Botões de Ação */}
          <div className="flex gap-4">
            <Button type="submit" disabled={isSaving} className="flex-1">
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Salvar Alterações
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/admin/vehicles')}
              disabled={isSaving}
            >
              Cancelar
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
