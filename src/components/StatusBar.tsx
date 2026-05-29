import { useEditorStore } from "@/stores/editor-store"
import { ColorPalette } from "./ColorPalette"

export function StatusBar() {
  const zoom = useEditorStore((s) => s.zoom)
  const objects = useEditorStore((s) => s.objects)
  const selectedIds = useEditorStore((s) => s.selectedIds)

  return (
    <div className="h-7 flex items-center justify-between bg-[#f0f0f0] border-t border-border px-3 text-[11px] text-muted-foreground select-none">
      <div className="flex items-center gap-4">
        <span className="tabular-nums">Zoom: {Math.round(zoom * 50)}%</span>
        <span>{objects.length} object{objects.length !== 1 ? "s" : ""}</span>
        {selectedIds.size > 0 && (
          <span>{selectedIds.size} selected</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[10px]">Fill / Stroke (right-click)</span>
        <ColorPalette />
      </div>
    </div>
  )
}
