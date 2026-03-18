import { useRef, useEffect } from 'react'
import type { Clip, WaveformBar } from '../store/types'
import { useStore } from '../store'

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// Maps linear amplitude [0,1] to display height [0,1] using a log scale.
// -60 dB floor: quiet signals stay visible; loud signals don't blow out.
const FLOOR_DB = -60
function ampToHeight(amp: number): number {
  if (amp < 1e-6) return 0
  const db = 20 * Math.log10(amp)
  return Math.max(0, (db - FLOOR_DB) / -FLOOR_DB)
}

function WaveformCanvas({
  bars,
  trimStart,
  trimEnd,
  sourceDuration,
}: {
  bars: WaveformBar[]
  trimStart: number
  trimEnd: number
  sourceDuration: number
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    function draw() {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const dpr = window.devicePixelRatio || 1
      const w = canvas.offsetWidth
      const h = canvas.offsetHeight
      if (!w || !h) return

      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.scale(dpr, dpr)
      ctx.clearRect(0, 0, w, h)

      // Slice to the visible trim window (10 bars/sec stored)
      const startIdx = Math.floor((trimStart / sourceDuration) * bars.length)
      const endIdx = Math.ceil((trimEnd / sourceDuration) * bars.length)
      const visible = bars.slice(startIdx, endIdx)
      if (visible.length === 0) return

      const cy = h / 2
      const n = visible.length

      // Distribute bars proportionally across the full canvas width so they
      // always reach the right edge — independent of the exact bar count.
      // This handles the case where audioBuffer.duration (used to build bars)
      // is slightly shorter than sourceDuration (from the media element).
      const getSlot = (i: number) => {
        const x0 = Math.round((i / n) * w)
        const x1 = Math.round(((i + 1) / n) * w)
        const bw = Math.max(1, x1 - x0 - (x1 - x0 > 1 ? 1 : 0)) // 1px gap when wide enough
        return { x: x0, bw }
      }

      // Outer layer: min/max envelope (faint — shows peak transients)
      ctx.fillStyle = 'rgba(255,255,255,0.3)'
      for (let i = 0; i < n; i++) {
        const { x, bw } = getSlot(i)
        const { min, max } = visible[i]
        const topH = ampToHeight(max) * cy
        const botH = ampToHeight(Math.abs(min)) * cy
        const totalH = Math.max(1, Math.round(topH + botH))
        ctx.fillRect(x, Math.round(cy - topH), bw, totalH)
      }

      // Inner layer: RMS fill (bright — shows perceived loudness)
      ctx.fillStyle = 'rgba(255,255,255,0.75)'
      for (let i = 0; i < n; i++) {
        const rmsH = ampToHeight(visible[i].rms) * cy
        if (rmsH < 0.5) continue
        const { x, bw } = getSlot(i)
        const h2 = Math.max(1, Math.round(rmsH * 2))
        ctx.fillRect(x, Math.round(cy - rmsH), bw, h2)
      }
    }

    draw()
    const ro = new ResizeObserver(draw)
    ro.observe(canvas)
    return () => ro.disconnect()
  }, [bars, trimStart, trimEnd, sourceDuration])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
    />
  )
}

interface ClipActionProps {
  clip: Clip
  isSelected: boolean
  cursorClass: string
}

export function ClipAction({ clip, isSelected, cursorClass }: ClipActionProps) {
  const thumbnail = clip.thumbnailUrls[0] ?? null
  const isVideoClip = clip.trackId === 'video'
  // Read trim positions directly from store so waveform updates immediately after resize,
  // independent of when the timeline library re-invokes getActionRender.
  const trimStart = useStore((s) => s.clips[clip.id]?.trimStart ?? 0)
  const trimEnd = useStore((s) => s.clips[clip.id]?.trimEnd ?? clip.sourceDuration)

  return (
    <div
      className={`relative h-full w-full overflow-hidden flex items-center ${cursorClass} ${
        isSelected ? 'outline outline-2 outline-offset-[-2px] outline-white' : ''
      }`}
      style={{ backgroundColor: clip.color + 'D9' }}
    >
      {/* Thumbnail (video only) */}
      {isVideoClip && (
        <div className="h-full w-10 flex-shrink-0 overflow-hidden">
          {thumbnail ? (
            <img
              src={thumbnail}
              className="h-full w-full object-cover"
              draggable={false}
              alt=""
            />
          ) : (
            /* shimmer while extracting */
            <div
              className="h-full w-full animate-pulse"
              style={{ backgroundColor: clip.color + '80' }}
            />
          )}
        </div>
      )}

      {/* Waveform (audio only) */}
      {!isVideoClip && clip.waveformPeaks && (
        <WaveformCanvas
          bars={clip.waveformPeaks}
          trimStart={trimStart}
          trimEnd={trimEnd}
          sourceDuration={clip.sourceDuration}
        />
      )}

      {/* Label + duration */}
      <div className="flex-1 min-w-0 px-1.5 select-none">
        <div className="truncate text-xs font-semibold text-white/90 leading-tight">
          {clip.sourceFile.name}
        </div>
        <div className="text-xs text-white/60 leading-tight tabular-nums">
          {formatDuration(clip.sourceDuration)}
        </div>
      </div>
    </div>
  )
}
