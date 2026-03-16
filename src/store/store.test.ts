import { describe, it, expect, beforeEach } from 'vitest'
import { useStore, resetColorIndex } from './index'
import type { Clip } from './types'

const mockClip: Clip = {
  id: 'c1',
  trackId: 'video',
  sourceFile: new File([], 'test.mp4'),
  sourceDuration: 10,
  startTime: 0,
  endTime: 10,
  trimStart: 0,
  trimEnd: 0,
  color: '#3b82f6',
  thumbnailUrls: [],
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
    ui: { selectedClipId: null, activeTool: 'select' },
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

  it('Test 6: ui has selectedClipId: null and activeTool: "select"', () => {
    const { ui } = useStore.getState()
    expect(ui).toEqual({ selectedClipId: null, activeTool: 'select' })
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
})
