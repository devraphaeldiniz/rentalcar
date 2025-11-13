'use client'

import { useState, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { X, Upload, Star } from 'lucide-react'
import { useToast } from '@/lib/contexts/toast-context'

interface ImageUploadProps {
  images: string[]
  onChange: (images: string[]) => void
}

export function ImageUpload({ images, onChange }: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [primaryIndex, setPrimaryIndex] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { showToast } = useToast()

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const files = Array.from(e.dataTransfer.files)
    handleFiles(files)
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files)
      handleFiles(files)
    }
  }

  const handleFiles = async (files: File[]) => {
    const imageFiles = files.filter(file => file.type.startsWith('image/'))
    
    if (imageFiles.length === 0) {
      showToast('Por favor, selecione apenas imagens', 'warning')
      return
    }

    if (images.length + imageFiles.length > 10) {
      showToast('Máximo de 10 imagens por veículo', 'warning')
      return
    }

    // Converter para base64
    const newImages = await Promise.all(
      imageFiles.map(file => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result as string)
          reader.readAsDataURL(file)
        })
      })
    )

    onChange([...images, ...newImages])
    showToast('Imagens adicionadas com sucesso!', 'success')
  }

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index)
    onChange(newImages)
    if (primaryIndex >= newImages.length) {
      setPrimaryIndex(Math.max(0, newImages.length - 1))
    }
  }

  const setPrimary = (index: number) => {
    setPrimaryIndex(index)
    const newImages = [...images]
    const [primary] = newImages.splice(index, 1)
    newImages.unshift(primary)
    onChange(newImages)
    setPrimaryIndex(0)
  }

  return (
    <div className="space-y-4">
      <div
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
        }`}
      >
        <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-sm text-muted-foreground mb-2">
          Arraste imagens aqui ou clique para selecionar
        </p>
        <p className="text-xs text-muted-foreground mb-4">
          Máximo de 10 imagens (PNG, JPG, WEBP)
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileInput}
          className="hidden"
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
        >
          Selecionar Imagens
        </Button>
      </div>

      {images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((image, index) => (
            <Card key={index} className="relative group">
              <CardContent className="p-2">
                <img
                  src={image}
                  alt={`Preview ${index + 1}`}
                  className="w-full h-32 object-cover rounded"
                />
                <div className="absolute top-2 right-2 flex gap-2">
                  {index === primaryIndex && (
                    <div className="bg-yellow-400 text-white p-1 rounded">
                      <Star className="h-4 w-4 fill-white" />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="bg-red-500 text-white p-1 rounded hover:bg-red-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                {index !== primaryIndex && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="absolute bottom-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => setPrimary(index)}
                  >
                    Definir como Principal
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
