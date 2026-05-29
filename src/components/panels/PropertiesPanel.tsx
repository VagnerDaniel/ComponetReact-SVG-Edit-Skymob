import { useEffect, useState, useRef, useCallback } from "react"
import { useEditorStore } from "@/stores/editor-store"
import { useHistoryStore } from "@/stores/history-store"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { TextObject } from "@/types/canvas"

const STORAGE_KEY = "properties-label-width"
const MIN_LABEL = 40
const MAX_LABEL = 200
const DEFAULT_LABEL = 60

function useLabelDrag(labelWidth: number, onResize: (w: number) => void) {
  const ref = useRef({ startX: 0, startWidth: 0 })

  return useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    ref.current = { startX: e.clientX, startWidth: labelWidth }

    function onMove(e: MouseEvent) {
      const w = Math.max(MIN_LABEL, Math.min(MAX_LABEL, ref.current.startWidth + (e.clientX - ref.current.startX)))
      onResize(w)
    }

    function onUp() {
      document.removeEventListener("mousemove", onMove)
      document.removeEventListener("mouseup", onUp)
      document.body.style.userSelect = ""
    }

    document.addEventListener("mousemove", onMove)
    document.addEventListener("mouseup", onUp)
    document.body.style.userSelect = "none"
  }, [labelWidth, onResize])
}

function InputRow({ label, value, onChange, labelWidth, onResizeLabel }: { label: string; value: string | number; onChange: (val: string) => void; labelWidth: number; onResizeLabel: (w: number) => void }) {
  const [local, setLocal] = useState(String(value))
  const handleResize = useLabelDrag(labelWidth, onResizeLabel)

  useEffect(() => {
    setLocal(String(value))
  }, [value])

  function commit() {
    if (local !== String(value)) {
      onChange(local)
    }
  }

  return (
    <div className="flex items-center gap-0">
      <label className="text-xs text-muted-foreground truncate shrink-0 leading-7 select-none text-right pr-1" style={{ width: labelWidth }}>{label}</label>
      <div className="w-1.5 shrink-0 self-stretch cursor-col-resize rounded-sm mx-px hover:bg-primary/30 active:bg-primary/50" onMouseDown={handleResize} />
      <input
        className="flex h-7 w-full rounded border border-input bg-transparent px-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === "Enter") commit() }}
      />
    </div>
  )
}

export function PropertiesPanel() {
  const objects = useEditorStore((s) => s.objects)
  const selectedIds = useEditorStore((s) => s.selectedIds)
  const updateObject = useEditorStore((s) => s.updateObject)
  const pushSnapshot = useHistoryStore((s) => s.pushSnapshot)

  const [labelWidth, setLabelWidth] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved ? Math.max(MIN_LABEL, Math.min(MAX_LABEL, Number(saved))) : DEFAULT_LABEL
    } catch {
      return DEFAULT_LABEL
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(labelWidth))
    } catch {}
  }, [labelWidth])

  const selected = objects.find((o) => selectedIds.has(o.id))
  if (!selected || selectedIds.size !== 1) {
    const message = selectedIds.size === 0 ? "Selecione um elemento" : "Múltiplos elementos selecionados"
    return (
      <div className="flex flex-col h-full">
        <h3 className="text-sm font-semibold px-3 py-2 border-b">Propriedades</h3>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-xs text-muted-foreground">{message}</p>
        </div>
      </div>
    )
  }

  const selectedId = selected.id

  function handleUpdate(field: string, value: string | number) {
    pushSnapshot()
    updateObject(selectedId, { [field]: value } as any)
  }

  return (
    <div className="flex flex-col h-full">
      <h3 className="text-sm font-semibold px-3 py-2 border-b">Propriedades</h3>
      <ScrollArea className="flex-1 p-3">
        <div className="space-y-2">
          <InputRow label="Nome" value={selected.name} onChange={(v) => handleUpdate("name", v)} labelWidth={labelWidth} onResizeLabel={setLabelWidth} />
          <InputRow label="Posição X" value={Math.round(selected.x)} onChange={(v) => handleUpdate("x", Number(v) || 0)} labelWidth={labelWidth} onResizeLabel={setLabelWidth} />
          <InputRow label="Posição Y" value={Math.round(selected.y)} onChange={(v) => handleUpdate("y", Number(v) || 0)} labelWidth={labelWidth} onResizeLabel={setLabelWidth} />
          <InputRow label="Largura" value={Math.round(selected.width)} onChange={(v) => handleUpdate("width", Number(v) || 1)} labelWidth={labelWidth} onResizeLabel={setLabelWidth} />
          <InputRow label="Altura" value={Math.round(selected.height)} onChange={(v) => handleUpdate("height", Number(v) || 1)} labelWidth={labelWidth} onResizeLabel={setLabelWidth} />
          <InputRow label="Rotação" value={Math.round(selected.rotation)} onChange={(v) => handleUpdate("rotation", parseInt(v) || 0)} labelWidth={labelWidth} onResizeLabel={setLabelWidth} />
          <InputRow label="Opacidade" value={selected.opacity} onChange={(v) => handleUpdate("opacity", Math.max(0, Math.min(1, Number(v) || 1)))} labelWidth={labelWidth} onResizeLabel={setLabelWidth} />
          <InputRow label="Esp. Contorno" value={selected.strokeWidth} onChange={(v) => handleUpdate("strokeWidth", Number(v) || 0)} labelWidth={labelWidth} onResizeLabel={setLabelWidth} />
          <InputRow label="Tracejado" value={selected.strokeDasharray || ""} onChange={(v) => handleUpdate("strokeDasharray", v)} labelWidth={labelWidth} onResizeLabel={setLabelWidth} />
          
          {selected.type === "text" && (
            <>
              <div className="pt-2 pb-1 border-b border-t mt-2 mb-1">
                <span className="text-xs font-semibold px-2 text-muted-foreground">Fundo da Caixa</span>
              </div>
              <InputRow label="Cor de Fundo" value={(selected as TextObject).bgFill || ""} onChange={(v) => handleUpdate("bgFill", v)} labelWidth={labelWidth} onResizeLabel={setLabelWidth} />
              <InputRow label="Cor Borda" value={(selected as TextObject).bgStroke || ""} onChange={(v) => handleUpdate("bgStroke", v)} labelWidth={labelWidth} onResizeLabel={setLabelWidth} />
              <InputRow label="Esp. Borda" value={(selected as TextObject).bgStrokeWidth || 0} onChange={(v) => handleUpdate("bgStrokeWidth", Number(v) || 0)} labelWidth={labelWidth} onResizeLabel={setLabelWidth} />
              <InputRow label="Trac. Borda" value={(selected as TextObject).bgStrokeDasharray || ""} onChange={(v) => handleUpdate("bgStrokeDasharray", v)} labelWidth={labelWidth} onResizeLabel={setLabelWidth} />
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
