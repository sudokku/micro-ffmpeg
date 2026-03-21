// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ClipSettingsPanel } from './ClipSettingsPanel'
import { useStore } from '../store'

beforeEach(() => {
  useStore.setState({
    tracks: { video: { id: 'video', clipIds: ['c1'] }, audio: { id: 'audio', clipIds: [] } },
    clips: {
      c1: {
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
      },
    },
    clipSettings: {},
    ui: { selectedClipId: null, activeTool: 'select', playheadTime: 0, isPlaying: false, pixelsPerSecond: 100, selectedClipIds: [] },
    export: { status: 'idle', progress: 0 },
  })
})

describe('ClipSettingsPanel', () => {
  it('renders hint text when no clip is selected', () => {
    render(<ClipSettingsPanel />)
    expect(screen.getByText('Select a clip to edit its settings')).toBeInTheDocument()
  })

  it('renders filter sliders when clip is selected', () => {
    useStore.setState({ ui: { selectedClipId: 'c1', activeTool: 'select', playheadTime: 0, isPlaying: false, pixelsPerSecond: 100, selectedClipIds: [] } })
    render(<ClipSettingsPanel />)
    expect(screen.getByText('Blur')).toBeInTheDocument()
    expect(screen.getByText('Brightness')).toBeInTheDocument()
    expect(screen.getByText('Contrast')).toBeInTheDocument()
    expect(screen.getByText('Saturation')).toBeInTheDocument()
  })

  it('renders crop section when clip is selected', () => {
    useStore.setState({ ui: { selectedClipId: 'c1', activeTool: 'select', playheadTime: 0, isPlaying: false, pixelsPerSecond: 100, selectedClipIds: [] } })
    render(<ClipSettingsPanel />)
    // Crop section label
    expect(screen.getByText('Crop')).toBeInTheDocument()
    // Crop field labels
    const xLabels = screen.getAllByText('X')
    expect(xLabels.length).toBeGreaterThan(0)
    const yLabels = screen.getAllByText('Y')
    expect(yLabels.length).toBeGreaterThan(0)
  })

  it('renders resize section with lock button when clip is selected', () => {
    useStore.setState({ ui: { selectedClipId: 'c1', activeTool: 'select', playheadTime: 0, isPlaying: false, pixelsPerSecond: 100, selectedClipIds: [] } })
    render(<ClipSettingsPanel />)
    // Resize section label
    expect(screen.getByText('Resize')).toBeInTheDocument()
    // Lock button present (aria-label)
    expect(screen.getByLabelText('Lock aspect ratio')).toBeInTheDocument()
  })

  it('renders PLAYBACK section with speed buttons and volume slider', () => {
    useStore.setState({ ui: { selectedClipId: 'c1', activeTool: 'select', playheadTime: 0, isPlaying: false, pixelsPerSecond: 100, selectedClipIds: [] } })
    render(<ClipSettingsPanel />)
    expect(screen.getByText('Playback')).toBeInTheDocument()
    // Speed buttons
    expect(screen.getByText('1x')).toBeInTheDocument()
    expect(screen.getByText('0.25x')).toBeInTheDocument()
    expect(screen.getByText('4x')).toBeInTheDocument()
    // Volume label
    expect(screen.getByText('Volume')).toBeInTheDocument()
  })

  it('renders TRANSFORM section with rotation, flip, and hue for video clip', () => {
    useStore.setState({ ui: { selectedClipId: 'c1', activeTool: 'select', playheadTime: 0, isPlaying: false, pixelsPerSecond: 100, selectedClipIds: [] } })
    render(<ClipSettingsPanel />)
    expect(screen.getByText('Transform')).toBeInTheDocument()
    // Rotation buttons (0° appears twice: rotation button + hue display)
    expect(screen.getAllByText('0°').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('90°')).toBeInTheDocument()
    expect(screen.getByText('180°')).toBeInTheDocument()
    expect(screen.getByText('270°')).toBeInTheDocument()
    // Flip buttons
    expect(screen.getByText('H')).toBeInTheDocument()
    expect(screen.getByText('V')).toBeInTheDocument()
    // Hue label
    expect(screen.getByText('Hue')).toBeInTheDocument()
  })

  it('hides TRANSFORM, FILTERS, CROP, RESIZE for audio clip', () => {
    useStore.setState({
      clips: {
        c1: {
          id: 'c1',
          trackId: 'audio',
          sourceFile: new File([], 'test.mp3'),
          sourceDuration: 10,
          sourceWidth: 0,
          sourceHeight: 0,
          startTime: 0,
          endTime: 10,
          trimStart: 0,
          trimEnd: 0,
          color: '#22c55e',
          thumbnailUrls: [],
          waveformPeaks: null,
        },
      },
      ui: { selectedClipId: 'c1', activeTool: 'select', playheadTime: 0, isPlaying: false, pixelsPerSecond: 100, selectedClipIds: [] },
    })
    render(<ClipSettingsPanel />)
    // PLAYBACK visible
    expect(screen.getByText('Playback')).toBeInTheDocument()
    expect(screen.getByText('Volume')).toBeInTheDocument()
    // TRANSFORM hidden
    expect(screen.queryByText('Transform')).not.toBeInTheDocument()
    // FILTERS hidden
    expect(screen.queryByText('Filters')).not.toBeInTheDocument()
    // CROP hidden
    expect(screen.queryByText('Crop')).not.toBeInTheDocument()
    // RESIZE hidden
    expect(screen.queryByText('Resize')).not.toBeInTheDocument()
  })

  it('highlights the active speed preset', () => {
    useStore.setState({
      clipSettings: {
        c1: {
          clipId: 'c1', blur: 0, brightness: 0, contrast: 1, saturation: 1,
          crop: null, resize: null, speed: 2, rotation: 0, volume: 1, hue: 0, flipH: false, flipV: false,
        },
      },
      ui: { selectedClipId: 'c1', activeTool: 'select', playheadTime: 0, isPlaying: false, pixelsPerSecond: 100, selectedClipIds: [] },
    })
    render(<ClipSettingsPanel />)
    const activeButton = screen.getByText('2x')
    expect(activeButton.className).toContain('bg-blue-600')
    const inactiveButton = screen.getByText('1x')
    expect(inactiveButton.className).toContain('bg-zinc-800')
  })

  it('displays volume as percentage', () => {
    useStore.setState({
      clipSettings: {
        c1: {
          clipId: 'c1', blur: 0, brightness: 0, contrast: 1, saturation: 1,
          crop: null, resize: null, speed: 1, rotation: 0, volume: 1.5, hue: 0, flipH: false, flipV: false,
        },
      },
      ui: { selectedClipId: 'c1', activeTool: 'select', playheadTime: 0, isPlaying: false, pixelsPerSecond: 100, selectedClipIds: [] },
    })
    render(<ClipSettingsPanel />)
    expect(screen.getByText('150%')).toBeInTheDocument()
  })

  it('uses w-70 width class on both render paths', () => {
    // Empty state
    const { unmount } = render(<ClipSettingsPanel />)
    const emptyDiv = screen.getByText('Select a clip to edit its settings').closest('div')
    expect(emptyDiv?.className).toContain('w-70')
    unmount()

    // Populated state
    useStore.setState({ ui: { selectedClipId: 'c1', activeTool: 'select', playheadTime: 0, isPlaying: false, pixelsPerSecond: 100, selectedClipIds: [] } })
    render(<ClipSettingsPanel />)
    const populatedPanel = screen.getByText('test.mp4').closest('div.flex-none')
    expect(populatedPanel?.className).toContain('w-70')
  })
})
