import { create } from "zustand"
import { immer } from "zustand/middleware/immer"
import { persist } from "zustand/middleware"
import { enableMapSet } from "immer"
enableMapSet()
import type { AnyCanvasObject, EditorState, ToolType } from "@/types/canvas"

interface EditorActions {
  setActiveTool: (tool: ToolType) => void
  addObject: (obj: AnyCanvasObject) => void
  updateObject: (id: string, patch: Partial<AnyCanvasObject>) => void
  removeObjects: (ids: string[]) => void
  setSelectedIds: (ids: Set<string>) => void
  clearSelection: () => void
  selectAll: () => void
  setZoom: (zoom: number) => void
  setSnapEnabled: (enabled: boolean) => void
  setGridEnabled: (enabled: boolean) => void
  duplicateObjects: (ids: string[]) => void
  bringForward: (ids: string[]) => void
  sendBackward: (ids: string[]) => void
  reorderObject: (id: string, targetId: string, position: "before" | "after") => void
  copySelected: () => void
  pasteClipboard: () => void
  setAvailableFields: (fields: { key: string; label: string }[]) => void
  setPreviewFields: (enabled: boolean) => void
  setShowRulers: (enabled: boolean) => void
  setRulerUnit: (unit: "px" | "mm" | "cm" | "in") => void
  triggerFitToScreen: (animated?: boolean) => void
}

export const useEditorStore = create<EditorState & EditorActions>()(
  persist(
    immer((set) => ({
    objects: [],
    selectedIds: new Set<string>(),
    activeTool: "select",
    zoom: 1,
    snapEnabled: true,
    gridEnabled: false,
    clipboard: [],
    availableFields: [],
    previewFields: true,
    showRulers: true,
    rulerUnit: "mm" as const,
    documentWidth: 100 * 96 / 25.4,
    documentHeight: 75 * 96 / 25.4,
    fitToScreenTrigger: null,

    setShowRulers: (enabled) =>
      set((state) => {
        state.showRulers = enabled
      }),

    setRulerUnit: (unit) =>
      set((state) => {
        state.rulerUnit = unit
      }),

    triggerFitToScreen: (animated = true) =>
      set((state) => {
        state.fitToScreenTrigger = { ts: Date.now(), animated }
      }),

    setPreviewFields: (enabled) =>
      set((state) => {
        state.previewFields = enabled
      }),

    setAvailableFields: (fields) =>
      set((state) => {
        state.availableFields = fields
      }),

    setActiveTool: (tool) =>
      set((state) => {
        state.activeTool = tool
      }),

    addObject: (obj) =>
      set((state) => {
        state.objects.push(obj)
      }),

    updateObject: (id, patch) =>
      set((state) => {
        const idx = state.objects.findIndex((o) => o.id === id)
        if (idx !== -1) {
          Object.assign(state.objects[idx], patch)
        }
      }),

    removeObjects: (ids) =>
      set((state) => {
        state.objects = state.objects.filter((o) => !ids.includes(o.id))
        ids.forEach((id) => state.selectedIds.delete(id))
      }),

    setSelectedIds: (ids) =>
      set((state) => {
        state.selectedIds = ids
      }),

    clearSelection: () =>
      set((state) => {
        state.selectedIds = new Set()
      }),

    selectAll: () =>
      set((state) => {
        state.selectedIds = new Set(state.objects.filter((o) => !o.locked).map((o) => o.id))
      }),

    setZoom: (zoom) =>
      set((state) => {
        state.zoom = Math.max(0.1, Math.min(10, zoom))
      }),

    setSnapEnabled: (enabled) =>
      set((state) => {
        state.snapEnabled = enabled
      }),

    setGridEnabled: (enabled) =>
      set((state) => {
        state.gridEnabled = enabled
      }),

    duplicateObjects: (ids) =>
      set((state) => {
        const clones = state.objects
          .filter((o) => ids.includes(o.id))
          .map((o) => ({
            ...JSON.parse(JSON.stringify(o)),
            id: crypto.randomUUID(),
            x: o.x + 10,
            y: o.y + 10,
            name: o.name + " (copy)",
          }))
        state.objects.push(...clones)
        state.selectedIds = new Set(clones.map((c) => c.id))
      }),

    bringForward: (ids) =>
      set((state) => {
        for (let i = state.objects.length - 1; i >= 1; i--) {
          if (ids.includes(state.objects[i].id) && !ids.includes(state.objects[i - 1].id)) {
            const temp = state.objects[i]
            state.objects[i] = state.objects[i - 1]
            state.objects[i - 1] = temp
          }
        }
      }),

    sendBackward: (ids) =>
      set((state) => {
        for (let i = 0; i < state.objects.length - 1; i++) {
          if (ids.includes(state.objects[i].id) && !ids.includes(state.objects[i + 1].id)) {
            const temp = state.objects[i]
            state.objects[i] = state.objects[i + 1]
            state.objects[i + 1] = temp
          }
        }
      }),

    reorderObject: (id, targetId, position) =>
      set((state) => {
        const fromIdx = state.objects.findIndex((o) => o.id === id)
        const targetIdx = state.objects.findIndex((o) => o.id === targetId)
        if (fromIdx === -1 || targetIdx === -1) return
        const [obj] = state.objects.splice(fromIdx, 1)
        const newTargetIdx = state.objects.findIndex((o) => o.id === targetId)
        const insertAt = position === "before" ? newTargetIdx + 1 : newTargetIdx
        state.objects.splice(insertAt, 0, obj)
      }),

    copySelected: () =>
      set((state) => {
        const copied = state.objects
          .filter((o) => state.selectedIds.has(o.id))
          .map((o) => JSON.parse(JSON.stringify(o)))
        ;(state as any).clipboard = copied
      }),

    pasteClipboard: () =>
      set((state) => {
        const clipboard = (state as any).clipboard as AnyCanvasObject[]
        if (!clipboard || clipboard.length === 0) return
        const clones = clipboard.map((o) => ({
          ...JSON.parse(JSON.stringify(o)),
          id: crypto.randomUUID(),
          x: o.x + 20,
          y: o.y + 20,
          name: o.name + " (pasted)",
        }))
        state.objects.push(...clones)
        state.selectedIds = new Set(clones.map((c) => c.id))
      }),
  })),
  {
    name: "editor-settings",
    partialize: (state) => ({
      gridEnabled: state.gridEnabled,
      snapEnabled: state.snapEnabled,
      zoom: state.zoom,
      previewFields: state.previewFields,
      showRulers: state.showRulers,
      rulerUnit: state.rulerUnit,
    }),
  }
)
)
