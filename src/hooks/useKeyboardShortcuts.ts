import { useEffect } from 'react'
import { useStore } from '../store'

export function useKeyboardShortcuts() {
  const selectedClipId = useStore((s) => s.ui.selectedClipId)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Block all shortcuts during export rendering
      if (useStore.getState().export.status === 'rendering') return

      // Skip if user is typing in an input/textarea
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

      const isMac = navigator.platform.includes('Mac')
      const ctrlOrCmd = isMac ? e.metaKey : e.ctrlKey

      // Tool switching — V = Select, B = Blade
      if (!ctrlOrCmd && !e.shiftKey && !e.altKey) {
        if (e.key === 'v' || e.key === 'V') {
          useStore.getState().setActiveTool('select')
          return
        }
        if (e.key === 'b' || e.key === 'B') {
          useStore.getState().setActiveTool('blade')
          return
        }
      }

      // CRITICAL: Check Cmd+Shift+Z BEFORE Cmd+Z — otherwise Shift+Z triggers undo
      if (ctrlOrCmd && e.shiftKey && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault()
        useStore.temporal.getState().redo()
        return
      }
      if (ctrlOrCmd && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault()
        useStore.temporal.getState().undo()
        return
      }

      // Clip deletion — Delete or Backspace
      // deleteClip also clears selectedClipId in one set() call to avoid a double undo step
      if ((e.key === 'Delete' || e.key === 'Backspace') && useStore.getState().ui.selectedClipId) {
        e.preventDefault()
        const clipId = useStore.getState().ui.selectedClipId
        if (clipId) {
          useStore.getState().deleteClip(clipId)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedClipId])
}
