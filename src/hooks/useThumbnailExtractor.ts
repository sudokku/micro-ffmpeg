import { useEffect, useRef } from 'react'
import { fetchFile } from '@ffmpeg/util'
import { useStore } from '../store'
import { getFFmpeg, enqueueFFmpegJob } from '../utils/ffmpegSingleton'

export function useThumbnailExtractor() {
  const processedRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    const unsubscribe = useStore.subscribe((state) => {
      const newClipIds = state.tracks.video.clipIds.filter(
        (id) =>
          state.clips[id] &&
          state.clips[id].trackId === 'video' &&
          state.clips[id].thumbnailUrls.length === 0 &&
          !processedRef.current.has(id)
      )

      for (const clipId of newClipIds) {
        const clip = state.clips[clipId]
        if (!clip) continue

        processedRef.current.add(clipId)

        ;(async () => {
          try {
            // fetchFile is pure JS — start buffering before entering the queue
            const fileDataPromise = fetchFile(clip.sourceFile)

            await enqueueFFmpegJob(async () => {
              const ff = await getFFmpeg()

              const ext = clip.sourceFile.name.split('.').pop()?.toLowerCase() || 'mp4'
              const inputName = `input_${clipId}.${ext}`
              const thumbName = `thumb_${clipId}.jpg`

              const fileData = await fileDataPromise
              await ff.writeFile(inputName, fileData)

              // -ss 0 before -i: input seeking, no frames decoded before target.
              // -frames:v 1: stop after one frame.
              // scale=160:-2: 160px wide thumbnail, aspect-correct, divisible-by-2 height.
              // -q:v 3: good JPEG quality without wasting WASM heap on large output.
              await ff.exec(['-ss', '0', '-i', inputName, '-frames:v', '1', '-vf', 'scale=160:-2', '-q:v', '3', thumbName])

              const data = await ff.readFile(thumbName) as Uint8Array<ArrayBuffer>
              await ff.deleteFile(thumbName)
              await ff.deleteFile(inputName)

              const url = URL.createObjectURL(new Blob([data], { type: 'image/jpeg' }))

              useStore.setState((prev) => {
                const existing = prev.clips[clipId]
                if (!existing) return prev
                return {
                  clips: { ...prev.clips, [clipId]: { ...existing, thumbnailUrls: [url] } },
                }
              })
            })
          } catch (err) {
            console.error(`Thumbnail extraction failed for clip ${clipId}:`, err)
          }
        })()
      }
    })

    return unsubscribe
  }, [])
}
