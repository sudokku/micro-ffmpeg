export interface Clip {
  id: string
  trackId: 'video' | 'audio'
  sourceFile: File
  sourceDuration: number
  startTime: number
  endTime: number
  trimStart: number
  trimEnd: number
  color: string
  thumbnailUrls: string[]
}

export interface Track {
  id: 'video' | 'audio'
  clipIds: string[]
}

// Stub — fields populated in Phase 3
export interface ClipSettings {
  clipId: string
}

export interface UiState {
  selectedClipId: string | null
  activeTool: 'select' | 'blade'
}

export interface ExportState {
  status: 'idle' | 'rendering' | 'done' | 'error'
  progress: number
}

export interface StoreActions {
  addClip: (file: File, trackId: 'video' | 'audio', duration: number) => void
  moveClip: (clipId: string, newStart: number, newEnd: number) => void
  trimClip: (clipId: string, newStart: number, newEnd: number) => void
  splitClip: (clipId: string, splitTime: number) => void
  deleteClip: (clipId: string) => void
  selectClip: (clipId: string | null) => void
  setActiveTool: (tool: 'select' | 'blade') => void
}

export interface StoreState extends StoreActions {
  tracks: { video: Track; audio: Track }
  clips: Record<string, Clip>
  clipSettings: Record<string, ClipSettings>
  ui: UiState
  export: ExportState
}

export type TrackedState = Omit<StoreState, 'ui' | 'export' | keyof StoreActions>
