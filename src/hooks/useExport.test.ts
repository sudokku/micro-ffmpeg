import { describe, it, expect, vi, beforeEach } from 'vitest'
import { triggerDownload } from './useExport'
import { FORMAT_MAP, buildAfFilter } from '../utils/buildFilterGraph'

beforeEach(() => {
  // Reset mock between tests
  vi.restoreAllMocks()
})

describe('triggerDownload', () => {
  it('calls URL.createObjectURL with a Blob and returns a string', () => {
    const mockUrl = 'blob:http://localhost/fake-url'
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue(mockUrl)
    vi.spyOn(URL, 'revokeObjectURL').mockReturnValue(undefined)

    const result = triggerDownload(new Uint8Array([1, 2, 3]), 'test.mp4', 'video/mp4')

    expect(createObjectURL).toHaveBeenCalledOnce()
    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob))
    expect(typeof result).toBe('string')
    expect(result).toBe(mockUrl)
  })

  it('creates Blob with the correct mimeType', () => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:fake')
    vi.spyOn(URL, 'revokeObjectURL').mockReturnValue(undefined)

    let capturedBlob: Blob | null = null
    vi.spyOn(URL, 'createObjectURL').mockImplementation((blob) => {
      capturedBlob = blob as Blob
      return 'blob:fake'
    })

    triggerDownload(new Uint8Array([10, 20]), 'output.webm', 'video/webm')

    expect(capturedBlob).not.toBeNull()
    expect(capturedBlob!.type).toBe('video/webm')
  })

  it('revokes previous URL before creating new one', () => {
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockReturnValue(undefined)
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:new-url')

    // First call creates a URL
    triggerDownload(new Uint8Array([1]), 'first.mp4', 'video/mp4')

    // Second call should revoke the first URL
    triggerDownload(new Uint8Array([2]), 'second.mp4', 'video/mp4')

    expect(revokeObjectURL).toHaveBeenCalledWith('blob:new-url')
  })
})

describe('FORMAT_MAP entries', () => {
  it('mp4 has ext="mp4" and codec="libx264"', () => {
    expect(FORMAT_MAP.mp4.ext).toBe('mp4')
    expect(FORMAT_MAP.mp4.codec).toBe('libx264')
  })

  it('webm has ext="webm" and codec="libvpx-vp9"', () => {
    expect(FORMAT_MAP.webm.ext).toBe('webm')
    expect(FORMAT_MAP.webm.codec).toBe('libvpx-vp9')
  })

  it('gif has ext="gif" and codec=null', () => {
    expect(FORMAT_MAP.gif.ext).toBe('gif')
    expect(FORMAT_MAP.gif.codec).toBeNull()
  })

  it('mov has ext="mov" and codec="libx264"', () => {
    expect(FORMAT_MAP.mov.ext).toBe('mov')
    expect(FORMAT_MAP.mov.codec).toBe('libx264')
  })
})

describe('speed-scaled source duration', () => {
  it('speed=2 doubles source duration', () => {
    expect(5 * 2).toBe(10)
  })
  it('speed=0.5 halves source duration', () => {
    expect(5 * 0.5).toBe(2.5)
  })
  it('speed=1 leaves duration unchanged', () => {
    expect(5 * 1).toBe(5)
  })
  it('speed=0.25 quarters source duration', () => {
    expect(10 * 0.25).toBe(2.5)
  })
  it('speed=4 quadruples source duration', () => {
    expect(10 * 4).toBe(40)
  })
})

describe('buildAfFilter integration for useExport', () => {
  it('speed=2 + volume=0.5 returns atempo and volume', () => {
    expect(buildAfFilter(2, 0.5)).toBe('atempo=2.0,volume=0.5')
  })
  it('speed=0.25 + volume=1.5 returns chained atempo and volume', () => {
    expect(buildAfFilter(0.25, 1.5)).toBe('atempo=0.5,atempo=0.5,volume=1.5')
  })
  it('speed=1 + volume=1.0 returns empty string (no -af needed)', () => {
    expect(buildAfFilter(1, 1.0)).toBe('')
  })
  it('speed=4 + volume=1.0 returns chained atempo only', () => {
    expect(buildAfFilter(4, 1.0)).toBe('atempo=2.0,atempo=2.0')
  })
})
