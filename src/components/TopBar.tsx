interface TopBarProps {
  onImportClick?: () => void
  fileInputRef?: React.RefObject<HTMLInputElement | null>
  onFileInputChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
}

export function TopBar({ onImportClick, fileInputRef, onFileInputChange }: TopBarProps) {
  return (
    <header className="flex-none h-12 flex items-center px-4 border-b border-zinc-800 justify-between">
      <span className="text-sm font-medium">micro-ffmpeg</span>
      <div className="flex items-center gap-2">
        {onImportClick && (
          <>
            <button
              onClick={onImportClick}
              className="text-sm font-medium px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-white transition-colors"
            >
              Import
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*,audio/*"
              multiple
              className="hidden"
              onChange={onFileInputChange}
            />
          </>
        )}
      </div>
    </header>
  )
}
