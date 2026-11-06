'use client'

import { useCallback, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

type ConfirmOptions = {
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  /** Ações que não têm volta (cancelar, excluir, bloquear) ficam em vermelho. */
  destructive?: boolean
}

/**
 * Substitui o window.confirm, que alguns navegadores e o modo "não perguntar de novo" bloqueiam
 * (e aí a ação simplesmente não acontecia). Uso:
 *   const { confirm, dialog } = useConfirm()
 *   if (!(await confirm({ title: 'Excluir?' }))) return
 *   ...; return <>{dialog}...</>
 */
export function useConfirm() {
  const [options, setOptions] = useState<ConfirmOptions | null>(null)
  const resolver = useRef<((ok: boolean) => void) | null>(null)

  const confirm = useCallback((opts: ConfirmOptions) => {
    resolver.current?.(false)
    setOptions(opts)
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve
    })
  }, [])

  const close = (ok: boolean) => {
    resolver.current?.(ok)
    resolver.current = null
    setOptions(null)
  }

  const dialog = (
    <Dialog open={options !== null} onOpenChange={(open) => !open && close(false)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{options?.title}</DialogTitle>
          {options?.description && <DialogDescription>{options.description}</DialogDescription>}
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => close(false)}>
            {options?.cancelLabel ?? 'Voltar'}
          </Button>
          <Button variant={options?.destructive ? 'destructive' : 'default'} onClick={() => close(true)} autoFocus>
            {options?.confirmLabel ?? 'Confirmar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )

  return { confirm, dialog }
}
