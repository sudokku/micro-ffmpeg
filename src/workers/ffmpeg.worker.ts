import * as Comlink from 'comlink'

const api = {
  async ping(): Promise<'pong'> {
    return 'pong'
  },
}

Comlink.expose(api)
export type FfmpegWorkerApi = typeof api
