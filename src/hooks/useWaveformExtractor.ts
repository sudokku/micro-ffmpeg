import { useEffect, useRef } from 'react'
import { useStore } from '../store'
import { extractPeaks } from '../utils/extractPeaks'

export function useWaveformExtractor() {
  const inFlightRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    const unsubscribe = useStore.subscribe((state) => {
      const audioClipIds = state.tracks.audio.clipIds.filter(
        (id) =>
          state.clips[id] &&
          state.clips[id].trackId === 'audio' &&
          state.clips[id].waveformPeaks === null &&
          !inFlightRef.current.has(id)
      )

      for (const clipId of audioClipIds) {
        const clip = state.clips[clipId]
        if (!clip) continue

        inFlightRef.current.add(clipId)

        ;(async () => {
          try {
            // Fresh arrayBuffer call — decodeAudioData detaches the buffer
            const arrayBuffer = await clip.sourceFile.arrayBuffer()
            const ctx = new OfflineAudioContext(1, 1, 22050)
            const audioBuffer = await ctx.decodeAudioData(arrayBuffer)
            const peaks = extractPeaks(audioBuffer)

            useStore.getState().setWaveformPeaks(clipId, peaks)
          } catch (err) {
            console.error(`Waveform extraction failed for clip ${clipId}:`, err)
          } finally {
            inFlightRef.current.delete(clipId)
          }
        })()
      }
    })

    return unsubscribe
  }, [])
}
