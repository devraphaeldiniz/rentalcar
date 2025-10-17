'use client'

import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'

export function SearchBar() {
  return (
    <div className="flex gap-4 flex-wrap">
      <Input placeholder="Buscar veículo..." className="flex-1 min-w-[200px]" />
      <Select>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Categoria" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="economy">Economy</SelectItem>
          <SelectItem value="standard">Standard</SelectItem>
          <SelectItem value="suv">SUV</SelectItem>
          <SelectItem value="luxury">Luxury</SelectItem>
        </SelectContent>
      </Select>
      <Button>Buscar</Button>
    </div>
  )
}