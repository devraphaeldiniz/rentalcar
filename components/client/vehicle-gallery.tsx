'use client'

import { useState } from 'react'

export type PhotoCredit = { author: string; license: string; source: string }

export function VehicleGallery({ images, name, credits = [] }: { images: string[]; name: string; credits?: PhotoCredit[] }) {
  const [active, setActive] = useState(0)

  if (images.length === 0) {
    return (
      <div className="flex aspect-[16/10] items-center justify-center rounded-lg bg-muted text-muted-foreground">
        Foto em breve
      </div>
    )
  }

  return (
    <div className="grid gap-3">
      <div className="relative aspect-[16/10] overflow-hidden rounded-lg bg-muted">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={images[active]} alt={`${name}, foto ${active + 1} de ${images.length}`} className="absolute inset-0 h-full w-full object-cover" />
      </div>
      {credits[active] && (
        <p className="text-xs text-muted-foreground">
          Foto:{' '}
          <a href={credits[active].source} target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
            {credits[active].author}
          </a>
          , {credits[active].license}, via Wikimedia Commons. Imagem ilustrativa do modelo.
        </p>
      )}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Fotos do carro">
          {images.map((src, i) => (
            <button
              key={src + i}
              type="button"
              role="tab"
              aria-selected={i === active}
              aria-label={`Foto ${i + 1}`}
              onClick={() => setActive(i)}
              className={`relative h-16 w-24 shrink-0 overflow-hidden rounded-md border-2 ${i === active ? 'border-primary' : 'border-transparent opacity-70 hover:opacity-100'}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
