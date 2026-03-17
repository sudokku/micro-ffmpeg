import { useState } from 'react'
import { TopBar } from './TopBar'
import { ToolSidebar } from './ToolSidebar'
import { TimelinePanel } from './TimelinePanel'
import { DropOverlay } from './DropOverlay'
import { EmptyState } from './EmptyState'
import { ClipSettingsPanel } from './ClipSettingsPanel'
import { ExportProgressBar } from './ExportProgressBar'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import { useFileImport } from '../hooks/useFileImport'
import { useThumbnailExtractor } from '../hooks/useThumbnailExtractor'
import { useExport } from '../hooks/useExport'
import { useStore } from '../store'
import type { ExportFormat } from '../utils/buildFilterGraph'

export function AppShell() {
  useKeyboardShortcuts()
  const { showOverlay, fileInputRef, openFilePicker, handleFileInputChange } = useFileImport()
  useThumbnailExtractor()
  const hasClips = useStore((s) => Object.keys(s.clips).length > 0)
  const { runExport, cancelExport, performDownload } = useExport()
  const [exportFormat, setExportFormat] = useState<ExportFormat>('mp4')
  const exportStatus = useStore((s) => s.export.status)
  const isExporting = exportStatus === 'rendering'

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-white">
      <TopBar
        onImportClick={openFilePicker}
        fileInputRef={fileInputRef}
        onFileInputChange={handleFileInputChange}
        exportFormat={exportFormat}
        onExportFormatChange={setExportFormat}
        onExport={() => runExport(exportFormat)}
        onCancel={cancelExport}
        onDownload={performDownload}
      />
      <ExportProgressBar />
      <div className={`flex flex-row flex-1 overflow-hidden ${isExporting ? 'pointer-events-none opacity-50' : ''}`}>
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
      <div className={`flex-none border-t border-zinc-800 ${isExporting ? 'pointer-events-none opacity-50' : ''}`} style={{ height: '37vh' }}>
        <TimelinePanel />
      </div>
      <DropOverlay visible={showOverlay} />
    </div>
  )
}
