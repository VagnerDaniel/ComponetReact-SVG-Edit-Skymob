import { useState, useEffect, useRef } from "react"
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

function ZoomInput() {
  const zoom = useEditorStore((s) => s.zoom)
  const setZoom = useEditorStore((s) => s.setZoom)
  const triggerFitToScreen = useEditorStore((s) => s.triggerFitToScreen)

  const [zoomStr, setZoomStr] = useState(Math.round(zoom * 50) + "%")
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) setZoomStr(Math.round(zoom * 50) + "%")
  }, [zoom, isOpen])

  useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (e: PointerEvent | MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        setZoomStr(Math.round(useEditorStore.getState().zoom * 50) + "%")
        const input = containerRef.current.querySelector('input')
        if (input) input.blur()
      }
    }
    document.addEventListener("pointerdown", handleClickOutside, { capture: true })
    document.addEventListener("mousedown", handleClickOutside, { capture: true })
    document.addEventListener("touchstart", handleClickOutside, { capture: true })
    return () => {
      document.removeEventListener("pointerdown", handleClickOutside, { capture: true })
      document.removeEventListener("mousedown", handleClickOutside, { capture: true })
      document.removeEventListener("touchstart", handleClickOutside, { capture: true })
    }
  }, [isOpen])

  const handleZoomSubmit = (v: string) => {
    setIsOpen(false)
    if (v === "fit" || v === "Encaixar") {
      triggerFitToScreen()
      return
    }
    const parsed = parseInt(v.replace(/[^0-9]/g, ""), 10)
    if (!isNaN(parsed) && parsed > 0 && parsed <= 5000) {
      setZoom(parsed / 50)
    } else {
      setZoomStr(Math.round(zoom * 50) + "%")
    }
  }

  const options = ["Encaixar", "30%", "50%", "75%", "100%", "125%", "150%", "200%", "300%"]

  return (
    <div ref={containerRef} className="relative flex items-center h-7 group">
      <input
        type="text"
        className="h-full w-[55px] text-xs bg-transparent outline-none group-hover:bg-slate-100 focus:bg-white focus:ring-1 focus:ring-blue-400 rounded-l px-1 text-center transition-all"
        value={zoomStr}
        onChange={(e) => {
          setZoomStr(e.target.value)
          setIsOpen(true)
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={() => {
          setIsOpen(false)
          setZoomStr(Math.round(useEditorStore.getState().zoom * 50) + "%")
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            handleZoomSubmit(zoomStr)
            e.currentTarget.blur()
          } else if (e.key === "Escape") {
            setIsOpen(false)
            setZoomStr(Math.round(useEditorStore.getState().zoom * 50) + "%")
            e.currentTarget.blur()
          }
        }}
      />
      <button
        className="h-full px-1.5 text-muted-foreground group-hover:bg-slate-100 rounded-r flex items-center justify-center outline-none"
        onMouseDown={(e) => {
          e.preventDefault()
          setIsOpen(!isOpen)
        }}
        tabIndex={-1}
      >
        <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full mt-1 left-0 w-[90px] bg-white border border-slate-200 rounded shadow-lg py-1 z-50">
          {options.map((opt) => (
            <button
              key={opt}
              className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-100"
              onMouseDown={(e) => {
                e.preventDefault()
                handleZoomSubmit(opt)
              }}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function Toolbar() {
  const objects = useEditorStore((s) => s.objects)
  const snapEnabled = useEditorStore((s) => s.snapEnabled)
  const setSnapEnabled = useEditorStore((s) => s.setSnapEnabled)
  const gridEnabled = useEditorStore((s) => s.gridEnabled)
  const setGridEnabled = useEditorStore((s) => s.setGridEnabled)
  const zoom = useEditorStore((s) => s.zoom)
  const setZoom = useEditorStore((s) => s.setZoom)
  const triggerFitToScreen = useEditorStore((s) => s.triggerFitToScreen)
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
          
          <ZoomInput />

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
