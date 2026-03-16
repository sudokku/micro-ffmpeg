import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { TimelinePanel } from './TimelinePanel'

// Mock the Timeline component since it relies on browser DOM APIs (canvas, ResizeObserver)
// that jsdom does not support. We verify the correct props are passed.
vi.mock('@xzdarcy/react-timeline-editor', () => ({
  Timeline: (props: Record<string, unknown>) => {
    const data = props.editorData as Array<{ id: string; actions: unknown[] }>
    return (
      <div data-testid="timeline-mock">
        {data.map((row) => (
          <div key={row.id} data-testid={`timeline-row-${row.id}`}>
            {row.id}
          </div>
        ))}
      </div>
    )
  },
}))

describe('TimelinePanel', () => {
  it('renders two rows: video and audio', () => {
    const { getByTestId } = render(<TimelinePanel />)
    expect(getByTestId('timeline-row-video')).toBeDefined()
    expect(getByTestId('timeline-row-audio')).toBeDefined()
  })

  it('renders exactly two rows', () => {
    const { container } = render(<TimelinePanel />)
    const rows = container.querySelectorAll('[data-testid^="timeline-row-"]')
    expect(rows.length).toBe(2)
  })
})
