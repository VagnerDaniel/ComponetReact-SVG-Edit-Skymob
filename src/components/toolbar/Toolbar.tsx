import {
  Undo2,
  Redo2,
  Download,
  Upload,
  Grid3x3,
  Magnet,
  ZoomIn,
  ZoomOut,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { useEditorStore } from "@/stores/editor-store"
import { useHistoryStore } from "@/stores/history-store"
import { objectsToSVG, downloadSVG, svgToObjects } from "@/utils/svg-io"

export function Toolbar() {
  const objects = useEditorStore((s) => s.objects)
  const snapEnabled = useEditorStore((s) => s.snapEnabled)
  const setSnapEnabled = useEditorStore((s) => s.setSnapEnabled)
  const gridEnabled = useEditorStore((s) => s.gridEnabled)
  const setGridEnabled = useEditorStore((s) => s.setGridEnabled)
  const zoom = useEditorStore((s) => s.zoom)
  const setZoom = useEditorStore((s) => s.setZoom)
  const pushSnapshot = useHistoryStore((s) => s.pushSnapshot)
  const undo = useHistoryStore((s) => s.undo)
  const redo = useHistoryStore((s) => s.redo)
  const canUndo = useHistoryStore((s) => s.canUndo)
  const canRedo = useHistoryStore((s) => s.canRedo)

  function handleImport() {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = ".svg"
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (ev) => {
        const svgString = ev.target?.result as string
        const imported = svgToObjects(svgString)
        if (imported.length > 0) {
          pushSnapshot()
          imported.forEach((obj) => useEditorStore.getState().addObject(obj))
        }
      }
      reader.readAsText(file)
    }
    input.click()
  }

  function handleExport() {
    if (objects.length === 0) return
    const svg = objectsToSVG(objects)
    downloadSVG(svg)
  }

  return (
    <div className="flex items-center gap-1 border-b bg-background px-3 py-1.5 h-10">
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)">
          <Undo2 className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Shift+Z)">
          <Redo2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-4" />

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className={`h-7 w-7 rounded-md transition-all duration-200 border ${gridEnabled ? "bg-primary/[0.05] border-primary/20 text-primary shadow-sm" : "border-transparent text-muted-foreground hover:bg-accent/60"}`}
          onClick={() => setGridEnabled(!gridEnabled)}
          title="Grid"
        >
          <Grid3x3 className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className={`h-7 w-7 rounded-md transition-all duration-200 border ${snapEnabled ? "bg-primary/[0.05] border-primary/20 text-primary shadow-sm" : "border-transparent text-muted-foreground hover:bg-accent/60"}`}
          onClick={() => setSnapEnabled(!snapEnabled)}
          title="Snap"
        >
          <Magnet className="h-3.5 w-3.5" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-4" />

      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom(zoom - 0.1)} title="Zoom Out (Ctrl+-)">
          <ZoomOut className="h-3.5 w-3.5" />
        </Button>
        <span className="text-xs tabular-nums w-10 text-center select-none">{Math.round(zoom * 100)}%</span>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom(zoom + 0.1)} title="Zoom In (Ctrl+=)">
          <ZoomIn className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-1">
        <Button variant="outline" size="sm" className="h-7 text-xs px-2" onClick={handleImport}>
          <Upload className="h-3.5 w-3.5 mr-1" />
          Import
        </Button>
        <Button variant="outline" size="sm" className="h-7 text-xs px-2" onClick={handleExport} disabled={objects.length === 0}>
          <Download className="h-3.5 w-3.5 mr-1" />
          Export
        </Button>
      </div>
    </div>
  )
}
