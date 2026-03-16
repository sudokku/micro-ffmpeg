import { Film } from 'lucide-react'

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 flex-1">
      <Film size={40} className="text-zinc-700" />
      <h2 className="text-xl font-semibold text-zinc-300">No clips yet</h2>
      <p className="text-sm text-zinc-500">Drop files anywhere or click Import to get started</p>
    </div>
  )
}
