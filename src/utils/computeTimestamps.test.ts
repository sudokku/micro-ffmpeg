import { describe, it, expect } from 'vitest'
import { computeTimestamps } from './computeTimestamps'

describe('computeTimestamps', () => {
  it('returns 1 frame for duration < 5 seconds', () => {
    const ts = computeTimestamps(3)
    expect(ts).toHaveLength(1)
    expect(ts[0]).toBeCloseTo(1.5)
  })

  it('returns 1 frame for duration = 5 seconds', () => {
    const ts = computeTimestamps(5)
    expect(ts).toHaveLength(1)
    expect(ts[0]).toBeCloseTo(2.5)
  })

  it('returns 2 frames for duration = 10 seconds', () => {
    const ts = computeTimestamps(10)
    expect(ts).toHaveLength(2)
    expect(ts[0]).toBeCloseTo(2.5)
    expect(ts[1]).toBeCloseTo(7.5)
  })

  it('returns 6 frames for 30 second clip', () => {
    const ts = computeTimestamps(30)
    expect(ts).toHaveLength(6)
  })

  it('returns min 1 frame even for very short clips', () => {
    const ts = computeTimestamps(0.5)
    expect(ts).toHaveLength(1)
  })
})
