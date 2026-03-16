import { describe, it, expect, beforeEach } from 'vitest'
import { useStore } from './index'
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
  thumbnailUrl: null,
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
