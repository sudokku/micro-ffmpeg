import { describe, it, expect, beforeEach } from 'vitest'
import { useStore, resetColorIndex } from './index'
import type { Clip } from './types'

const mockClip: Clip = {
  id: 'c1',
  trackId: 'video',
  sourceFile: new File([], 'test.mp4'),
  sourceDuration: 10,
  sourceWidth: 1920,
  sourceHeight: 1080,
  startTime: 0,
  endTime: 10,
  trimStart: 0,
  trimEnd: 0,
  color: '#3b82f6',
  thumbnailUrls: [],
  waveformPeaks: null,
}

beforeEach(() => {
  // Reset store to initial state before each test
  useStore.setState({
    tracks: {
      video: { id: 'video', clipIds: [] },
      audio: { id: 'audio', clipIds: [] },
    },
    clips: {},
    clipSettings: {},
    ui: {
      selectedClipId: null,
      activeTool: 'select',
      playheadTime: 0,
      isPlaying: false,
      pixelsPerSecond: 100,
      selectedClipIds: [],
    },
    export: { status: 'idle', progress: 0 },
  })
  // Clear temporal history
  useStore.temporal.getState().clear()
  // Reset color rotation counter so each test starts from CLIP_COLORS[0]
  resetColorIndex()
})

describe('Zustand store shape', () => {
  it('Test 1: store has tracks property with video and audio keys', () => {
    const state = useStore.getState()
    expect(state).toHaveProperty('tracks')
    expect(state.tracks).toHaveProperty('video')
    expect(state.tracks).toHaveProperty('audio')
  })

  it('Test 2: tracks.video has id: "video" and clipIds: []', () => {
    const { tracks } = useStore.getState()
    expect(tracks.video).toEqual({ id: 'video', clipIds: [] })
  })

  it('Test 3: tracks.audio has id: "audio" and clipIds: []', () => {
    const { tracks } = useStore.getState()
    expect(tracks.audio).toEqual({ id: 'audio', clipIds: [] })
  })

  it('Test 4: clips is an empty object {}', () => {
    const { clips } = useStore.getState()
    expect(clips).toEqual({})
  })

  it('Test 5: clipSettings is an empty object {}', () => {
    const { clipSettings } = useStore.getState()
    expect(clipSettings).toEqual({})
  })

  it('Test 6: ui has all default fields', () => {
    const { ui } = useStore.getState()
    expect(ui).toEqual({
      selectedClipId: null,
      activeTool: 'select',
      playheadTime: 0,
      isPlaying: false,
      pixelsPerSecond: 100,
      selectedClipIds: [],
    })
  })

  it('Test 6a: ui.playheadTime defaults to 0', () => {
    expect(useStore.getState().ui.playheadTime).toBe(0)
  })

  it('Test 6b: ui.isPlaying defaults to false', () => {
    expect(useStore.getState().ui.isPlaying).toBe(false)
  })

  it('Test 6c: ui.pixelsPerSecond defaults to 100', () => {
    expect(useStore.getState().ui.pixelsPerSecond).toBe(100)
  })

  it('Test 6d: ui.selectedClipIds defaults to empty array', () => {
    expect(useStore.getState().ui.selectedClipIds).toEqual([])
  })

  it('Test 7: export has status: "idle" and progress: 0', () => {
    const { export: exportState } = useStore.getState()
    expect(exportState).toEqual({ status: 'idle', progress: 0 })
  })
})

describe('Zundo partialize', () => {
  it('Test 8: ui.selectedClipId is NOT reverted by undo (excluded from history)', () => {
    useStore.setState({ ui: { selectedClipId: 'test-id', activeTool: 'select' } })
    useStore.temporal.getState().undo()
    expect(useStore.getState().ui.selectedClipId).toBe('test-id')
  })

  it('Test 9: clips IS reverted by undo (included in history)', () => {
    useStore.setState({ clips: { c1: mockClip } })
    useStore.temporal.getState().undo()
    expect(useStore.getState().clips).toEqual({})
  })

  it('Test 10: new UiState fields (playheadTime, isPlaying, pixelsPerSecond, selectedClipIds) are NOT reverted by undo', () => {
    useStore.setState({
      ui: {
        ...useStore.getState().ui,
        playheadTime: 5.0,
        isPlaying: true,
        pixelsPerSecond: 200,
        selectedClipIds: ['clip-1', 'clip-2'],
      },
    })
    useStore.temporal.getState().undo()
    const { ui } = useStore.getState()
    expect(ui.playheadTime).toBe(5.0)
    expect(ui.isPlaying).toBe(true)
    expect(ui.pixelsPerSecond).toBe(200)
    expect(ui.selectedClipIds).toEqual(['clip-1', 'clip-2'])
  })
})

describe('Store actions', () => {
  const mockFile = new File([], 'test.mp4')
  const mockDuration = 10

  it('addClip creates a clip in clips record with correct fields', () => {
    useStore.getState().addClip(mockFile, 'video', mockDuration)
    const { clips } = useStore.getState()
    const clipIds = Object.keys(clips)
    expect(clipIds).toHaveLength(1)
    const clip = clips[clipIds[0]]
    expect(clip.trackId).toBe('video')
    expect(clip.startTime).toBe(0)
    expect(clip.endTime).toBe(mockDuration)
    expect(clip.color).toBe('#3b82f6')
    expect(clip.thumbnailUrls).toEqual([])
  })

  it('addClip appends clip id to tracks.video.clipIds', () => {
    useStore.getState().addClip(mockFile, 'video', mockDuration)
    const { clips, tracks } = useStore.getState()
    const clipId = Object.keys(clips)[0]
    expect(tracks.video.clipIds).toContain(clipId)
  })

  it('addClip appends clip id to tracks.audio.clipIds', () => {
    useStore.getState().addClip(mockFile, 'audio', mockDuration)
    const { clips, tracks } = useStore.getState()
    const clipId = Object.keys(clips)[0]
    expect(tracks.audio.clipIds).toContain(clipId)
  })

  it('second addClip on same track starts where first clip ends', () => {
    useStore.getState().addClip(mockFile, 'video', 5)
    useStore.getState().addClip(mockFile, 'video', 8)
    const { clips, tracks } = useStore.getState()
    const [firstId, secondId] = tracks.video.clipIds
    expect(clips[firstId].startTime).toBe(0)
    expect(clips[firstId].endTime).toBe(5)
    expect(clips[secondId].startTime).toBe(5)
    expect(clips[secondId].endTime).toBe(13)
  })

  it('addClip creates a clip with waveformPeaks: null', () => {
    useStore.getState().addClip(mockFile, 'video', mockDuration)
    const { clips } = useStore.getState()
    const clipId = Object.keys(clips)[0]
    expect(clips[clipId].waveformPeaks).toBeNull()
  })

  it('addClip assigns rotating colors — clip 1 gets CLIP_COLORS[0], clip 2 gets CLIP_COLORS[1]', () => {
    useStore.getState().addClip(mockFile, 'video', 5)
    useStore.getState().addClip(mockFile, 'video', 5)
    const { clips, tracks } = useStore.getState()
    const [firstId, secondId] = tracks.video.clipIds
    expect(clips[firstId].color).toBe('#3b82f6')
    expect(clips[secondId].color).toBe('#8b5cf6')
  })

  it('moveClip updates clip.startTime and clip.endTime', () => {
    useStore.getState().addClip(mockFile, 'video', 10)
    const clipId = Object.keys(useStore.getState().clips)[0]
    useStore.getState().moveClip(clipId, 5, 15)
    const clip = useStore.getState().clips[clipId]
    expect(clip.startTime).toBe(5)
    expect(clip.endTime).toBe(15)
  })

  it('trimClip updates clip.startTime and clip.endTime', () => {
    useStore.getState().addClip(mockFile, 'video', 10)
    const clipId = Object.keys(useStore.getState().clips)[0]
    useStore.getState().trimClip(clipId, 2, 8)
    const clip = useStore.getState().clips[clipId]
    expect(clip.startTime).toBe(2)
    expect(clip.endTime).toBe(8)
  })

  it('splitClip creates two clips: left and right covering the original range', () => {
    useStore.getState().addClip(mockFile, 'video', 10)
    const originalId = Object.keys(useStore.getState().clips)[0]
    useStore.getState().splitClip(originalId, 4)
    const { clips, tracks } = useStore.getState()
    expect(tracks.video.clipIds).toHaveLength(2)
    const [leftId, rightId] = tracks.video.clipIds
    expect(clips[leftId].startTime).toBe(0)
    expect(clips[leftId].endTime).toBe(4)
    expect(clips[rightId].startTime).toBe(4)
    expect(clips[rightId].endTime).toBe(10)
  })

  it('splitClip removes original clip from clips record and track clipIds', () => {
    useStore.getState().addClip(mockFile, 'video', 10)
    const originalId = Object.keys(useStore.getState().clips)[0]
    useStore.getState().splitClip(originalId, 4)
    const { clips } = useStore.getState()
    expect(clips[originalId]).toBeUndefined()
  })

  it('splitClip at edge (splitTime <= startTime) is a no-op', () => {
    useStore.getState().addClip(mockFile, 'video', 10)
    const originalId = Object.keys(useStore.getState().clips)[0]
    useStore.getState().splitClip(originalId, 0)
    const { clips, tracks } = useStore.getState()
    expect(tracks.video.clipIds).toHaveLength(1)
    expect(clips[originalId]).toBeDefined()
  })

  it('splitClip at edge (splitTime >= endTime) is a no-op', () => {
    useStore.getState().addClip(mockFile, 'video', 10)
    const originalId = Object.keys(useStore.getState().clips)[0]
    useStore.getState().splitClip(originalId, 10)
    const { clips, tracks } = useStore.getState()
    expect(tracks.video.clipIds).toHaveLength(1)
    expect(clips[originalId]).toBeDefined()
  })

  it('deleteClip removes clip from clips record and from track.clipIds', () => {
    useStore.getState().addClip(mockFile, 'video', 10)
    const clipId = Object.keys(useStore.getState().clips)[0]
    useStore.getState().deleteClip(clipId)
    const { clips, tracks } = useStore.getState()
    expect(clips[clipId]).toBeUndefined()
    expect(tracks.video.clipIds).not.toContain(clipId)
  })

  it('selectClip sets ui.selectedClipId to id', () => {
    useStore.getState().addClip(mockFile, 'video', 10)
    const clipId = Object.keys(useStore.getState().clips)[0]
    useStore.getState().selectClip(clipId)
    expect(useStore.getState().ui.selectedClipId).toBe(clipId)
  })

  it('selectClip(null) clears ui.selectedClipId', () => {
    useStore.getState().addClip(mockFile, 'video', 10)
    const clipId = Object.keys(useStore.getState().clips)[0]
    useStore.getState().selectClip(clipId)
    useStore.getState().selectClip(null)
    expect(useStore.getState().ui.selectedClipId).toBeNull()
  })

  it('setActiveTool sets ui.activeTool to "blade"', () => {
    useStore.getState().setActiveTool('blade')
    expect(useStore.getState().ui.activeTool).toBe('blade')
  })

  it('undo after addClip removes the clip and its track reference', () => {
    useStore.getState().addClip(mockFile, 'video', 10)
    const clipId = Object.keys(useStore.getState().clips)[0]
    useStore.temporal.getState().undo()
    const { clips, tracks } = useStore.getState()
    expect(clips[clipId]).toBeUndefined()
    expect(tracks.video.clipIds).not.toContain(clipId)
  })

  it('redo after undo restores the clip', () => {
    useStore.getState().addClip(mockFile, 'video', 10)
    const clipId = Object.keys(useStore.getState().clips)[0]
    useStore.temporal.getState().undo()
    useStore.temporal.getState().redo()
    const { clips, tracks } = useStore.getState()
    expect(clips[clipId]).toBeDefined()
    expect(tracks.video.clipIds).toContain(clipId)
  })

  it('undo after splitClip restores the original single clip', () => {
    useStore.getState().addClip(mockFile, 'video', 10)
    const originalId = Object.keys(useStore.getState().clips)[0]
    useStore.getState().splitClip(originalId, 4)
    useStore.temporal.getState().undo()
    const { clips, tracks } = useStore.getState()
    expect(tracks.video.clipIds).toHaveLength(1)
    expect(clips[originalId]).toBeDefined()
  })

  it('selectClip is NOT reverted by undo (ui slice excluded)', () => {
    useStore.getState().addClip(mockFile, 'video', 10)
    const clipId = Object.keys(useStore.getState().clips)[0]
    useStore.getState().selectClip(clipId)
    useStore.temporal.getState().undo()
    expect(useStore.getState().ui.selectedClipId).toBe(clipId)
  })

  it('setActiveTool is NOT reverted by undo (ui slice excluded)', () => {
    useStore.getState().setActiveTool('blade')
    useStore.temporal.getState().undo()
    expect(useStore.getState().ui.activeTool).toBe('blade')
  })

  it('deleteClip restores clip with single undo (no double-undo required)', () => {
    useStore.getState().addClip(mockFile, 'video', 10)
    const clipId = Object.keys(useStore.getState().clips)[0]
    useStore.getState().deleteClip(clipId)
    expect(useStore.getState().clips[clipId]).toBeUndefined()
    // Single undo should restore the clip
    useStore.temporal.getState().undo()
    expect(useStore.getState().clips[clipId]).toBeDefined()
    expect(useStore.getState().tracks.video.clipIds).toContain(clipId)
  })
})

describe('ClipSettings actions', () => {
  const mockFile = new File([], 'test.mp4')

  it('updateClipSettings stores blur in clipSettings[clipId]', () => {
    useStore.getState().addClip(mockFile, 'video', 10)
    const clipId = Object.keys(useStore.getState().clips)[0]
    useStore.getState().updateClipSettings(clipId, { blur: 5 })
    const settings = useStore.getState().clipSettings[clipId]
    expect(settings).toBeDefined()
    expect(settings.clipId).toBe(clipId)
    expect(settings.blur).toBe(5)
  })

  it('updateClipSettings stores brightness in clipSettings[clipId]', () => {
    useStore.getState().addClip(mockFile, 'video', 10)
    const clipId = Object.keys(useStore.getState().clips)[0]
    useStore.getState().updateClipSettings(clipId, { brightness: 0.5 })
    expect(useStore.getState().clipSettings[clipId].brightness).toBe(0.5)
  })

  it('updateClipSettings stores contrast in clipSettings[clipId]', () => {
    useStore.getState().addClip(mockFile, 'video', 10)
    const clipId = Object.keys(useStore.getState().clips)[0]
    useStore.getState().updateClipSettings(clipId, { contrast: 1.5 })
    expect(useStore.getState().clipSettings[clipId].contrast).toBe(1.5)
  })

  it('updateClipSettings stores saturation in clipSettings[clipId]', () => {
    useStore.getState().addClip(mockFile, 'video', 10)
    const clipId = Object.keys(useStore.getState().clips)[0]
    useStore.getState().updateClipSettings(clipId, { saturation: 2.0 })
    expect(useStore.getState().clipSettings[clipId].saturation).toBe(2.0)
  })

  it('updateClipSettings stores crop object in clipSettings[clipId]', () => {
    useStore.getState().addClip(mockFile, 'video', 10)
    const clipId = Object.keys(useStore.getState().clips)[0]
    const crop = { x: 10, y: 20, width: 640, height: 480 }
    useStore.getState().updateClipSettings(clipId, { crop })
    expect(useStore.getState().clipSettings[clipId].crop).toEqual(crop)
  })

  it('updateClipSettings stores resize object in clipSettings[clipId]', () => {
    useStore.getState().addClip(mockFile, 'video', 10)
    const clipId = Object.keys(useStore.getState().clips)[0]
    const resize = { width: 1280, height: 720 }
    useStore.getState().updateClipSettings(clipId, { resize })
    expect(useStore.getState().clipSettings[clipId].resize).toEqual(resize)
  })

  it('updateClipSettings stores speed in clipSettings[clipId]', () => {
    useStore.getState().addClip(mockFile, 'video', 10)
    const clipId = Object.keys(useStore.getState().clips)[0]
    useStore.getState().updateClipSettings(clipId, { speed: 2 })
    expect(useStore.getState().clipSettings[clipId].speed).toBe(2)
  })

  it('updateClipSettings stores rotation in clipSettings[clipId]', () => {
    useStore.getState().addClip(mockFile, 'video', 10)
    const clipId = Object.keys(useStore.getState().clips)[0]
    useStore.getState().updateClipSettings(clipId, { rotation: 90 })
    expect(useStore.getState().clipSettings[clipId].rotation).toBe(90)
  })

  it('updateClipSettings stores volume in clipSettings[clipId]', () => {
    useStore.getState().addClip(mockFile, 'video', 10)
    const clipId = Object.keys(useStore.getState().clips)[0]
    useStore.getState().updateClipSettings(clipId, { volume: 1.5 })
    expect(useStore.getState().clipSettings[clipId].volume).toBe(1.5)
  })

  it('updateClipSettings stores hue in clipSettings[clipId]', () => {
    useStore.getState().addClip(mockFile, 'video', 10)
    const clipId = Object.keys(useStore.getState().clips)[0]
    useStore.getState().updateClipSettings(clipId, { hue: 90 })
    expect(useStore.getState().clipSettings[clipId].hue).toBe(90)
  })

  it('updateClipSettings stores flipH in clipSettings[clipId]', () => {
    useStore.getState().addClip(mockFile, 'video', 10)
    const clipId = Object.keys(useStore.getState().clips)[0]
    useStore.getState().updateClipSettings(clipId, { flipH: true })
    expect(useStore.getState().clipSettings[clipId].flipH).toBe(true)
  })

  it('updateClipSettings stores flipV in clipSettings[clipId]', () => {
    useStore.getState().addClip(mockFile, 'video', 10)
    const clipId = Object.keys(useStore.getState().clips)[0]
    useStore.getState().updateClipSettings(clipId, { flipV: true })
    expect(useStore.getState().clipSettings[clipId].flipV).toBe(true)
  })

  it('updateClipSettings merges partial updates — both fields present after two calls', () => {
    useStore.getState().addClip(mockFile, 'video', 10)
    const clipId = Object.keys(useStore.getState().clips)[0]
    useStore.getState().updateClipSettings(clipId, { blur: 5 })
    useStore.getState().updateClipSettings(clipId, { contrast: 1.5 })
    const settings = useStore.getState().clipSettings[clipId]
    expect(settings.blur).toBe(5)
    expect(settings.contrast).toBe(1.5)
  })

  it('undo after updateClipSettings reverts clipSettings to empty {}', () => {
    useStore.getState().addClip(mockFile, 'video', 10)
    const clipId = Object.keys(useStore.getState().clips)[0]
    // Clear history created by addClip so we have a clean undo baseline
    useStore.temporal.getState().clear()
    useStore.getState().updateClipSettings(clipId, { blur: 5 })
    expect(useStore.getState().clipSettings[clipId].blur).toBe(5)
    useStore.temporal.getState().undo()
    expect(useStore.getState().clipSettings[clipId]).toBeUndefined()
  })

  it('redo after undo restores the clipSettings change', () => {
    useStore.getState().addClip(mockFile, 'video', 10)
    const clipId = Object.keys(useStore.getState().clips)[0]
    useStore.temporal.getState().clear()
    useStore.getState().updateClipSettings(clipId, { blur: 5 })
    useStore.temporal.getState().undo()
    useStore.temporal.getState().redo()
    expect(useStore.getState().clipSettings[clipId].blur).toBe(5)
  })

  it('updateClipSettings for non-existent clipId creates a new entry', () => {
    useStore.getState().updateClipSettings('ghost-id', { blur: 3 })
    const settings = useStore.getState().clipSettings['ghost-id']
    expect(settings).toBeDefined()
    expect(settings.clipId).toBe('ghost-id')
    expect(settings.blur).toBe(3)
  })

  it('Clip type includes sourceWidth and sourceHeight (mockClip shape)', () => {
    expect(mockClip.sourceWidth).toBe(1920)
    expect(mockClip.sourceHeight).toBe(1080)
  })
})

describe('export actions', () => {
  it('setExportStatus sets export.status to "rendering"', () => {
    useStore.getState().setExportStatus('rendering')
    expect(useStore.getState().export.status).toBe('rendering')
  })

  it('setExportStatus sets export.status to "done"', () => {
    useStore.getState().setExportStatus('done')
    expect(useStore.getState().export.status).toBe('done')
  })

  it('setExportStatus sets export.status to "error"', () => {
    useStore.getState().setExportStatus('error')
    expect(useStore.getState().export.status).toBe('error')
  })

  it('setExportProgress sets export.progress to given value', () => {
    useStore.getState().setExportProgress(50)
    expect(useStore.getState().export.progress).toBe(50)
  })

  it('setExportStatus is NOT reverted by undo (export excluded from partialize)', () => {
    useStore.getState().setExportStatus('rendering')
    useStore.temporal.getState().undo()
    // undo should not revert export state — it's excluded from tracked history
    expect(useStore.getState().export.status).toBe('rendering')
  })

  it('setExportProgress is NOT reverted by undo (export excluded from partialize)', () => {
    useStore.getState().setExportProgress(75)
    useStore.temporal.getState().undo()
    // undo should not revert export progress — it's excluded from tracked history
    expect(useStore.getState().export.progress).toBe(75)
  })
})
