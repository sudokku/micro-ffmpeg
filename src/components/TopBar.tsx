import type { ExportFormat } from '../utils/buildFilterGraph'
import { useStore } from '../store'

interface TopBarProps {
  onImportClick?: () => void
  fileInputRef?: React.RefObject<HTMLInputElement | null>
  onFileInputChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  exportFormat?: ExportFormat
  onExportFormatChange?: (format: ExportFormat) => void
  onExport?: () => void
  onCancel?: () => void
  onDownload?: () => void
}

export function TopBar({
  onImportClick,
  fileInputRef,
  onFileInputChange,
  exportFormat,
  onExportFormatChange,
  onExport,
  onCancel,
  onDownload,
}: TopBarProps) {
  const exportStatus = useStore(s => s.export.status)

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

        {/* Format dropdown — disabled during rendering */}
        <select
          value={exportFormat ?? 'mp4'}
          onChange={(e) => onExportFormatChange?.(e.target.value as ExportFormat)}
          disabled={exportStatus === 'rendering'}
          className="text-sm px-2 py-1.5 rounded bg-zinc-800 text-white border border-zinc-700 disabled:opacity-50"
        >
          <option value="mp4">MP4 / H.264</option>
          <option value="webm">WebM / VP9</option>
          <option value="mov">MOV / H.264</option>
          <option value="gif">GIF</option>
        </select>

        {/* Export / Cancel / Download button */}
        {exportStatus === 'rendering' ? (
          <button
            onClick={onCancel}
            className="text-sm font-medium px-3 py-1.5 rounded bg-red-600 hover:bg-red-500 text-white transition-colors"
          >
            Cancel
          </button>
        ) : exportStatus === 'done' ? (
          <button
            onClick={onDownload}
            className="text-sm font-medium px-3 py-1.5 rounded bg-green-600 hover:bg-green-500 text-white transition-colors"
          >
            Download
          </button>
        ) : (
          <button
            onClick={onExport}
            className="text-sm font-medium px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white transition-colors"
          >
            Export
          </button>
        )}
      </div>
    </header>
  )
}
