import { X } from "lucide-react"
import { useEditorStore } from "@/stores/editor-store"
import { useHistoryStore } from "@/stores/history-store"

const COLORS = [
  "#000000", "#ffffff", "#dc2626", "#2563eb", "#16a34a",
  "#ca8a04", "#ea580c", "#9333ea", "#0891b2", "#be123c",
  "#f3f4f6", "#d1d5db", "#9ca3af", "#6b7280", "#374151",
  "#1f2937", "#111827", "#e5e7eb", "#4b5563", "#030712",
]

export function ColorPalette() {
  const objects = useEditorStore((s) => s.objects)
  const selectedIds = useEditorStore((s) => s.selectedIds)
  const updateObject = useEditorStore((s) => s.updateObject)
  const pushSnapshot = useHistoryStore((s) => s.pushSnapshot)

  const selected = objects.find((o) => selectedIds.has(o.id))

  function setFill(color: string) {
    if (!selected || selectedIds.size !== 1) return
    pushSnapshot()
    updateObject(selected.id, { fill: color } as any)
  }

  function setStroke(color: string) {
    if (!selected || selectedIds.size !== 1) return
    pushSnapshot()
    updateObject(selected.id, { stroke: color } as any)
  }

  return (
    <div className="flex items-center gap-0.5">
      <button
        className="flex items-center justify-center w-5 h-5 rounded border border-border hover:bg-accent cursor-pointer"
        title="No fill"
        onClick={() => setFill("none")}
        onContextMenu={(e) => e.preventDefault()}
        onMouseDown={(e) => { if (e.button === 2) { e.preventDefault(); setStroke("none") } }}
      >
        <X className="h-3 w-3 text-muted-foreground" />
      </button>
      {COLORS.map((color) => (
        <button
          key={color}
          className="w-5 h-5 rounded border border-border cursor-pointer hover:scale-110 transition-transform"
          style={{ backgroundColor: color, borderColor: color === "#ffffff" ? "#d1d5db" : color }}
          title={color}
          onClick={() => setFill(color)}
          onContextMenu={(e) => e.preventDefault()}
          onMouseDown={(e) => { if (e.button === 2) { e.preventDefault(); setStroke(color) } }}
        />
      ))}
    </div>
  )
}
