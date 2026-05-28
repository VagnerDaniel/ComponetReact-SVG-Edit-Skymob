import { useEffect } from "react"
import { useEditorStore } from "@/stores/editor-store"
import { useHistoryStore } from "@/stores/history-store"

export function useKeyboardShortcuts() {
  const removeObjects = useEditorStore((s) => s.removeObjects)
  const selectedIds = useEditorStore((s) => s.selectedIds)
  const duplicateObjects = useEditorStore((s) => s.duplicateObjects)
  const clearSelection = useEditorStore((s) => s.clearSelection)
  const selectAll = useEditorStore((s) => s.selectAll)
  const setActiveTool = useEditorStore((s) => s.setActiveTool)
  const copySelected = useEditorStore((s) => s.copySelected)
  const pasteClipboard = useEditorStore((s) => s.pasteClipboard)
  const objects = useEditorStore((s) => s.objects)
  const pushSnapshot = useHistoryStore((s) => s.pushSnapshot)
  const undo = useHistoryStore((s) => s.undo)
  const redo = useHistoryStore((s) => s.redo)

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT") return

      const meta = e.ctrlKey || e.metaKey
      const ids = Array.from(selectedIds)

      // Tool shortcuts (single letter, no meta)
      if (!meta && !e.shiftKey) {
        switch (e.key.toLowerCase()) {
          case "v":
            e.preventDefault()
            setActiveTool("select")
            return
          case "r":
            e.preventDefault()
            setActiveTool("rect")
            return
          case "e":
            e.preventDefault()
            setActiveTool("ellipse")
            return
          case "l":
            e.preventDefault()
            setActiveTool("line")
            return
          case "t":
            e.preventDefault()
            setActiveTool("text")
            return
        }
      }

      // Undo
      if (meta && e.key === "z" && !e.shiftKey) {
        e.preventDefault()
        undo()
        return
      }
      // Redo
      if ((meta && e.key === "z" && e.shiftKey) || (meta && e.key === "y")) {
        e.preventDefault()
        redo()
        return
      }
      // Delete
      if (e.key === "Delete" || e.key === "Backspace") {
        if (ids.length > 0) {
          e.preventDefault()
          removeObjects(ids)
        }
        return
      }
      // Duplicate
      if (meta && e.key === "d") {
        e.preventDefault()
        if (ids.length > 0) duplicateObjects(ids)
        return
      }
      // Select All
      if (meta && e.key === "a") {
        e.preventDefault()
        selectAll()
        return
      }
      // Copy
      if (meta && e.key === "c") {
        e.preventDefault()
        if (ids.length > 0) copySelected()
        return
      }
      // Paste
      if (meta && e.key === "v") {
        e.preventDefault()
        pasteClipboard()
        pushSnapshot()
        return
      }
      // Zoom In
      if ((meta && e.key === "=") || (meta && e.key === "+")) {
        e.preventDefault()
        const store = useEditorStore.getState()
        store.setZoom(store.zoom + 0.1)
        return
      }
      // Zoom Out
      if (meta && e.key === "-") {
        e.preventDefault()
        const store = useEditorStore.getState()
        store.setZoom(store.zoom - 0.1)
        return
      }
      // Fit to Screen
      if (meta && e.key === "0") {
        e.preventDefault()
        const store = useEditorStore.getState()
        store.setZoom(1)
        return
      }
      // Escape
      if (e.key === "Escape") {
        clearSelection()
        setActiveTool("select")
        return
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [
    selectedIds,
    objects,
    removeObjects,
    duplicateObjects,
    clearSelection,
    selectAll,
    setActiveTool,
    copySelected,
    pasteClipboard,
    pushSnapshot,
    undo,
    redo,
  ])
}
