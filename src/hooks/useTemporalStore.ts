import { useStore as useZustandStore } from 'zustand'
import type { TemporalState } from 'zundo'
import { useStore } from '../store'
import type { TrackedState } from '../store/types'

export const useTemporalStore = <T,>(
  selector: (state: TemporalState<TrackedState>) => T,
): T => useZustandStore(useStore.temporal, selector)
