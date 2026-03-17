import type { ClipSettings, Clip } from '../store/types'

export const FORMAT_MAP = {
  mp4:  { ext: 'mp4',  mime: 'video/mp4',       codec: 'libx264',    args: ['-preset', 'fast', '-crf', '23'] },
  webm: { ext: 'webm', mime: 'video/webm',       codec: 'libvpx-vp9', args: ['-deadline', 'realtime', '-cpu-used', '8'] },
  mov:  { ext: 'mov',  mime: 'video/quicktime',  codec: 'libx264',    args: ['-preset', 'fast', '-crf', '23'] },
  gif:  { ext: 'gif',  mime: 'image/gif',         codec: null,         args: [] },
} as const

export type ExportFormat = keyof typeof FORMAT_MAP

export function buildOutputFilename(format: ExportFormat): string {
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  return `export-${ts}.${FORMAT_MAP[format].ext}`
}

/**
 * Builds an ffmpeg -vf filter string from ClipSettings.
 * Filter order: scale (resize) → crop → boxblur → eq
 * Returns empty string if no filters apply.
 */
export function buildVfFilter(settings: ClipSettings | undefined, _clip: Clip): string {
  if (settings === undefined) return ''

  const filters: string[] = []

  // Scale (resize) — first in chain
  if (settings.resize !== null) {
    filters.push(`scale=${settings.resize.width}:${settings.resize.height}`)
  }

  // Crop — after scale
  if (settings.crop !== null) {
    const { width, height, x, y } = settings.crop
    filters.push(`crop=${width}:${height}:${x}:${y}`)
  }

  // Blur
  if (settings.blur > 0) {
    filters.push(`boxblur=${settings.blur}:${settings.blur}`)
  }

  // Color grading — only when any value differs from default
  const brightnessChanged = settings.brightness !== 0
  const contrastChanged = settings.contrast !== 1
  const saturationChanged = settings.saturation !== 1
  if (brightnessChanged || contrastChanged || saturationChanged) {
    filters.push(`eq=brightness=${settings.brightness}:contrast=${settings.contrast}:saturation=${settings.saturation}`)
  }

  return filters.join(',')
}
