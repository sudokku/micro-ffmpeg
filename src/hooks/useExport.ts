import { useRef } from 'react'
import type { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile } from '@ffmpeg/util'
import { useStore } from '../store'
import { getFFmpeg, enqueueFFmpegJob, resetFFmpegInstance } from '../utils/ffmpegSingleton'
import { buildVfFilter, FORMAT_MAP, buildOutputFilename } from '../utils/buildFilterGraph'
import type { ExportFormat } from '../utils/buildFilterGraph'

// Module-level state for the last successful export's download URL and filename
let downloadUrl: string | null = null
let downloadFilename: string = ''

/**
 * Prepares a blob URL for download from raw Uint8Array data.
 * Exported for unit testing.
 * Returns the created object URL.
 */
export function triggerDownload(data: Uint8Array, filename: string, mimeType: string): string {
  if (downloadUrl) URL.revokeObjectURL(downloadUrl)
  const blob = new Blob([data], { type: mimeType })
  downloadUrl = URL.createObjectURL(blob)
  downloadFilename = filename
  return downloadUrl
}

/**
 * Triggers the browser's file save dialog using the last prepared download URL.
 */
function performDownload() {
  if (!downloadUrl) return
  const a = document.createElement('a')
  a.href = downloadUrl
  a.download = downloadFilename
  a.click()
}

/**
 * Runs ff.exec(args), captures FFmpeg log output, and throws a clear error
 * (with logs printed to console) if the process exits non-zero.
 */
async function execAndCheck(ff: FFmpeg, args: string[], label: string): Promise<void> {
  const logs: string[] = []
  const logHandler = ({ message }: { message: string }) => logs.push(message)
  ff.on('log', logHandler)
  try {
    const exitCode = await ff.exec(args)
    if (exitCode !== 0) {
      console.error(`[ffmpeg] ${label} failed (exit ${exitCode}):\n${logs.join('\n')}`)
      throw new Error(`FFmpeg ${label} failed (exit ${exitCode})`)
    }
  } finally {
    ff.off('log', logHandler)
  }
}

export function useExport() {
  const cancelledRef = useRef(false)

  async function runExport(format: ExportFormat) {
    cancelledRef.current = false
    const { setExportStatus, setExportProgress } = useStore.getState()
    setExportStatus('rendering')
    setExportProgress(0)

    // Revoke any previous download URL
    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl)
      downloadUrl = null
    }

    try {
      const { tracks, clips, clipSettings } = useStore.getState()
      const videoClipIds = tracks.video.clipIds.filter((id) => clips[id])
      const audioClipIds = tracks.audio.clipIds.filter((id) => clips[id])
      const totalClips = videoClipIds.length

      if (totalClips === 0) throw new Error('No video clips to export')

      const ff = await getFFmpeg()
      const formatConfig = FORMAT_MAP[format]
      const intermediateFiles: string[] = []

      // Determine output resolution from first clip; normalize to even dimensions for libx264
      const firstClip = clips[videoClipIds[0]]
      const outputWidth = firstClip.sourceWidth || 1280
      const outputHeight = firstClip.sourceHeight || 720
      const normWidth = outputWidth % 2 === 0 ? outputWidth : outputWidth + 1
      const normHeight = outputHeight % 2 === 0 ? outputHeight : outputHeight + 1

      for (let i = 0; i < videoClipIds.length; i++) {
        if (cancelledRef.current) return

        const clipId = videoClipIds[i]
        const clip = clips[clipId]
        const settings = clipSettings[clipId]

        await enqueueFFmpegJob(async () => {
          const fileData = await fetchFile(clip.sourceFile)
          const ext = clip.sourceFile.name.split('.').pop()?.toLowerCase() || 'mp4'
          const inputName = `input_${clipId}.${ext}`

          // GIF intermediates are mp4 (re-encoded to GIF in final pass)
          const intermediateName = `clip_${i}.${format === 'gif' ? 'mp4' : formatConfig.ext}`

          await ff.writeFile(inputName, fileData)

          const trimStart = clip.trimStart
          // trimClip() only updates startTime/endTime (timeline positions); trimStart/trimEnd are not
          // kept in sync yet. Use endTime-startTime (the displayed timeline duration) for -t.
          const duration = clip.endTime - clip.startTime

          // Register per-clip progress handler
          const handler = ({ progress: p }: { progress: number }) => {
            const clipBase = i / totalClips
            const clipFrac = 1 / totalClips
            const pct = Math.round((clipBase + Math.max(0, Math.min(1, p)) * clipFrac) * 90)
            useStore.getState().setExportProgress(pct)
          }
          ff.on('progress', handler)

          console.log(`[export] clip ${i + 1}/${totalClips}: "${clip.sourceFile.name}" ${clip.sourceWidth}×${clip.sourceHeight} trim=${trimStart.toFixed(3)}s dur=${duration.toFixed(3)}s`)

          try {
            const execArgs: string[] = ['-ss', String(trimStart), '-i', inputName, '-t', String(duration)]

            if (format === 'gif') {
              // GIF: single-pass, no normalize scale, fps=15, scale=480:-2, lanczos
              const userVf = buildVfFilter(settings, clip)
              const gifVf = userVf
                ? `${userVf},fps=15,scale=480:-2:flags=lanczos`
                : 'fps=15,scale=480:-2:flags=lanczos'
              execArgs.push('-vf', gifVf, '-loop', '0', intermediateName)
            } else {
              // Non-GIF: normalize fps, pixel format, dimensions, and color space so all
              // intermediates are identical streams that concat -c copy can splice safely.
              const userVf = buildVfFilter(settings, clip)
              // trunc() prevents fractional pad offsets on unusual aspect ratios (fix #5)
              const normalizeScale = `scale=${normWidth}:${normHeight}:force_original_aspect_ratio=decrease,pad=${normWidth}:${normHeight}:trunc((ow-iw)/2):trunc((oh-ih)/2)`
              const vf = userVf ? `${userVf},${normalizeScale}` : normalizeScale
              execArgs.push('-vf', vf)
              execArgs.push('-r', '30')                        // uniform frame rate
              execArgs.push('-pix_fmt', 'yuv420p')             // uniform pixel format (fix: 10-bit / yuv422p inputs)
              execArgs.push('-colorspace', 'bt709')            // stamp color space metadata (fix: missing tags)
              execArgs.push('-color_trc', 'bt709')
              execArgs.push('-color_primaries', 'bt709')
              execArgs.push('-c:v', formatConfig.codec!)
              execArgs.push(...formatConfig.args)
              execArgs.push('-an', intermediateName)
            }

            console.log(`[export] ffmpeg args: ${execArgs.join(' ')}`)
            await execAndCheck(ff, execArgs, `clip ${i + 1}/${totalClips} encode`)
          } finally {
            ff.off('progress', handler)
            try { await ff.deleteFile(inputName) } catch { /* ignore */ }
          }

          intermediateFiles.push(intermediateName)
        })

        if (cancelledRef.current) return
      }

      // Process audio clips (skip for GIF)
      let audioIntermediateName: string | null = null
      if (audioClipIds.length > 0 && format !== 'gif') {
        await enqueueFFmpegJob(async () => {
          for (let i = 0; i < audioClipIds.length; i++) {
            const clip = clips[audioClipIds[i]]
            const fileData = await fetchFile(clip.sourceFile)
            const ext = clip.sourceFile.name.split('.').pop()?.toLowerCase() || 'mp3'
            const inputName = `audio_input_${i}.${ext}`
            const outputName = `audio_${i}.aac`
            await ff.writeFile(inputName, fileData)
            const trimStart = clip.trimStart
            const duration = clip.endTime - clip.startTime
            console.log(`[export] audio ${i + 1}: "${clip.sourceFile.name}" trim=${trimStart.toFixed(3)}s dur=${duration.toFixed(3)}s`)
            await execAndCheck(
              ff,
              // -ar 48000: normalize sample rate so multi-clip audio concat -c copy never sees mismatched rates
              ['-ss', String(trimStart), '-i', inputName, '-t', String(duration), '-c:a', 'aac', '-b:a', '128k', '-ar', '48000', outputName],
              `audio ${i + 1} encode`,
            )
            try { await ff.deleteFile(inputName) } catch { /* ignore */ }
          }
          if (audioClipIds.length === 1) {
            audioIntermediateName = 'audio_0.aac'
          } else {
            const concatList = audioClipIds.map((_, i) => `file 'audio_${i}.aac'`).join('\n')
            await ff.writeFile('audio_concat.txt', concatList)
            await execAndCheck(
              ff,
              ['-f', 'concat', '-safe', '0', '-i', 'audio_concat.txt', '-c', 'copy', 'audio_merged.aac'],
              'audio concat',
            )
            audioIntermediateName = 'audio_merged.aac'
            try { await ff.deleteFile('audio_concat.txt') } catch { /* ignore */ }
            for (let i = 0; i < audioClipIds.length; i++) {
              try { await ff.deleteFile(`audio_${i}.aac`) } catch { /* ignore */ }
            }
          }
        })
      }

      if (cancelledRef.current) return

      // Final pass: concat video intermediates and produce output file
      const outputFilename = buildOutputFilename(format)

      await enqueueFFmpegJob(async () => {
        if (intermediateFiles.length === 1 && !audioIntermediateName && format !== 'gif') {
          // Single clip, no audio, non-GIF — read directly
          const data = await ff.readFile(intermediateFiles[0]) as Uint8Array
          triggerDownload(data, outputFilename, formatConfig.mime)
          try { await ff.deleteFile(intermediateFiles[0]) } catch { /* ignore */ }
        } else if (format === 'gif' && intermediateFiles.length === 1) {
          // Single-clip GIF — convert mp4 intermediate to GIF
          await execAndCheck(ff, ['-i', intermediateFiles[0], '-loop', '0', outputFilename], 'gif convert')
          try { await ff.deleteFile(intermediateFiles[0]) } catch { /* ignore */ }
          const data = await ff.readFile(outputFilename) as Uint8Array
          triggerDownload(data, outputFilename, formatConfig.mime)
          try { await ff.deleteFile(outputFilename) } catch { /* ignore */ }
        } else {
          // Multiple clips or audio — concat video intermediates
          const concatContent = intermediateFiles.map((f) => `file '${f}'`).join('\n')
          await ff.writeFile('concat_list.txt', concatContent)
          const concatOutput = audioIntermediateName ? `video_only_concat.${format === 'gif' ? 'mp4' : formatConfig.ext}` : outputFilename
          await execAndCheck(
            ff,
            ['-f', 'concat', '-safe', '0', '-i', 'concat_list.txt', '-c', 'copy', concatOutput],
            'video concat',
          )
          try { await ff.deleteFile('concat_list.txt') } catch { /* ignore */ }
          for (const f of intermediateFiles) {
            try { await ff.deleteFile(f) } catch { /* ignore */ }
          }

          if (format === 'gif') {
            // Convert concatenated mp4 to GIF
            await execAndCheck(ff, ['-i', concatOutput, '-loop', '0', outputFilename], 'gif convert')
            try { await ff.deleteFile(concatOutput) } catch { /* ignore */ }
          } else if (audioIntermediateName) {
            // Mux video + audio
            await execAndCheck(
              ff,
              ['-i', concatOutput, '-i', audioIntermediateName, '-c:v', 'copy', '-c:a', 'copy', outputFilename],
              'audio/video mux',
            )
            try { await ff.deleteFile(concatOutput) } catch { /* ignore */ }
            try { await ff.deleteFile(audioIntermediateName) } catch { /* ignore */ }
          }

          const data = await ff.readFile(outputFilename) as Uint8Array
          triggerDownload(data, outputFilename, formatConfig.mime)
          try { await ff.deleteFile(outputFilename) } catch { /* ignore */ }
        }
      })

      useStore.getState().setExportProgress(100)
      useStore.getState().setExportStatus('done')

    } catch (err) {
      if (!cancelledRef.current) {
        console.error('Export failed:', err)
        useStore.getState().setExportStatus('error')
      }
    }
  }

  function cancelExport() {
    cancelledRef.current = true
    getFFmpeg().then((ff) => {
      ff.terminate()
      resetFFmpegInstance()
    }).catch(() => { /* ignore if ffmpeg not yet loaded */ })
    useStore.getState().setExportStatus('idle')
    useStore.getState().setExportProgress(0)
  }

  return { runExport, cancelExport, performDownload }
}
