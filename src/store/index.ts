import { create } from 'zustand'
import { temporal } from 'zundo'
import type { StoreState, TrackedState } from './types'

export const useStore = create<StoreState>()(
  temporal(
    (_set) => ({
      tracks: {
        video: { id: 'video', clipIds: [] },
        audio: { id: 'audio', clipIds: [] },
      },
      clips: {},
      clipSettings: {},
      ui: { selectedClipId: null, activeTool: 'select' },
      export: { status: 'idle', progress: 0 },
    }),
    {
      partialize: (state): TrackedState => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { ui, export: _export, ...tracked } = state
        return tracked
      },
    },
  ),
)
