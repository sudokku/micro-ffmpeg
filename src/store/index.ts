import { create } from 'zustand'
import { temporal } from 'zundo'
import type { StoreState, TrackedState } from './types'
import { CLIP_COLORS } from '../constants/clipColors'

let colorIndex = 0

/** Reset the color rotation counter — use only in tests via beforeEach. */
export function resetColorIndex() {
  colorIndex = 0
}

export const useStore = create<StoreState>()(
  temporal(
    (set, get) => ({
      tracks: {
        video: { id: 'video', clipIds: [] },
        audio: { id: 'audio', clipIds: [] },
      },
      clips: {},
      clipSettings: {},
      ui: { selectedClipId: null, activeTool: 'select' },
      export: { status: 'idle', progress: 0 },

      addClip: (file, trackId, duration, sourceWidth = 0, sourceHeight = 0) => {
        set((state) => {
          const id = crypto.randomUUID()
          const track = state.tracks[trackId]
          const lastClipId = track.clipIds[track.clipIds.length - 1]
          const startTime = lastClipId ? state.clips[lastClipId].endTime : 0
          const endTime = startTime + duration
          const color = CLIP_COLORS[colorIndex % CLIP_COLORS.length]
          colorIndex++
          const clip = {
            id,
            trackId,
            sourceFile: file,
            sourceDuration: duration,
            sourceWidth,
            sourceHeight,
            startTime,
            endTime,
            trimStart: 0,
            trimEnd: duration,
            color,
            thumbnailUrls: [],
          }
          return {
            clips: { ...state.clips, [id]: clip },
            tracks: {
              ...state.tracks,
              [trackId]: {
                ...track,
                clipIds: [...track.clipIds, id],
              },
            },
          }
        })
      },

      moveClip: (clipId, newStart, newEnd) => {
        set((state) => ({
          clips: {
            ...state.clips,
            [clipId]: { ...state.clips[clipId], startTime: newStart, endTime: newEnd },
          },
        }))
      },

      trimClip: (clipId, newStart, newEnd) => {
        set((state) => ({
          clips: {
            ...state.clips,
            [clipId]: { ...state.clips[clipId], startTime: newStart, endTime: newEnd },
          },
        }))
      },

      splitClip: (clipId, splitTime) => {
        set((state) => {
          const clip = state.clips[clipId]
          if (!clip) return state
          if (splitTime <= clip.startTime + 0.01 || splitTime >= clip.endTime - 0.01) {
            return state
          }
          const leftId = crypto.randomUUID()
          const rightId = crypto.randomUUID()
          const leftClip = { ...clip, id: leftId, endTime: splitTime }
          const rightClip = { ...clip, id: rightId, startTime: splitTime }
          // Remove original, add left and right
          const { [clipId]: _removed, ...remainingClips } = state.clips
          const newClips = { ...remainingClips, [leftId]: leftClip, [rightId]: rightClip }
          // Replace original id in track with [leftId, rightId]
          const track = state.tracks[clip.trackId]
          const origIdx = track.clipIds.indexOf(clipId)
          const newClipIds = [
            ...track.clipIds.slice(0, origIdx),
            leftId,
            rightId,
            ...track.clipIds.slice(origIdx + 1),
          ]
          return {
            clips: newClips,
            tracks: {
              ...state.tracks,
              [clip.trackId]: { ...track, clipIds: newClipIds },
            },
          }
        })
      },

      deleteClip: (clipId) => {
        set((state) => {
          const clip = state.clips[clipId]
          if (!clip) return state
          const { [clipId]: _removed, ...remainingClips } = state.clips
          const track = state.tracks[clip.trackId]
          return {
            clips: remainingClips,
            tracks: {
              ...state.tracks,
              [clip.trackId]: {
                ...track,
                clipIds: track.clipIds.filter((id) => id !== clipId),
              },
            },
            // Deselect in the same set() call to avoid a separate Zundo history entry
            ui: { ...state.ui, selectedClipId: null },
          }
        })
      },

      selectClip: (clipId) => {
        const state = get()
        set({ ui: { ...state.ui, selectedClipId: clipId } })
      },

      setActiveTool: (tool) => {
        const state = get()
        set({ ui: { ...state.ui, activeTool: tool } })
      },

      updateClipSettings: (clipId, patch) => {
        set((state) => {
          const existing = state.clipSettings[clipId] ?? { clipId }
          return {
            clipSettings: {
              ...state.clipSettings,
              [clipId]: { ...existing, ...patch },
            },
          }
        })
      },

      setExportStatus: (status) => {
        set((state) => ({ export: { ...state.export, status } }))
      },

      setExportProgress: (progress) => {
        set((state) => ({ export: { ...state.export, progress } }))
      },
    }),
    {
      partialize: (state): TrackedState => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { ui, export: _export, addClip, moveClip, trimClip, splitClip, deleteClip, selectClip, setActiveTool, updateClipSettings, setExportStatus, setExportProgress, ...tracked } = state
        return tracked
      },
    },
  ),
)
