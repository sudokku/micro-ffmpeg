import type { TimelineRow } from '@xzdarcy/react-timeline-editor'
import type { StoreState } from '../store/types'

export function deriveEditorData(
  tracks: StoreState['tracks'],
  clips: StoreState['clips'],
  selectedClipId: string | null
): TimelineRow[] {
  return (['video', 'audio'] as const).map((trackId) => ({
    id: trackId,
    actions: tracks[trackId].clipIds
      .filter((id) => clips[id])
      .map((id) => {
        const clip = clips[id]
        const maxDuration = clip.sourceDuration - clip.trimStart - clip.trimEnd
        return {
          id: clip.id,
          start: clip.startTime,
          end: clip.endTime,
          maxEnd: clip.startTime + maxDuration,
          effectId: 'default',
          flexible: true,
          movable: true,
          selected: clip.id === selectedClipId,
        }
      }),
  }))
}
