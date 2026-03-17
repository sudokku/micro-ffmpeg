import { TopBar } from './TopBar'
import { ToolSidebar } from './ToolSidebar'
import { TimelinePanel } from './TimelinePanel'
import { DropOverlay } from './DropOverlay'
import { EmptyState } from './EmptyState'
import { ClipSettingsPanel } from './ClipSettingsPanel'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import { useFileImport } from '../hooks/useFileImport'
import { useThumbnailExtractor } from '../hooks/useThumbnailExtractor'
import { useStore } from '../store'

export function AppShell() {
  useKeyboardShortcuts()
  const { showOverlay, fileInputRef, openFilePicker, handleFileInputChange } = useFileImport()
  useThumbnailExtractor()
  const hasClips = useStore((s) => Object.keys(s.clips).length > 0)

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-white">
      <TopBar
        onImportClick={openFilePicker}
        fileInputRef={fileInputRef}
        onFileInputChange={handleFileInputChange}
      />
      <div className="flex flex-row flex-1 overflow-hidden">
        <ToolSidebar />
        <main className="flex-1 flex items-center justify-center">
          {hasClips ? (
            <span className="text-zinc-600 text-sm">Clip settings — Phase 3</span>
          ) : (
            <EmptyState />
          )}
        </main>
        <ClipSettingsPanel />
      </div>
      <div className="flex-none border-t border-zinc-800" style={{ height: '37vh' }}>
        <TimelinePanel />
      </div>
      <DropOverlay visible={showOverlay} />
    </div>
  )
}
