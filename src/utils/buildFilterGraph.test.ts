import { describe, it, expect } from 'vitest'
import { buildVfFilter, FORMAT_MAP } from './buildFilterGraph'
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
}

const defaultSettings: ClipSettings = {
  clipId: 'c1',
  blur: 0,
  brightness: 0,
  contrast: 1,
  saturation: 1,
  crop: null,
  resize: null,
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
    }
    const result = buildVfFilter(settings, baseClip)
    const scaleIdx = result.indexOf('scale=')
    const cropIdx = result.indexOf('crop=')
    const blurIdx = result.indexOf('boxblur=')
    expect(scaleIdx).toBeLessThan(cropIdx)
    expect(cropIdx).toBeLessThan(blurIdx)
  })
})

describe('FORMAT_MAP', () => {
  it('mp4 has ext="mp4", mime="video/mp4", codec="libx264", args with -preset fast -crf 23', () => {
    expect(FORMAT_MAP.mp4.ext).toBe('mp4')
    expect(FORMAT_MAP.mp4.mime).toBe('video/mp4')
    expect(FORMAT_MAP.mp4.codec).toBe('libx264')
    expect(FORMAT_MAP.mp4.args).toContain('-preset')
    expect(FORMAT_MAP.mp4.args).toContain('fast')
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
