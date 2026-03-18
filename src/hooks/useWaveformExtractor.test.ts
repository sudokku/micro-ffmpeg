import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useStore } from '../store'
import { resetColorIndex } from '../store'
import { useWaveformExtractor } from './useWaveformExtractor'

// happy-dom does not provide OfflineAudioContext — mock it globally
const mockChannelData = new Float32Array(1000)
for (let i = 0; i < 1000; i++) mockChannelData[i] = Math.sin(i * 0.1) * 0.8

vi.stubGlobal('OfflineAudioContext', class MockOfflineAudioContext {
  decodeAudioData(_buffer: ArrayBuffer): Promise<AudioBuffer> {
    return Promise.resolve({
      getChannelData: () => mockChannelData,
      numberOfChannels: 1,
      length: 1000,
      sampleRate: 22050,
      duration: 1000 / 22050,
    } as unknown as AudioBuffer)
  }
})

function makeAudioFile(name = 'test.mp3'): File {
  return new File([new ArrayBuffer(64)], name, { type: 'audio/mpeg' })
}

function resetStore() {
  useStore.setState({
    tracks: { video: { id: 'video', clipIds: [] }, audio: { id: 'audio', clipIds: [] } },
    clips: {},
    clipSettings: {},
    ui: {
      selectedClipId: null,
      activeTool: 'select',
      playheadTime: 0,
      isPlaying: false,
      pixelsPerSecond: 100,
      selectedClipIds: [],
    },
    export: { status: 'idle', progress: 0 },
  })
  useStore.temporal.getState().clear()
  resetColorIndex()
}

describe('useWaveformExtractor', () => {
  beforeEach(() => {
    resetStore()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('extracts peaks for audio clip with waveformPeaks === null and dispatches setWaveformPeaks', async () => {
    const file = makeAudioFile()
    useStore.getState().addClip(file, 'audio', 5)

    const clipId = useStore.getState().tracks.audio.clipIds[0]
    // Initially peaks are null
    expect(useStore.getState().clips[clipId].waveformPeaks).toBeNull()

    renderHook(() => useWaveformExtractor())

    // Trigger subscription by causing a no-op state update
    useStore.setState((s) => ({ ...s }))

    await waitFor(() => {
      const peaks = useStore.getState().clips[clipId]?.waveformPeaks
      expect(peaks).not.toBeNull()
      expect(Array.isArray(peaks)).toBe(true)
      expect(peaks!.length).toBeGreaterThan(0)
      // Each entry must be a WaveformBar with min/max/rms
      expect(peaks![0]).toHaveProperty('min')
      expect(peaks![0]).toHaveProperty('max')
      expect(peaks![0]).toHaveProperty('rms')
    })
  })

  it('does NOT extract peaks for video clips (trackId === video are ignored)', async () => {
    const file = new File([new ArrayBuffer(64)], 'test.mp4', { type: 'video/mp4' })
    useStore.getState().addClip(file, 'video', 5)

    const clipId = useStore.getState().tracks.video.clipIds[0]
    // Video clips have waveformPeaks null initially
    expect(useStore.getState().clips[clipId].waveformPeaks).toBeNull()

    renderHook(() => useWaveformExtractor())

    // Trigger subscription
    useStore.setState((s) => ({ ...s }))

    // Wait a bit to confirm no extraction runs
    await new Promise((r) => setTimeout(r, 50))

    // Video clip should still have null peaks (hook ignores video clips)
    expect(useStore.getState().clips[clipId].waveformPeaks).toBeNull()
  })

  it('does NOT re-process a clip that already has waveformPeaks !== null', async () => {
    const file = makeAudioFile()
    useStore.getState().addClip(file, 'audio', 5)
    const clipId = useStore.getState().tracks.audio.clipIds[0]

    // Pre-set peaks to simulate already-extracted clip
    useStore.getState().setWaveformPeaks(clipId, [
      { min: -0.5, max: 0.5, rms: 0.35 },
      { min: -1.0, max: 1.0, rms: 0.7 },
    ])

    const decodeSpy = vi.fn().mockResolvedValue({
      getChannelData: () => mockChannelData,
      numberOfChannels: 1,
      length: 1000,
      sampleRate: 22050,
      duration: 1000 / 22050,
    } as unknown as AudioBuffer)

    vi.stubGlobal('OfflineAudioContext', class SpyOfflineAudioContext {
      decodeAudioData = decodeSpy
    })

    renderHook(() => useWaveformExtractor())
    useStore.setState((s) => ({ ...s }))

    await new Promise((r) => setTimeout(r, 50))

    // decodeAudioData should NOT have been called since peaks already exist
    expect(decodeSpy).not.toHaveBeenCalled()

    // Restore original mock
    vi.stubGlobal('OfflineAudioContext', class MockOfflineAudioContext {
      decodeAudioData(_buffer: ArrayBuffer): Promise<AudioBuffer> {
        return Promise.resolve({
          getChannelData: () => mockChannelData,
          numberOfChannels: 1,
          length: 1000,
          sampleRate: 22050,
          duration: 1000 / 22050,
        } as unknown as AudioBuffer)
      }
    })
  })

  it('in-flight dedup: does not process the same clip concurrently', async () => {
    const file = makeAudioFile()
    useStore.getState().addClip(file, 'audio', 5)
    const clipId = useStore.getState().tracks.audio.clipIds[0]

    let resolveFirst!: () => void
    let callCount = 0

    vi.stubGlobal('OfflineAudioContext', class SlowOfflineAudioContext {
      decodeAudioData(_buffer: ArrayBuffer): Promise<AudioBuffer> {
        callCount++
        return new Promise((resolve) => {
          resolveFirst = () => resolve({
            getChannelData: () => mockChannelData,
            numberOfChannels: 1,
            length: 1000,
            sampleRate: 22050,
            duration: 1000 / 22050,
          } as unknown as AudioBuffer)
        })
      }
    })

    renderHook(() => useWaveformExtractor())

    // Trigger subscription twice quickly
    useStore.setState((s) => ({ ...s }))
    useStore.setState((s) => ({ ...s }))

    await new Promise((r) => setTimeout(r, 20))

    // Only one extraction should have started
    expect(callCount).toBe(1)

    // Now resolve and verify peaks are set
    resolveFirst()

    await waitFor(() => {
      expect(useStore.getState().clips[clipId]?.waveformPeaks).not.toBeNull()
    })

    // Restore
    vi.stubGlobal('OfflineAudioContext', class MockOfflineAudioContext {
      decodeAudioData(_buffer: ArrayBuffer): Promise<AudioBuffer> {
        return Promise.resolve({
          getChannelData: () => mockChannelData,
          numberOfChannels: 1,
          length: 1000,
          sampleRate: 22050,
          duration: 1000 / 22050,
        } as unknown as AudioBuffer)
      }
    })
  })
})
