import { Timeline } from '@xzdarcy/react-timeline-editor'
import type { TimelineRow, TimelineEffect } from '@xzdarcy/react-timeline-editor'
import '@xzdarcy/react-timeline-editor/dist/react-timeline-editor.css'

// Phase 1: static empty rows. Phase 2 will derive from store.
const editorData: TimelineRow[] = [
  { id: 'video', actions: [] },
  { id: 'audio', actions: [] },
]

const effects: Record<string, TimelineEffect> = {}

export function TimelinePanel() {
  return (
    <Timeline
      editorData={editorData}
      effects={effects}
      autoScroll={false}
      style={{ height: '100%', width: '100%', backgroundColor: '#191b1d' }}
    />
  )
}
