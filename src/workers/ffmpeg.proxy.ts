import * as Comlink from 'comlink'
import type { FfmpegWorkerApi } from './ffmpeg.worker'

let _proxy: Comlink.Remote<FfmpegWorkerApi> | null = null

export function getFfmpegProxy(): Comlink.Remote<FfmpegWorkerApi> {
  if (!_proxy) {
    const worker = new Worker(
      new URL('./ffmpeg.worker.ts', import.meta.url),
      { type: 'module' },
    )
    _proxy = Comlink.wrap<FfmpegWorkerApi>(worker)
  }
  return _proxy
}
