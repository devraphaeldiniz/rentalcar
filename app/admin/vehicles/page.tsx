'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Plus, Search, Edit, Trash2, Car } from 'lucide-react'

type Vehicle = {
  id: string
  brand: string
  model: string
  year: number
  plate: string
  daily_rate: number
  category: string
  status: string
  images: string[]
  features: string[]
  created_at: string
}

export default function VehiclesAdminPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null)
  const [formData, setFormData] = useState({
    brand: '',
    model: '',
    year: new Date().getFullYear(),
    plate: '',
    daily_rate: 0,
    category: 'Sedan',
    status: 'available',
    images: [''],
    features: ['']
  })

  useEffect(() => {
    fetchVehicles()
  }, [])

  const fetchVehicles = async () => {
    try {
      const response = await fetch('/api/admin/vehicles')
      const data = await response.json()
      setVehicles(data.vehicles || [])
    } catch (error) {
      console.error('Erro ao buscar veículos:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const cleanData = {
      ...formData,
      images: formData.images.filter(img => img.trim() !== ''),
      features: formData.features.filter(f => f.trim() !== '')
    }

    try {
      const url = editingVehicle 
        ? `/api/admin/vehicles/${editingVehicle.id}`
        : '/api/admin/vehicles'
      
      const response = await fetch(url, {
        method: editingVehicle ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleanData),
      })

      if (response.ok) {
        fetchVehicles()
        setIsDialogOpen(false)
        resetForm()
      }
    } catch (error) {
      console.error('Erro ao salvar veículo:', error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir este veículo?')) return

    try {
      const response = await fetch(`/api/admin/vehicles/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        fetchVehicles()
      }
    } catch (error) {
      console.error('Erro ao deletar veículo:', error)
    }
  }

  const handleEdit = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle)
    setFormData({
      brand: vehicle.brand,
      model: vehicle.model,
      year: vehicle.year,
      plate: vehicle.plate,
      daily_rate: vehicle.daily_rate,
      category: vehicle.category,
      status: vehicle.status,
      images: vehicle.images.length > 0 ? vehicle.images : [''],
      features: vehicle.features.length > 0 ? vehicle.features : ['']
    })
    setIsDialogOpen(true)
  }

  const resetForm = () => {
    setEditingVehicle(null)
    setFormData({
      brand: '',
      model: '',
      year: new Date().getFullYear(),
      plate: '',
      daily_rate: 0,
      category: 'Sedan',
      status: 'available',
      images: [''],
      features: ['']
    })
  }

  const filteredVehicles = vehicles.filter(vehicle =>
    vehicle.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vehicle.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vehicle.plate.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Veículos</h1>
          <p className="text-muted-foreground">Gerencie a frota de veículos</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Veículo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingVehicle ? 'Editar' : 'Novo'} Veículo</DialogTitle>
              <DialogDescription>
                Preencha as informações do veículo
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Marca</Label>
                  <Input
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label>Modelo</Label>
                  <Input
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label>Ano</Label>
                  <Input
                    type="number"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                    required
                  />
                </div>
                <div>
                  <Label>Placa</Label>
                  <Input
                    value={formData.plate}
                    onChange={(e) => setFormData({ ...formData, plate: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label>Diária (R$)</Label>
                  <Input
                    type="number"
                    value={formData.daily_rate}
                    onChange={(e) => setFormData({ ...formData, daily_rate: parseFloat(e.target.value) })}
                    required
                  />
                </div>
                <div>
                  <Label>Categoria</Label>
                  <Input
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div>
                <Label>URLs das Imagens</Label>
                {formData.images.map((img, idx) => (
                  <Input
                    key={idx}
                    value={img}
                    onChange={(e) => {
                      const newImages = [...formData.images]
                      newImages[idx] = e.target.value
                      setFormData({ ...formData, images: newImages })
                    }}
                    className="mb-2"
                    placeholder="https://exemplo.com/imagem.jpg"
                  />
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setFormData({ ...formData, images: [...formData.images, ''] })}
                >
                  Adicionar Imagem
                </Button>
              </div>

              <div>
                <Label>Características</Label>
                {formData.features.map((feature, idx) => (
                  <Input
                    key={idx}
                    value={feature}
                    onChange={(e) => {
                      const newFeatures = [...formData.features]
                      newFeatures[idx] = e.target.value
                      setFormData({ ...formData, features: newFeatures })
                    }}
                    className="mb-2"
                    placeholder="Ex: Ar condicionado"
                  />
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setFormData({ ...formData, features: [...formData.features, ''] })}
                >
                  Adicionar Característica
                </Button>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">Salvar</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por marca, modelo ou placa..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Veículo</TableHead>
                <TableHead>Placa</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Diária</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVehicles.map((vehicle) => (
                <TableRow key={vehicle.id}>
                  <TableCell>
                    <div className="font-medium">
                      {vehicle.brand} {vehicle.model}
                    </div>
                    <div className="text-sm text-muted-foreground">{vehicle.year}</div>
                  </TableCell>
                  <TableCell>{vehicle.plate}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{vehicle.category}</Badge>
                  </TableCell>
                  <TableCell>R$ {vehicle.daily_rate}</TableCell>
                  <TableCell>
                    <Badge variant={vehicle.status === 'available' ? 'default' : 'secondary'}>
                      {vehicle.status === 'available' ? 'Disponível' : 'Indisponível'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(vehicle)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(vehicle.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
