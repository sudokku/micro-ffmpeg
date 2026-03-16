export interface Clip {
  id: string
  trackId: 'video' | 'audio'
  sourceFile: File
  sourceDuration: number
  startTime: number
  endTime: number
  trimStart: number
  trimEnd: number
  thumbnailUrl: string | null
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

export interface StoreState {
  tracks: { video: Track; audio: Track }
  clips: Record<string, Clip>
  clipSettings: Record<string, ClipSettings>
  ui: UiState
  export: ExportState
}

export type TrackedState = Omit<StoreState, 'ui' | 'export'>
