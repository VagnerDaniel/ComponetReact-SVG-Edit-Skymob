import { create } from "zustand"
import { produce } from "immer"
import type { AnyCanvasObject } from "@/types/canvas"
import { useEditorStore } from "./editor-store"

interface HistoryState {
  past: AnyCanvasObject[][]
  future: AnyCanvasObject[][]
  canUndo: boolean
  canRedo: boolean
  undo: () => void
  redo: () => void
  pushSnapshot: () => void
}

export const useHistoryStore = create<HistoryState>()((set, get) => ({
  past: [],
  future: [],
  canUndo: false,
  canRedo: false,

  pushSnapshot: () => {
    const snapshot = JSON.parse(JSON.stringify(useEditorStore.getState().objects))
    set((state) => ({
      past: [...state.past.slice(-49), snapshot],
      future: [],
      canUndo: true,
      canRedo: false,
    }))
  },

  undo: () => {
    const { past } = get()
    if (past.length === 0) return
    const current = JSON.parse(JSON.stringify(useEditorStore.getState().objects))
    const previous = past[past.length - 1]
    useEditorStore.setState(
      produce(useEditorStore.getState(), (draft) => {
        draft.objects = previous
      })
    )
    set((state) => ({
      past: state.past.slice(0, -1),
      future: [current, ...state.future],
      canUndo: state.past.length > 1,
      canRedo: true,
    }))
  },

  redo: () => {
    const { future } = get()
    if (future.length === 0) return
    const current = JSON.parse(JSON.stringify(useEditorStore.getState().objects))
    const next = future[0]
    useEditorStore.setState(
      produce(useEditorStore.getState(), (draft) => {
        draft.objects = next
      })
    )
    set((state) => ({
      past: [...state.past, current],
      future: state.future.slice(1),
      canUndo: true,
      canRedo: state.future.length > 1,
    }))
  },
}))
