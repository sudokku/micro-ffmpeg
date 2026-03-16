import { MousePointer2, Scissors } from 'lucide-react'
import { useStore } from '../store'

export function ToolSidebar() {
  const activeTool = useStore((s) => s.ui.activeTool)
  const setActiveTool = useStore((s) => s.setActiveTool)

  return (
    <div className="flex-none w-10 bg-zinc-900 border-r border-zinc-800 flex flex-col items-center pt-2 gap-1">
      <button
        onClick={() => setActiveTool('select')}
        className={`w-10 h-10 flex flex-col items-center justify-center gap-0.5 transition-colors ${
          activeTool === 'select'
            ? 'bg-zinc-800 text-white ring-1 ring-blue-500'
            : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
        }`}
        aria-label="Select tool (V)"
      >
        <MousePointer2 size={16} />
        <span className="text-[10px] text-zinc-500">V</span>
      </button>
      <button
        onClick={() => setActiveTool('blade')}
        className={`w-10 h-10 flex flex-col items-center justify-center gap-0.5 transition-colors ${
          activeTool === 'blade'
            ? 'bg-zinc-800 text-white ring-1 ring-blue-500'
            : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
        }`}
        aria-label="Blade tool (B)"
      >
        <Scissors size={16} />
        <span className="text-[10px] text-zinc-500">B</span>
      </button>
    </div>
  )
}
