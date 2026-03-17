import { useEffect, useRef } from 'react'
import { FFmpeg } from '@ffmpeg/ffmpeg'
import { toBlobURL, fetchFile } from '@ffmpeg/util'
import { useStore } from '../store'

let ffmpegInstance: FFmpeg | null = null
let ffmpegLoadPromise: Promise<FFmpeg> | null = null

async function getFFmpeg(): Promise<FFmpeg> {
  if (ffmpegInstance) return ffmpegInstance
  if (ffmpegLoadPromise) return ffmpegLoadPromise

  ffmpegLoadPromise = (async () => {
    const ff = new FFmpeg()
    const base = window.location.origin
    await ff.load({
      coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, 'application/wasm'),
    })
    ffmpegInstance = ff
    return ff
  })()

  return ffmpegLoadPromise
}

// Serialization queue — @ffmpeg/ffmpeg's #send() posts messages to its
// internal worker immediately with no ordering guarantee between callers.
// Without this, concurrent clips interleave their writeFile/exec/readFile
// calls in the WASM FS, corrupting each other's input → RuntimeError.
let ffmpegQueue: Promise<void> = Promise.resolve()

function enqueueFFmpegJob<T>(job: () => Promise<T>): Promise<T> {
  const result = ffmpegQueue.then(() => job())
  ffmpegQueue = result.then(
    () => undefined,
    () => undefined,
  )
  return result
}

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

              const data = await ff.readFile(thumbName) as Uint8Array
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
