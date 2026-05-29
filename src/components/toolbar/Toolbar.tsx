import {
  Undo2,
  Redo2,
  Grid3x3,
  Magnet,
  ZoomIn,
  ZoomOut,
  Upload,
  Download,
  Ruler as RulerIcon,
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
  const showRulers = useEditorStore((s) => s.showRulers)
  const setShowRulers = useEditorStore((s) => s.setShowRulers)
  const rulerUnit = useEditorStore((s) => s.rulerUnit)
  const setRulerUnit = useEditorStore((s) => s.setRulerUnit)

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
        <Button
          variant="ghost"
          size="icon"
          className={`h-7 w-7 rounded-md transition-all duration-200 border ${showRulers ? "bg-primary/[0.05] border-primary/20 text-primary shadow-sm" : "border-transparent text-muted-foreground hover:bg-accent/60"}`}
          onClick={() => setShowRulers(!showRulers)}
          title="Réguas"
        >
          <RulerIcon className="h-3.5 w-3.5" />
        </Button>
        {showRulers && (
          <select 
            className="h-7 text-xs bg-transparent border border-transparent hover:border-border rounded px-1 cursor-pointer outline-none text-muted-foreground"
            value={rulerUnit}
            onChange={(e) => setRulerUnit(e.target.value as any)}
            title="Unidade da Régua"
          >
            <option value="px">px</option>
            <option value="mm">mm</option>
            <option value="cm">cm</option>
            <option value="in">in</option>
          </select>
        )}
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
        <Button 
          variant="default" 
          size="sm" 
          className="h-7 text-xs px-2 bg-blue-600 hover:bg-blue-700 text-white border-none shadow-sm" 
          onClick={async () => {
            if (objects.length === 0) return
            try {
              const res = await fetch("http://localhost:3001/api/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  objects: objects,
                  format: "png",
                  data: [
                    { "test-texto": "Primeiro Crachá", "test-numero": "12345" },
                    { "test-texto": "Segundo Crachá", "test-numero": "67890" },
                    { "test-texto": "Crachá do Vagner com um texto gigantesco para testar a quebra de linha", "test-numero": "99999" }
                  ]
                })
              })
              
              if (!res.ok) throw new Error("Falha na geração")
              
              const blob = await res.blob()
              const url = URL.createObjectURL(blob)
              const a = document.createElement("a")
              a.href = url
              a.download = "mala_direta.zip"
              a.click()
              URL.revokeObjectURL(url)
            } catch (err) {
              alert("Erro ao conectar com a API: " + (err as Error).message)
            }
          }} 
          disabled={objects.length === 0}
        >
          Mala Direta (Lote)
        </Button>
      </div>
    </div>
  )
}
