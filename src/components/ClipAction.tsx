import type { Clip } from '../store/types'

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

interface ClipActionProps {
  clip: Clip
  isSelected: boolean
  cursorClass: string
}

export function ClipAction({ clip, isSelected, cursorClass }: ClipActionProps) {
  const thumbnail = clip.thumbnailUrls[0] ?? null
  const isVideoClip = clip.trackId === 'video'

  return (
    <div
      className={`relative h-full w-full overflow-hidden flex items-center ${cursorClass} ${
        isSelected ? 'outline outline-2 outline-offset-[-2px] outline-white' : ''
      }`}
      style={{ backgroundColor: clip.color + 'D9' }}
    >
      {/* Thumbnail (video only) */}
      {isVideoClip && (
        <div className="h-full w-10 flex-shrink-0 overflow-hidden">
          {thumbnail ? (
            <img
              src={thumbnail}
              className="h-full w-full object-cover"
              draggable={false}
              alt=""
            />
          ) : (
            /* shimmer while extracting */
            <div
              className="h-full w-full animate-pulse"
              style={{ backgroundColor: clip.color + '80' }}
            />
          )}
        </div>
      )}

      {/* Label + duration */}
      <div className="flex-1 min-w-0 px-1.5 select-none">
        <div className="truncate text-xs font-semibold text-white/90 leading-tight">
          {clip.sourceFile.name}
        </div>
        <div className="text-xs text-white/60 leading-tight tabular-nums">
          {formatDuration(clip.sourceDuration)}
        </div>
      </div>
    </div>
  )
}
