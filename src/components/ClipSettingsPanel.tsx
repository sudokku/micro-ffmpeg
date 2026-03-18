import { useState } from 'react'
import { Lock, Unlock } from 'lucide-react'
import { useStore } from '../store'

export function ClipSettingsPanel() {
  const selectedClipId = useStore((s) => s.ui.selectedClipId)
  const clip = useStore((s) => (selectedClipId ? s.clips[selectedClipId] : undefined))
  const settings = useStore((s) => (selectedClipId ? s.clipSettings[selectedClipId] : undefined))
  const updateClipSettings = useStore((s) => s.updateClipSettings)
  const selectedClipIds = useStore((s) => s.ui.selectedClipIds)
  const bulkUpdateClipSettings = useStore((s) => s.bulkUpdateClipSettings)

  // Local drag state for sliders (commit-on-release pattern)
  const [localBlur, setLocalBlur] = useState<number | null>(null)
  const [localBrightness, setLocalBrightness] = useState<number | null>(null)
  const [localContrast, setLocalContrast] = useState<number | null>(null)
  const [localSaturation, setLocalSaturation] = useState<number | null>(null)

  // Aspect ratio lock state (on by default)
  const [aspectLocked, setAspectLocked] = useState<boolean>(true)

  if (!selectedClipId || !clip) {
    return (
      <div className="flex-none w-60 bg-zinc-900 border-l border-zinc-800 flex items-center justify-center p-4">
        <p className="text-zinc-500 text-sm text-center">Select a clip to edit its settings</p>
      </div>
    )
  }

  // Narrowed references (TypeScript can't narrow selectedClipId/clip in closures)
  const clipId = selectedClipId
  const sourceWidth = clip.sourceWidth
  const sourceHeight = clip.sourceHeight

  // Display values for sliders: local drag value ?? store value ?? default
  const blurDisplay = localBlur ?? settings?.blur ?? 0
  const brightnessDisplay = localBrightness ?? settings?.brightness ?? 0
  const contrastDisplay = localContrast ?? settings?.contrast ?? 1.0
  const saturationDisplay = localSaturation ?? settings?.saturation ?? 1.0

  // Crop display values: use stored crop or default to source dimensions
  const cropX = settings?.crop?.x ?? 0
  const cropY = settings?.crop?.y ?? 0
  const cropWidth = settings?.crop?.width ?? sourceWidth
  const cropHeight = settings?.crop?.height ?? sourceHeight

  // Resize display values: use stored resize or default to source dimensions
  const resizeWidth = settings?.resize?.width ?? sourceWidth
  const resizeHeight = settings?.resize?.height ?? sourceHeight

  // Commit handler helpers
  function commitBlur(value: string) {
    const parsed = parseInt(value, 10)
    if (isNaN(parsed)) return
    if (selectedClipIds.length > 1) {
      bulkUpdateClipSettings(selectedClipIds, { blur: parsed })
    } else {
      updateClipSettings(clipId, { blur: parsed })
    }
    setLocalBlur(null)
  }

  function commitBrightness(value: string) {
    const parsed = parseFloat(value)
    if (isNaN(parsed)) return
    if (selectedClipIds.length > 1) {
      bulkUpdateClipSettings(selectedClipIds, { brightness: parsed })
    } else {
      updateClipSettings(clipId, { brightness: parsed })
    }
    setLocalBrightness(null)
  }

  function commitContrast(value: string) {
    const parsed = parseFloat(value)
    if (isNaN(parsed)) return
    if (selectedClipIds.length > 1) {
      bulkUpdateClipSettings(selectedClipIds, { contrast: parsed })
    } else {
      updateClipSettings(clipId, { contrast: parsed })
    }
    setLocalContrast(null)
  }

  function commitSaturation(value: string) {
    const parsed = parseFloat(value)
    if (isNaN(parsed)) return
    if (selectedClipIds.length > 1) {
      bulkUpdateClipSettings(selectedClipIds, { saturation: parsed })
    } else {
      updateClipSettings(clipId, { saturation: parsed })
    }
    setLocalSaturation(null)
  }

  // Crop change handler
  function handleCropChange(field: 'x' | 'y' | 'width' | 'height', value: string) {
    const parsed = parseInt(value, 10)
    if (isNaN(parsed)) return
    const currentCrop = {
      x: cropX, y: cropY, width: cropWidth, height: cropHeight,
    }
    const newCrop = { ...currentCrop, [field]: parsed }
    if (selectedClipIds.length > 1) {
      bulkUpdateClipSettings(selectedClipIds, { crop: newCrop })
    } else {
      updateClipSettings(clipId, { crop: newCrop })
    }
  }

  // Resize change handler with aspect ratio lock
  function handleResizeChange(field: 'width' | 'height', value: string) {
    const parsed = parseInt(value, 10)
    if (isNaN(parsed)) return

    const aspectRatio = sourceHeight !== 0 ? sourceWidth / sourceHeight : null

    let newWidth = resizeWidth
    let newHeight = resizeHeight

    if (field === 'width') {
      newWidth = parsed
      if (aspectLocked && aspectRatio !== null) {
        newHeight = Math.round(parsed / aspectRatio)
      }
    } else {
      newHeight = parsed
      if (aspectLocked && aspectRatio !== null) {
        newWidth = Math.round(parsed * aspectRatio)
      }
    }

    if (selectedClipIds.length > 1) {
      bulkUpdateClipSettings(selectedClipIds, { resize: { width: newWidth, height: newHeight } })
    } else {
      updateClipSettings(clipId, { resize: { width: newWidth, height: newHeight } })
    }
  }

  return (
    <div className="flex-none w-60 bg-zinc-900 border-l border-zinc-800 flex flex-col overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800">
        <h3 className="text-sm font-medium text-zinc-300 truncate">{clip.sourceFile.name}</h3>
        {selectedClipIds.length > 1 && (
          <span className="ml-2 flex-shrink-0 text-xs font-medium text-zinc-400 bg-zinc-800 rounded px-1.5 py-0.5">
            {selectedClipIds.length} clips
          </span>
        )}
      </div>

      {/* Filters section */}
      <div className="px-3 pt-3 pb-1 text-xs font-semibold text-zinc-400 uppercase tracking-wide">
        Filters
      </div>

      {/* Blur slider */}
      <div className="px-3 py-1.5">
        <div className="flex justify-between text-xs text-zinc-400 mb-1">
          <span>Blur</span>
          <span>{blurDisplay}</span>
        </div>
        <input
          type="range"
          min={0}
          max={10}
          step={1}
          value={blurDisplay}
          onChange={(e) => setLocalBlur(parseInt(e.target.value, 10))}
          onPointerUp={(e) => commitBlur((e.target as HTMLInputElement).value)}
          onTouchEnd={(e) => commitBlur((e.target as HTMLInputElement).value)}
          className="w-full"
          style={{ accentColor: '#3b82f6' }}
        />
      </div>

      {/* Brightness slider */}
      <div className="px-3 py-1.5">
        <div className="flex justify-between text-xs text-zinc-400 mb-1">
          <span>Brightness</span>
          <span>{brightnessDisplay.toFixed(2)}</span>
        </div>
        <input
          type="range"
          min={-1.0}
          max={1.0}
          step={0.05}
          value={brightnessDisplay}
          onChange={(e) => setLocalBrightness(parseFloat(e.target.value))}
          onPointerUp={(e) => commitBrightness((e.target as HTMLInputElement).value)}
          onTouchEnd={(e) => commitBrightness((e.target as HTMLInputElement).value)}
          className="w-full"
          style={{ accentColor: '#3b82f6' }}
        />
      </div>

      {/* Contrast slider */}
      <div className="px-3 py-1.5">
        <div className="flex justify-between text-xs text-zinc-400 mb-1">
          <span>Contrast</span>
          <span>{contrastDisplay.toFixed(2)}</span>
        </div>
        <input
          type="range"
          min={0.0}
          max={2.0}
          step={0.05}
          value={contrastDisplay}
          onChange={(e) => setLocalContrast(parseFloat(e.target.value))}
          onPointerUp={(e) => commitContrast((e.target as HTMLInputElement).value)}
          onTouchEnd={(e) => commitContrast((e.target as HTMLInputElement).value)}
          className="w-full"
          style={{ accentColor: '#3b82f6' }}
        />
      </div>

      {/* Saturation slider */}
      <div className="px-3 py-1.5">
        <div className="flex justify-between text-xs text-zinc-400 mb-1">
          <span>Saturation</span>
          <span>{saturationDisplay.toFixed(2)}</span>
        </div>
        <input
          type="range"
          min={0.0}
          max={3.0}
          step={0.05}
          value={saturationDisplay}
          onChange={(e) => setLocalSaturation(parseFloat(e.target.value))}
          onPointerUp={(e) => commitSaturation((e.target as HTMLInputElement).value)}
          onTouchEnd={(e) => commitSaturation((e.target as HTMLInputElement).value)}
          className="w-full"
          style={{ accentColor: '#3b82f6' }}
        />
      </div>

      {/* Crop section */}
      <div className="px-3 pt-3 pb-1 text-xs font-semibold text-zinc-400 uppercase tracking-wide">
        Crop
      </div>
      <div className="px-3 pb-2 grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-zinc-400">X</label>
          <input
            type="number"
            min={0}
            value={cropX}
            onChange={(e) => handleCropChange('x', e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-white"
          />
        </div>
        <div>
          <label className="text-xs text-zinc-400">Y</label>
          <input
            type="number"
            min={0}
            value={cropY}
            onChange={(e) => handleCropChange('y', e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-white"
          />
        </div>
        <div>
          <label className="text-xs text-zinc-400">Width</label>
          <input
            type="number"
            min={0}
            value={cropWidth}
            onChange={(e) => handleCropChange('width', e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-white"
          />
        </div>
        <div>
          <label className="text-xs text-zinc-400">Height</label>
          <input
            type="number"
            min={0}
            value={cropHeight}
            onChange={(e) => handleCropChange('height', e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-white"
          />
        </div>
      </div>

      {/* Resize section */}
      <div className="px-3 pt-3 pb-1 text-xs font-semibold text-zinc-400 uppercase tracking-wide">
        Resize
      </div>
      <div className="px-3 pb-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="flex-1">
            <label className="text-xs text-zinc-400">Width</label>
            <input
              type="number"
              min={1}
              value={resizeWidth}
              onChange={(e) => handleResizeChange('width', e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-white"
            />
          </div>
          <div className="flex-1">
            <label className="text-xs text-zinc-400">Height</label>
            <input
              type="number"
              min={1}
              value={resizeHeight}
              onChange={(e) => handleResizeChange('height', e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-white"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAspectLocked(!aspectLocked)}
            className="p-1 rounded hover:bg-zinc-700"
            aria-label={aspectLocked ? 'Lock aspect ratio' : 'Unlock aspect ratio'}
          >
            {aspectLocked ? <Lock size={14} /> : <Unlock size={14} />}
          </button>
          <span className="text-xs text-zinc-500">
            {aspectLocked ? 'Aspect ratio locked' : 'Aspect ratio unlocked'}
          </span>
        </div>
      </div>
    </div>
  )
}
