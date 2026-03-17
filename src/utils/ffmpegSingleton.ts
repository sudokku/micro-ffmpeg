import { FFmpeg } from '@ffmpeg/ffmpeg'
import { toBlobURL } from '@ffmpeg/util'

let ffmpegInstance: FFmpeg | null = null
let ffmpegLoadPromise: Promise<FFmpeg> | null = null

export async function getFFmpeg(): Promise<FFmpeg> {
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

export function resetFFmpegInstance(): void {
  ffmpegInstance = null
  ffmpegLoadPromise = null
}

// Serialization queue — @ffmpeg/ffmpeg's #send() posts messages to its
// internal worker immediately with no ordering guarantee between callers.
// Without this, concurrent clips interleave their writeFile/exec/readFile
// calls in the WASM FS, corrupting each other's input → RuntimeError.
let ffmpegQueue: Promise<void> = Promise.resolve()

export function enqueueFFmpegJob<T>(job: () => Promise<T>): Promise<T> {
  const result = ffmpegQueue.then(() => job())
  ffmpegQueue = result.then(
    () => undefined,
    () => undefined,
  )
  return result
}
