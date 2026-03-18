import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { ClipAction } from './ClipAction'
import type { Clip, WaveformBar } from '../store/types'

const mockBars: WaveformBar[] = [
  { min: -0.25, max: 0.5, rms: 0.35 },
  { min: -1.0, max: 1.0, rms: 0.7 },
  { min: -0.15, max: 0.3, rms: 0.21 },
]

// Factory for creating test clips
function makeClip(overrides: Partial<Clip> = {}): Clip {
  return {
    id: 'test-clip',
    trackId: 'audio',
    sourceFile: new File([''], 'test.mp3'),
    sourceDuration: 10,
    sourceWidth: 0,
    sourceHeight: 0,
    startTime: 0,
    endTime: 10,
    trimStart: 0,
    trimEnd: 10,
    color: '#3b82f6',
    thumbnailUrls: [],
    waveformPeaks: null,
    ...overrides,
  }
}

describe('ClipAction waveform rendering', () => {
  it('renders canvas for audio clip with waveformPeaks', () => {
    const clip = makeClip({
      trackId: 'audio',
      waveformPeaks: mockBars,
    })
    const { container } = render(
      <ClipAction clip={clip} isSelected={false} cursorClass="cursor-pointer" />
    )
    const canvas = container.querySelector('canvas')
    expect(canvas).not.toBeNull()
    expect(canvas?.className).toContain('pointer-events-none')
  })

  it('does NOT render canvas for video clip', () => {
    const clip = makeClip({
      trackId: 'video',
      waveformPeaks: mockBars,
    })
    const { container } = render(
      <ClipAction clip={clip} isSelected={false} cursorClass="cursor-pointer" />
    )
    const canvas = container.querySelector('canvas')
    expect(canvas).toBeNull()
  })

  it('does NOT render canvas for audio clip with null peaks', () => {
    const clip = makeClip({
      trackId: 'audio',
      waveformPeaks: null,
    })
    const { container } = render(
      <ClipAction clip={clip} isSelected={false} cursorClass="cursor-pointer" />
    )
    const canvas = container.querySelector('canvas')
    expect(canvas).toBeNull()
  })
})
