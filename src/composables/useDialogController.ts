import { nextTick, onBeforeUnmount, watch, type Ref } from 'vue'

type UseDialogControllerOptions = {
  dialogRef: Ref<HTMLDialogElement | null | undefined>
  open: () => boolean
  onRequestClose: () => void
  lockBodyScroll?: boolean
}

function setBodyScrollLocked(lock: boolean) {
  if (typeof document === 'undefined')
    return
  document.body.style.overflow = lock ? 'hidden' : ''
}

export function useDialogController(options: UseDialogControllerOptions) {
  watch(
    options.open,
    async (open) => {
      await nextTick()
      const dialog = options.dialogRef.value
      if (!dialog)
        return

      if (open) {
        if (!dialog.open)
          dialog.showModal()
        if (options.lockBodyScroll)
          setBodyScrollLocked(true)
      } else {
        if (dialog.open)
          dialog.close()
        if (options.lockBodyScroll)
          setBodyScrollLocked(false)
      }
    },
    { immediate: true, flush: 'post' }
  )

  onBeforeUnmount(() => {
    if (options.lockBodyScroll)
      setBodyScrollLocked(false)
  })

  function handleClose() {
    options.onRequestClose()
    if (options.lockBodyScroll)
      setBodyScrollLocked(false)
  }

  function handleCancel(event: Event) {
    event.preventDefault()
    options.onRequestClose()
  }

  return {
    handleClose,
    handleCancel,
  }
}
