export interface Clip {
  id: string
  trackId: 'video' | 'audio'
  sourceFile: File
  sourceDuration: number
  sourceWidth: number
  sourceHeight: number
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

export interface ClipSettings {
  clipId: string
  blur: number           // 0-10 integer; maps to ffmpeg boxblur luma_radius
  brightness: number     // -1.0 to 1.0 float; maps to ffmpeg eq:brightness
  contrast: number       // 0.0 to 2.0 float; maps to ffmpeg eq:contrast (default 1.0)
  saturation: number     // 0.0 to 3.0 float; maps to ffmpeg eq:saturation (default 1.0)
  crop: { x: number; y: number; width: number; height: number } | null
  resize: { width: number; height: number } | null
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
  addClip: (file: File, trackId: 'video' | 'audio', duration: number, sourceWidth?: number, sourceHeight?: number) => void
  moveClip: (clipId: string, newStart: number, newEnd: number) => void
  trimClip: (clipId: string, newStart: number, newEnd: number) => void
  splitClip: (clipId: string, splitTime: number) => void
  deleteClip: (clipId: string) => void
  selectClip: (clipId: string | null) => void
  setActiveTool: (tool: 'select' | 'blade') => void
  updateClipSettings: (clipId: string, patch: Partial<Omit<ClipSettings, 'clipId'>>) => void
}

export interface StoreState extends StoreActions {
  tracks: { video: Track; audio: Track }
  clips: Record<string, Clip>
  clipSettings: Record<string, ClipSettings>
  ui: UiState
  export: ExportState
}

export type TrackedState = Omit<StoreState, 'ui' | 'export' | keyof StoreActions>
