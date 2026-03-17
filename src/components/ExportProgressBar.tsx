import { useStore } from '../store'

export function ExportProgressBar() {
  const status = useStore(s => s.export.status)
  const progress = useStore(s => s.export.progress)

  if (status !== 'rendering' && status !== 'error') return null

  return (
    <div className="flex-none w-full">
      <div className={`h-1.5 w-full ${status === 'error' ? 'bg-red-900' : 'bg-zinc-800'}`}>
        <div
          className={`h-full transition-all duration-300 ease-out ${status === 'error' ? 'bg-red-500' : 'bg-blue-500'}`}
          style={{ width: `${progress}%` }}
        />
      </div>
      {status === 'error' && (
        <p className="text-xs text-red-400 px-4 py-1">Export failed. Try again.</p>
      )}
    </div>
  )
}
