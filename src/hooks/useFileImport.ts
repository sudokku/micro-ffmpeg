import { useState, useCallback, useRef, useEffect } from 'react'
import { useStore } from '../store'

function getTrackId(file: File): 'video' | 'audio' | null {
  if (file.type.startsWith('video/')) return 'video'
  if (file.type.startsWith('audio/')) return 'audio'
  return null
}

function getFileMetadata(file: File): Promise<{ duration: number; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const isVideo = file.type.startsWith('video/')
    const el = document.createElement(isVideo ? 'video' : 'audio')
    el.preload = 'metadata'
    el.onloadedmetadata = () => {
      const duration = el.duration
      const width = isVideo ? (el as HTMLVideoElement).videoWidth : 0
      const height = isVideo ? (el as HTMLVideoElement).videoHeight : 0
      URL.revokeObjectURL(url)
      resolve({ duration, width, height })
    }
    el.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error(`Failed to read metadata for ${file.name}`))
    }
    el.src = url
  })
}

export function useFileImport() {
  const [showOverlay, setShowOverlay] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const importFile = useCallback(async (file: File) => {
    const trackId = getTrackId(file)
    if (!trackId) return // silently ignore unsupported types
    const { duration, width, height } = await getFileMetadata(file)
    useStore.getState().addClip(file, trackId, duration, width, height)
  }, [])

  const importFiles = useCallback(
    (files: FileList | File[]) => {
      Array.from(files).forEach(importFile)
    },
    [importFile],
  )

  useEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault()
      if (e.dataTransfer?.types.includes('Files')) {
        setShowOverlay(true)
      }
    }
    const handleDragLeave = (e: DragEvent) => {
      // Only hide overlay when leaving the window entirely
      if (e.relatedTarget === null) {
        setShowOverlay(false)
      }
    }
    const handleDrop = (e: DragEvent) => {
      e.preventDefault()
      setShowOverlay(false)
      if (e.dataTransfer?.files) {
        importFiles(e.dataTransfer.files)
      }
    }

    window.addEventListener('dragover', handleDragOver)
    window.addEventListener('dragleave', handleDragLeave)
    window.addEventListener('drop', handleDrop)
    return () => {
      window.removeEventListener('dragover', handleDragOver)
      window.removeEventListener('dragleave', handleDragLeave)
      window.removeEventListener('drop', handleDrop)
    }
  }, [importFiles])

  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        importFiles(e.target.files)
        e.target.value = '' // reset so same file can be re-imported
      }
    },
    [importFiles],
  )

  return { showOverlay, fileInputRef, openFilePicker, handleFileInputChange }
}
