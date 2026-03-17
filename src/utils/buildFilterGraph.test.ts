import { describe, it, expect } from 'vitest'
import { buildVfFilter, buildAfFilter, FORMAT_MAP } from './buildFilterGraph'
import type { ClipSettings, Clip } from '../store/types'

const baseClip: Clip = {
  id: 'c1',
  trackId: 'video',
  sourceFile: new File([], 'test.mp4'),
  sourceDuration: 10,
  sourceWidth: 1920,
  sourceHeight: 1080,
  startTime: 0,
  endTime: 10,
  trimStart: 0,
  trimEnd: 0,
  color: '#3b82f6',
  thumbnailUrls: [],
  waveformPeaks: null,
}

const defaultSettings: ClipSettings = {
  clipId: 'c1',
  blur: 0,
  brightness: 0,
  contrast: 1,
  saturation: 1,
  crop: null,
  resize: null,
  speed: 1 as const,
  rotation: 0 as const,
  volume: 1.0,
  hue: 0,
  flipH: false,
  flipV: false,
}

describe('buildVfFilter', () => {
  it('returns empty string when settings is undefined', () => {
    expect(buildVfFilter(undefined, baseClip)).toBe('')
  })

  it('returns empty string when all settings are defaults (blur=0, brightness=0, contrast=1, saturation=1, no crop, no resize)', () => {
    expect(buildVfFilter(defaultSettings, baseClip)).toBe('')
  })

  it('blur=5 returns "boxblur=5:5"', () => {
    const settings: ClipSettings = { ...defaultSettings, blur: 5 }
    expect(buildVfFilter(settings, baseClip)).toBe('boxblur=5:5')
  })

  it('blur=0 omits boxblur', () => {
    const settings: ClipSettings = { ...defaultSettings, blur: 0 }
    expect(buildVfFilter(settings, baseClip)).toBe('')
  })

  it('brightness=0.3, contrast=1.2, saturation=1.5 returns eq filter', () => {
    const settings: ClipSettings = { ...defaultSettings, brightness: 0.3, contrast: 1.2, saturation: 1.5 }
    expect(buildVfFilter(settings, baseClip)).toBe('eq=brightness=0.3:contrast=1.2:saturation=1.5')
  })

  it('only brightness changed returns eq filter with all three eq params', () => {
    const settings: ClipSettings = { ...defaultSettings, brightness: 0.5 }
    expect(buildVfFilter(settings, baseClip)).toBe('eq=brightness=0.5:contrast=1:saturation=1')
  })

  it('only contrast changed returns eq filter', () => {
    const settings: ClipSettings = { ...defaultSettings, contrast: 1.8 }
    expect(buildVfFilter(settings, baseClip)).toBe('eq=brightness=0:contrast=1.8:saturation=1')
  })

  it('only saturation changed returns eq filter', () => {
    const settings: ClipSettings = { ...defaultSettings, saturation: 2.0 }
    expect(buildVfFilter(settings, baseClip)).toBe('eq=brightness=0:contrast=1:saturation=2')
  })

  it('crop={x:10,y:20,width:100,height:200} returns "crop=100:200:10:20"', () => {
    const settings: ClipSettings = { ...defaultSettings, crop: { x: 10, y: 20, width: 100, height: 200 } }
    expect(buildVfFilter(settings, baseClip)).toBe('crop=100:200:10:20')
  })

  it('resize={width:1280,height:720} returns "scale=1280:720"', () => {
    const settings: ClipSettings = { ...defaultSettings, resize: { width: 1280, height: 720 } }
    expect(buildVfFilter(settings, baseClip)).toBe('scale=1280:720')
  })

  it('blur=3, crop, and eq filters are all present, joined by commas with scale/crop before color grading', () => {
    const settings: ClipSettings = {
      clipId: 'c1',
      blur: 3,
      brightness: 0.1,
      contrast: 1,
      saturation: 1,
      crop: { x: 0, y: 0, width: 100, height: 100 },
      resize: null,
      speed: 1 as const,
      rotation: 0 as const,
      volume: 1.0,
      hue: 0,
      flipH: false,
      flipV: false,
    }
    const result = buildVfFilter(settings, baseClip)
    // crop should come before boxblur and eq
    const cropIdx = result.indexOf('crop=')
    const blurIdx = result.indexOf('boxblur=')
    const eqIdx = result.indexOf('eq=')
    expect(cropIdx).toBeGreaterThanOrEqual(0)
    expect(blurIdx).toBeGreaterThanOrEqual(0)
    expect(eqIdx).toBeGreaterThanOrEqual(0)
    expect(cropIdx).toBeLessThan(blurIdx)
    expect(result).toContain('crop=100:100:0:0')
    expect(result).toContain('boxblur=3:3')
    expect(result).toContain('eq=brightness=0.1:contrast=1:saturation=1')
    // Joined by commas
    expect(result).toContain(',')
  })

  it('resize and crop and blur combined — scale first, then crop, then boxblur', () => {
    const settings: ClipSettings = {
      clipId: 'c1',
      blur: 2,
      brightness: 0,
      contrast: 1,
      saturation: 1,
      crop: { x: 5, y: 5, width: 200, height: 150 },
      resize: { width: 1280, height: 720 },
      speed: 1 as const,
      rotation: 0 as const,
      volume: 1.0,
      hue: 0,
      flipH: false,
      flipV: false,
    }
    const result = buildVfFilter(settings, baseClip)
    const scaleIdx = result.indexOf('scale=')
    const cropIdx = result.indexOf('crop=')
    const blurIdx = result.indexOf('boxblur=')
    expect(scaleIdx).toBeLessThan(cropIdx)
    expect(cropIdx).toBeLessThan(blurIdx)
  })
})

describe('buildVfFilter — setpts (speed)', () => {
  it('speed=0.25 produces setpts=4*PTS as first filter', () => {
    const settings: ClipSettings = { ...defaultSettings, speed: 0.25 as const }
    const result = buildVfFilter(settings, baseClip)
    expect(result.startsWith('setpts=4*PTS')).toBe(true)
  })

  it('speed=0.5 produces setpts=2*PTS as first filter', () => {
    const settings: ClipSettings = { ...defaultSettings, speed: 0.5 as const }
    const result = buildVfFilter(settings, baseClip)
    expect(result.startsWith('setpts=2*PTS')).toBe(true)
  })

  it('speed=1 omits setpts', () => {
    const result = buildVfFilter(defaultSettings, baseClip)
    expect(result).toBe('')
    expect(result).not.toContain('setpts')
  })

  it('speed=2 produces setpts=0.5*PTS', () => {
    const settings: ClipSettings = { ...defaultSettings, speed: 2 as const }
    const result = buildVfFilter(settings, baseClip)
    expect(result).toContain('setpts=0.5*PTS')
  })

  it('speed=4 produces setpts=0.25*PTS', () => {
    const settings: ClipSettings = { ...defaultSettings, speed: 4 as const }
    const result = buildVfFilter(settings, baseClip)
    expect(result).toContain('setpts=0.25*PTS')
  })
})

describe('buildVfFilter — rotation', () => {
  it('rotation=0 does not contain transpose', () => {
    const result = buildVfFilter(defaultSettings, baseClip)
    expect(result).not.toContain('transpose')
  })

  it('rotation=90 contains transpose=1', () => {
    const settings: ClipSettings = { ...defaultSettings, rotation: 90 as const }
    const result = buildVfFilter(settings, baseClip)
    expect(result).toContain('transpose=1')
  })

  it('rotation=180 contains vflip and hflip adjacent (vflip then hflip)', () => {
    const settings: ClipSettings = { ...defaultSettings, rotation: 180 as const }
    const result = buildVfFilter(settings, baseClip)
    expect(result).toContain('vflip')
    expect(result).toContain('hflip')
    const vflipIdx = result.indexOf('vflip')
    const hflipIdx = result.indexOf('hflip')
    expect(vflipIdx).toBeLessThan(hflipIdx)
  })

  it('rotation=270 contains transpose=2', () => {
    const settings: ClipSettings = { ...defaultSettings, rotation: 270 as const }
    const result = buildVfFilter(settings, baseClip)
    expect(result).toContain('transpose=2')
  })
})

describe('buildVfFilter — flip', () => {
  it('flipH=true contains hflip', () => {
    const settings: ClipSettings = { ...defaultSettings, flipH: true }
    const result = buildVfFilter(settings, baseClip)
    expect(result).toContain('hflip')
  })

  it('flipV=true contains vflip', () => {
    const settings: ClipSettings = { ...defaultSettings, flipV: true }
    const result = buildVfFilter(settings, baseClip)
    expect(result).toContain('vflip')
  })

  it('flipH=true and flipV=true contains both hflip and vflip', () => {
    const settings: ClipSettings = { ...defaultSettings, flipH: true, flipV: true }
    const result = buildVfFilter(settings, baseClip)
    expect(result).toContain('hflip')
    expect(result).toContain('vflip')
  })

  it('rotation=90 + flipH=true — transpose=1 appears before hflip', () => {
    const settings: ClipSettings = { ...defaultSettings, rotation: 90 as const, flipH: true }
    const result = buildVfFilter(settings, baseClip)
    const transposeIdx = result.indexOf('transpose=1')
    const hflipIdx = result.lastIndexOf('hflip')
    expect(transposeIdx).toBeGreaterThanOrEqual(0)
    expect(hflipIdx).toBeGreaterThanOrEqual(0)
    expect(transposeIdx).toBeLessThan(hflipIdx)
  })
})

describe('buildVfFilter — hue', () => {
  it('hue=0 does not contain hue filter', () => {
    const result = buildVfFilter(defaultSettings, baseClip)
    expect(result).not.toContain('hue')
  })

  it('hue=45 contains hue=h=45 (named-param syntax)', () => {
    const settings: ClipSettings = { ...defaultSettings, hue: 45 }
    const result = buildVfFilter(settings, baseClip)
    expect(result).toContain('hue=h=45')
    expect(result).not.toContain('hue=45')
  })

  it('hue=-30 contains hue=h=-30', () => {
    const settings: ClipSettings = { ...defaultSettings, hue: -30 }
    const result = buildVfFilter(settings, baseClip)
    expect(result).toContain('hue=h=-30')
  })
})

describe('buildVfFilter — full chain order', () => {
  it('setpts < transpose < hflip < scale < crop < boxblur < hue=h < eq=brightness', () => {
    const settings: ClipSettings = {
      ...defaultSettings,
      speed: 2 as const,
      rotation: 90 as const,
      flipH: true,
      resize: { width: 1280, height: 720 },
      crop: { x: 0, y: 0, width: 100, height: 100 },
      blur: 3,
      hue: 45,
      brightness: 0.1,
    }
    const result = buildVfFilter(settings, baseClip)
    const setptsIdx = result.indexOf('setpts=')
    const transposeIdx = result.indexOf('transpose=1')
    const hflipIdx = result.lastIndexOf('hflip')
    const scaleIdx = result.indexOf('scale=')
    const cropIdx = result.indexOf('crop=')
    const boxblurIdx = result.indexOf('boxblur=')
    const hueIdx = result.indexOf('hue=h=')
    const eqIdx = result.indexOf('eq=brightness=')
    expect(setptsIdx).toBeGreaterThanOrEqual(0)
    expect(transposeIdx).toBeGreaterThanOrEqual(0)
    expect(hflipIdx).toBeGreaterThanOrEqual(0)
    expect(scaleIdx).toBeGreaterThanOrEqual(0)
    expect(cropIdx).toBeGreaterThanOrEqual(0)
    expect(boxblurIdx).toBeGreaterThanOrEqual(0)
    expect(hueIdx).toBeGreaterThanOrEqual(0)
    expect(eqIdx).toBeGreaterThanOrEqual(0)
    expect(setptsIdx).toBeLessThan(transposeIdx)
    expect(transposeIdx).toBeLessThan(hflipIdx)
    expect(hflipIdx).toBeLessThan(scaleIdx)
    expect(scaleIdx).toBeLessThan(cropIdx)
    expect(cropIdx).toBeLessThan(boxblurIdx)
    expect(boxblurIdx).toBeLessThan(hueIdx)
    expect(hueIdx).toBeLessThan(eqIdx)
  })
})

describe('buildAfFilter', () => {
  it('speed=1, volume=1.0 returns empty string', () => {
    expect(buildAfFilter(1, 1.0)).toBe('')
  })

  it('speed=0.25, volume=1.0 returns "atempo=0.5,atempo=0.5"', () => {
    expect(buildAfFilter(0.25, 1.0)).toBe('atempo=0.5,atempo=0.5')
  })

  it('speed=0.5, volume=1.0 returns "atempo=0.5"', () => {
    expect(buildAfFilter(0.5, 1.0)).toBe('atempo=0.5')
  })

  it('speed=2, volume=1.0 returns "atempo=2.0"', () => {
    expect(buildAfFilter(2, 1.0)).toBe('atempo=2.0')
  })

  it('speed=4, volume=1.0 returns "atempo=2.0,atempo=2.0"', () => {
    expect(buildAfFilter(4, 1.0)).toBe('atempo=2.0,atempo=2.0')
  })

  it('speed=1, volume=0.5 returns "volume=0.5"', () => {
    expect(buildAfFilter(1, 0.5)).toBe('volume=0.5')
  })

  it('speed=1, volume=2.0 returns "volume=2"', () => {
    expect(buildAfFilter(1, 2.0)).toBe('volume=2')
  })

  it('speed=1, volume=0 returns "volume=0"', () => {
    expect(buildAfFilter(1, 0)).toBe('volume=0')
  })

  it('speed=2, volume=0.5 returns "atempo=2.0,volume=0.5"', () => {
    expect(buildAfFilter(2, 0.5)).toBe('atempo=2.0,volume=0.5')
  })

  it('speed=0.25, volume=1.5 returns "atempo=0.5,atempo=0.5,volume=1.5"', () => {
    expect(buildAfFilter(0.25, 1.5)).toBe('atempo=0.5,atempo=0.5,volume=1.5')
  })
})

describe('FORMAT_MAP', () => {
  it('mp4 has ext="mp4", mime="video/mp4", codec="libx264", args with -preset ultrafast -crf 23', () => {
    expect(FORMAT_MAP.mp4.ext).toBe('mp4')
    expect(FORMAT_MAP.mp4.mime).toBe('video/mp4')
    expect(FORMAT_MAP.mp4.codec).toBe('libx264')
    expect(FORMAT_MAP.mp4.args).toContain('-preset')
    expect(FORMAT_MAP.mp4.args).toContain('ultrafast')
    expect(FORMAT_MAP.mp4.args).toContain('-crf')
    expect(FORMAT_MAP.mp4.args).toContain('23')
  })

  it('webm has ext="webm", codec="libvpx-vp9", args with -deadline realtime', () => {
    expect(FORMAT_MAP.webm.ext).toBe('webm')
    expect(FORMAT_MAP.webm.mime).toBe('video/webm')
    expect(FORMAT_MAP.webm.codec).toBe('libvpx-vp9')
    expect(FORMAT_MAP.webm.args).toContain('-deadline')
    expect(FORMAT_MAP.webm.args).toContain('realtime')
  })

  it('gif has ext="gif", codec=null', () => {
    expect(FORMAT_MAP.gif.ext).toBe('gif')
    expect(FORMAT_MAP.gif.mime).toBe('image/gif')
    expect(FORMAT_MAP.gif.codec).toBeNull()
  })

  it('mov has ext="mov", codec="libx264"', () => {
    expect(FORMAT_MAP.mov.ext).toBe('mov')
    expect(FORMAT_MAP.mov.codec).toBe('libx264')
  })
})
