import { Upload } from 'lucide-react'

interface DropOverlayProps {
  visible: boolean
}

export function DropOverlay({ visible }: DropOverlayProps) {
  return (
    <div
      className={`fixed inset-0 z-50 transition-opacity duration-150 ${
        visible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}
    >
      <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm" />
      <div className="absolute inset-6 border-2 border-dashed border-zinc-600 rounded-xl flex flex-col items-center justify-center gap-4">
        <Upload size={48} className="text-zinc-400" />
        <p className="text-xl font-semibold text-white">Drop video or audio files here</p>
      </div>
    </div>
  )
}
