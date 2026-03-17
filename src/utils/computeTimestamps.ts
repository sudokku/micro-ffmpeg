/**
 * Compute frame extraction timestamps: 1 frame per 5 seconds, min 1 frame.
 * Timestamps are centered within each interval for representative frames.
 */
export function computeTimestamps(duration: number): number[] {
  const count = Math.max(1, Math.floor(duration / 5))
  return Array.from({ length: count }, (_, i) => (i + 0.5) * (duration / count))
}
