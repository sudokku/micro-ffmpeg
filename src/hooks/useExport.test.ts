import { describe, it, expect, vi, beforeEach } from 'vitest'
import { triggerDownload } from './useExport'
import { FORMAT_MAP } from '../utils/buildFilterGraph'

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
