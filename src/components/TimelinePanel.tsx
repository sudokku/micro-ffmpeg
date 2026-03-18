import { useMemo, useCallback, useRef } from 'react'
import { Timeline } from '@xzdarcy/react-timeline-editor'
import type { TimelineRow, TimelineAction, TimelineEffect } from '@xzdarcy/timeline-engine'
import type { TimelineState } from '@xzdarcy/react-timeline-editor'
import '@xzdarcy/react-timeline-editor/dist/react-timeline-editor.css'
import { useStore } from '../store'
import { deriveEditorData } from '../utils/deriveEditorData'
import { ClipAction } from './ClipAction'

const effects: Record<string, TimelineEffect> = { default: { id: 'default' } }

const START_LEFT = 20
const ZOOM_FACTOR = 1.25
const MIN_PPS = 50
const MAX_PPS = 400
const DEFAULT_PPS = 100
const BUTTON_CLASS = 'text-sm font-medium px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-white transition-colors'

export function TimelinePanel() {
  const tracks = useStore((s) => s.tracks)
  const clips = useStore((s) => s.clips)
  const selectedClipId = useStore((s) => s.ui.selectedClipId)
  const activeTool = useStore((s) => s.ui.activeTool)
  const pixelsPerSecond = useStore((s) => s.ui.pixelsPerSecond)
  const moveClip = useStore((s) => s.moveClip)
  const trimClip = useStore((s) => s.trimClip)
  const splitClip = useStore((s) => s.splitClip)
  const selectClip = useStore((s) => s.selectClip)
  const setPixelsPerSecond = useStore((s) => s.setPixelsPerSecond)

  const containerRef = useRef<HTMLDivElement>(null)
  const timelineRef = useRef<TimelineState>(null)
  const scrollLeftRef = useRef(0)

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

  const handleZoomIn = useCallback(() => {
    setPixelsPerSecond(pixelsPerSecond * ZOOM_FACTOR)
  }, [pixelsPerSecond, setPixelsPerSecond])

  const handleZoomOut = useCallback(() => {
    setPixelsPerSecond(pixelsPerSecond / ZOOM_FACTOR)
  }, [pixelsPerSecond, setPixelsPerSecond])

  const handleFit = useCallback(() => {
    const container = containerRef.current
    if (!container) return
    const containerWidth = container.offsetWidth
    if (containerWidth <= 0) return

    const allClips = Object.values(clips)
    const totalDuration = allClips.length > 0
      ? Math.max(...allClips.map(c => c.endTime))
      : 0

    if (totalDuration <= 0) {
      setPixelsPerSecond(DEFAULT_PPS)
      return
    }

    setPixelsPerSecond((containerWidth * 0.9) / totalDuration)
  }, [clips, setPixelsPerSecond])

  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    if (!e.metaKey && !e.ctrlKey) return
    e.preventDefault()

    const container = containerRef.current
    const tlRef = timelineRef.current
    if (!container || !tlRef) return

    const rect = container.getBoundingClientRect()
    const cursorX = e.clientX - rect.left
    const currentScrollLeft = scrollLeftRef.current
    const oldPps = pixelsPerSecond

    // Time under cursor BEFORE zoom
    const cursorTime = (cursorX + currentScrollLeft - START_LEFT) / oldPps

    // Apply zoom — deltaY < 0 = scroll up = zoom in
    const factor = e.deltaY < 0 ? ZOOM_FACTOR : 1 / ZOOM_FACTOR
    const newPps = Math.min(MAX_PPS, Math.max(MIN_PPS, oldPps * factor))
    setPixelsPerSecond(newPps)

    // Reposition scroll so cursorTime stays under cursorX
    const newScrollLeft = cursorTime * newPps + START_LEFT - cursorX
    tlRef.setScrollLeft(Math.max(0, newScrollLeft))
  }, [pixelsPerSecond, setPixelsPerSecond])

  return (
    <div ref={containerRef} onWheel={handleWheel} className="flex flex-col h-full">
      <div className="flex items-center justify-end gap-1 px-2 py-1 border-b border-zinc-800 flex-none">
        <button onClick={handleZoomOut} className={BUTTON_CLASS} title="Zoom out">−</button>
        <button onClick={handleZoomIn} className={BUTTON_CLASS} title="Zoom in">+</button>
        <button onClick={handleFit} className={BUTTON_CLASS} title="Fit to screen">↔</button>
      </div>
      <div className="flex-1 min-h-0">
        <Timeline
          ref={timelineRef}
          editorData={editorData}
          effects={effects}
          autoScroll={true}
          dragLine={true}
          scale={1}
          scaleWidth={pixelsPerSecond}
          onScroll={({ scrollLeft }) => { scrollLeftRef.current = scrollLeft }}
          onActionMoveEnd={handleActionMoveEnd}
          onActionResizeEnd={handleActionResizeEnd}
          onClickAction={handleClickAction}
          getActionRender={getActionRender}
          style={{ height: '100%', width: '100%', backgroundColor: '#191b1d' }}
        />
      </div>
    </div>
  )
}
