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
})
