import { useMemo, useCallback } from 'react'
import { Timeline } from '@xzdarcy/react-timeline-editor'
import type { TimelineRow, TimelineAction, TimelineEffect } from '@xzdarcy/timeline-engine'
import '@xzdarcy/react-timeline-editor/dist/react-timeline-editor.css'
import { useStore } from '../store'
import { deriveEditorData } from '../utils/deriveEditorData'
import { ClipAction } from './ClipAction'

const effects: Record<string, TimelineEffect> = { default: { id: 'default' } }

export function TimelinePanel() {
  const tracks = useStore((s) => s.tracks)
  const clips = useStore((s) => s.clips)
  const selectedClipId = useStore((s) => s.ui.selectedClipId)
  const activeTool = useStore((s) => s.ui.activeTool)
  const moveClip = useStore((s) => s.moveClip)
  const trimClip = useStore((s) => s.trimClip)
  const splitClip = useStore((s) => s.splitClip)
  const selectClip = useStore((s) => s.selectClip)

  const editorData = useMemo(
    () => deriveEditorData(tracks, clips, selectedClipId),
    [tracks, clips, selectedClipId]
  )

  const handleActionMoveEnd = useCallback(
    (params: { action: TimelineAction; row: TimelineRow; start: number; end: number }) => {
      moveClip(params.action.id, params.start, params.end)
    },
    [moveClip]
  )

  const handleActionResizeEnd = useCallback(
    (params: { action: TimelineAction; row: TimelineRow; start: number; end: number; dir: 'right' | 'left' }) => {
      trimClip(params.action.id, params.start, params.end)
    },
    [trimClip]
  )

  const handleClickAction = useCallback(
    (_e: React.MouseEvent, param: { action: TimelineAction; row: TimelineRow; time: number }) => {
      if (activeTool === 'blade') {
        splitClip(param.action.id, param.time)
      } else {
        selectClip(param.action.id)
      }
    },
    [activeTool, splitClip, selectClip]
  )

  const cursorClass = activeTool === 'blade' ? 'cursor-crosshair' : 'cursor-pointer'

  const getActionRender = useCallback(
    (action: TimelineAction, _row: TimelineRow) => {
      const clip = clips[action.id]
      if (!clip) return null
      return (
        <ClipAction
          clip={clip}
          isSelected={selectedClipId === clip.id}
          cursorClass={cursorClass}
        />
      )
    },
    [clips, selectedClipId, cursorClass]
  )

  return (
    <Timeline
      editorData={editorData}
      effects={effects}
      autoScroll={true}
      dragLine={true}
      onActionMoveEnd={handleActionMoveEnd}
      onActionResizeEnd={handleActionResizeEnd}
      onClickAction={handleClickAction}
      getActionRender={getActionRender}
      style={{ height: '100%', width: '100%', backgroundColor: '#191b1d' }}
    />
  )
}
