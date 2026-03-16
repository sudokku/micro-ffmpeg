import { TopBar } from './TopBar'
import { TimelinePanel } from './TimelinePanel'

export function AppShell() {
  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-white">
      <TopBar />
      <main className="flex-1 flex items-center justify-center text-zinc-600 text-sm">
        Clip settings — Phase 3
      </main>
      <div className="flex-none border-t border-zinc-800" style={{ height: '37vh' }}>
        <TimelinePanel />
      </div>
    </div>
  )
}
