import type { ClipSettings, Clip } from '../store/types'

export const FORMAT_MAP = {
  mp4:  { ext: 'mp4',  mime: 'video/mp4',       codec: 'libx264',    args: ['-preset', 'ultrafast', '-crf', '23'] },
  webm: { ext: 'webm', mime: 'video/webm',       codec: 'libvpx-vp9', args: ['-deadline', 'realtime', '-cpu-used', '8'] },
  mov:  { ext: 'mov',  mime: 'video/quicktime',  codec: 'libx264',    args: ['-preset', 'ultrafast', '-crf', '23'] },
  gif:  { ext: 'gif',  mime: 'image/gif',         codec: null,         args: [] },
} as const

export type ExportFormat = keyof typeof FORMAT_MAP

export function buildOutputFilename(format: ExportFormat): string {
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  return `export-${ts}.${FORMAT_MAP[format].ext}`
}

/**
 * Builds an ffmpeg -vf filter string from ClipSettings.
 * Filter order: setpts -> rotation (transpose) -> flip (hflip/vflip) -> scale (resize) -> crop -> boxblur -> hue -> eq
 * Returns empty string if no filters apply.
 */
export function buildVfFilter(settings: ClipSettings | undefined, _clip: Clip): string {
  if (settings === undefined) return ''

  const filters: string[] = []

  // Speed (setpts) — MUST be first filter to avoid AV sync drift
  if (settings.speed !== 1) {
    filters.push(`setpts=${1 / settings.speed}*PTS`)
  }

  // Rotation (transpose) — after setpts, before flip
  if (settings.rotation === 90) {
    filters.push('transpose=1')
  } else if (settings.rotation === 180) {
    filters.push('vflip')
    filters.push('hflip')
  } else if (settings.rotation === 270) {
    filters.push('transpose=2')
  }

  // Flip — after rotation
  if (settings.flipH) filters.push('hflip')
  if (settings.flipV) filters.push('vflip')

  // Scale (resize)
  if (settings.resize != null) {
    filters.push(`scale=${settings.resize.width}:${settings.resize.height}`)
  }

  // Crop — after scale
  if (settings.crop != null) {
    const { width, height, x, y } = settings.crop
    filters.push(`crop=${width}:${height}:${x}:${y}`)
  }

  // Blur
  if (settings.blur > 0) {
    filters.push(`boxblur=${settings.blur}:${settings.blur}`)
  }

  // Hue shift — named-param syntax (positional is deprecated)
  if (settings.hue !== 0) {
    filters.push(`hue=h=${settings.hue}`)
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

/**
 * Builds an ffmpeg -af filter string for audio speed (atempo) and volume.
 * atempo range is 0.5-2.0; values outside require chaining.
 * Returns empty string if no audio filters apply.
 */
export function buildAfFilter(speed: ClipSettings['speed'], volume: number): string {
  const parts: string[] = []
  if (speed !== 1) {
    if (speed === 0.25) { parts.push('atempo=0.5', 'atempo=0.5') }
    else if (speed === 0.5) { parts.push('atempo=0.5') }
    else if (speed === 2) { parts.push('atempo=2.0') }
    else if (speed === 4) { parts.push('atempo=2.0', 'atempo=2.0') }
  }
  if (volume !== 1.0) {
    parts.push(`volume=${volume}`)
  }
  return parts.join(',')
}
