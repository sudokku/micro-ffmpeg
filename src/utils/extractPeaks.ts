export const BARS_PER_SECOND = 10

export interface WaveformBar {
  min: number // most-negative sample in block (range [-1, 0])
  max: number // most-positive sample in block (range [0, 1])
  rms: number // root mean square of all samples in block (range [0, 1])
}

/**
 * Downsample an AudioBuffer's first channel to WaveformBar[] at BARS_PER_SECOND resolution.
 * Stores min/max/rms per bar — no global normalization, preserves inter-clip dynamics.
 */
export function extractPeaks(
  audioBuffer: AudioBuffer,
  barsPerSecond = BARS_PER_SECOND,
): WaveformBar[] {
  const channelData = audioBuffer.getChannelData(0)
  const barCount = Math.max(1, Math.ceil(audioBuffer.duration * barsPerSecond))
  const blockSize = Math.floor(channelData.length / barCount)

  if (blockSize === 0) {
    return Array.from({ length: barCount }, () => ({ min: 0, max: 0, rms: 0 }))
  }

  const bars: WaveformBar[] = []

  for (let i = 0; i < barCount; i++) {
    const start = i * blockSize
    const end = Math.min(start + blockSize, channelData.length)
    let min = 0
    let max = 0
    let sumSq = 0

    for (let j = start; j < end; j++) {
      const s = channelData[j]
      if (s < min) min = s
      if (s > max) max = s
      sumSq += s * s
    }

    bars.push({ min, max, rms: Math.sqrt(sumSq / (end - start)) })
  }

  return bars
}
