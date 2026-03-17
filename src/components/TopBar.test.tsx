import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TopBar } from './TopBar'
import { useStore } from '../store'

beforeEach(() => {
  useStore.setState({ export: { status: 'idle', progress: 0 } })
})

describe('TopBar export controls', () => {
  it('shows Export button when status is idle', () => {
    render(<TopBar />)
    expect(screen.getByText('Export')).toBeInTheDocument()
  })

  it('shows Cancel button when status is rendering', () => {
    useStore.setState({ export: { status: 'rendering', progress: 50 } })
    render(<TopBar />)
    expect(screen.getByText('Cancel')).toBeInTheDocument()
  })

  it('shows Download button when status is done', () => {
    useStore.setState({ export: { status: 'done', progress: 100 } })
    render(<TopBar />)
    expect(screen.getByText('Download')).toBeInTheDocument()
  })

  it('shows Export button when status is error', () => {
    useStore.setState({ export: { status: 'error', progress: 30 } })
    render(<TopBar />)
    expect(screen.getByText('Export')).toBeInTheDocument()
  })

  it('renders format dropdown with 4 options', () => {
    render(<TopBar />)
    const select = screen.getByRole('combobox')
    expect(select).toBeInTheDocument()
    expect(select.children.length).toBe(4)
  })
})
