import { describe, it, expect } from 'vitest'
import { extractPeaks, BARS_PER_SECOND } from './extractPeaks'
import type { WaveformBar } from './extractPeaks'

function mockAudioBuffer(samples: number[], sampleRate = 22050): AudioBuffer {
  const float32 = new Float32Array(samples)
  return {
    getChannelData: () => float32,
    numberOfChannels: 1,
    length: samples.length,
    sampleRate,
    duration: samples.length / sampleRate,
  } as unknown as AudioBuffer
}

describe('extractPeaks', () => {
  it('returns WaveformBar array sized by duration * BARS_PER_SECOND', () => {
    // 22050 samples at 22050 Hz = 1 second → 10 bars
    const samples = new Array(22050).fill(0).map((_, i) => Math.sin(i * 0.01) * 0.5)
    const result = extractPeaks(mockAudioBuffer(samples))
    expect(result).toHaveLength(BARS_PER_SECOND) // 10
  })

  it('each bar has min <= 0, max >= 0, rms >= 0', () => {
    const samples = new Array(22050).fill(0).map((_, i) => Math.sin(i * 0.1) * 0.8)
    const result = extractPeaks(mockAudioBuffer(samples))
    for (const bar of result) {
      expect(bar.min).toBeLessThanOrEqual(0)
      expect(bar.max).toBeGreaterThanOrEqual(0)
      expect(bar.rms).toBeGreaterThanOrEqual(0)
    }
  })

  it('does NOT globally normalize — values stay on [-1, 1] absolute scale', () => {
    // 22050 samples at amplitude 0.3 — max should stay near 0.3, not become 1.0
    const samples = new Array(22050).fill(0.3)
    const result = extractPeaks(mockAudioBuffer(samples))
    const maxVal = Math.max(...result.map((b) => b.max))
    expect(maxVal).toBeCloseTo(0.3, 1)
  })

  it('silent audio returns all-zero bars', () => {
    const result = extractPeaks(mockAudioBuffer(new Array(22050).fill(0)))
    for (const bar of result) {
      expect(bar.min).toBe(0)
      expect(bar.max).toBe(0)
      expect(bar.rms).toBe(0)
    }
  })

  it('rms is lower than block-max for typical audio (sinusoidal signal)', () => {
    // sin wave: peak = amplitude, rms = amplitude / sqrt(2)
    const samples = new Array(22050).fill(0).map((_, i) => Math.sin(i * 0.01) * 0.9)
    const result = extractPeaks(mockAudioBuffer(samples))
    for (const bar of result) {
      if (bar.max > 0.01) {
        expect(bar.rms).toBeLessThan(bar.max)
      }
    }
  })

  it('respects custom barsPerSecond argument', () => {
    // 22050 samples = 1 second at 22050 Hz
    const samples = new Array(22050).fill(0.5)
    const result = extractPeaks(mockAudioBuffer(samples), 20)
    expect(result).toHaveLength(20)
  })

  it('returns typed WaveformBar objects', () => {
    const samples = new Array(22050).fill(0).map((_, i) => Math.sin(i * 0.1))
    const result = extractPeaks(mockAudioBuffer(samples))
    const bar: WaveformBar = result[0]
    expect(typeof bar.min).toBe('number')
    expect(typeof bar.max).toBe('number')
    expect(typeof bar.rms).toBe('number')
  })
})
