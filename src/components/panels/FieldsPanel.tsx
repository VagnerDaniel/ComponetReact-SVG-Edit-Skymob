import { useMemo } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useEditorStore } from "@/stores/editor-store"
import { useHistoryStore } from "@/stores/history-store"
import { extractFieldKeys } from "@/utils/text-parser"
import { GripVertical, Eye, EyeOff } from "lucide-react"

export function FieldsPanel() {
  const objects = useEditorStore((s) => s.objects)
  const selectedIds = useEditorStore((s) => s.selectedIds)
  const updateObject = useEditorStore((s) => s.updateObject)
  const pushSnapshot = useHistoryStore((s) => s.pushSnapshot)
  const availableFields = useEditorStore((s) => s.availableFields)
  const previewFields = useEditorStore((s) => s.previewFields)
  const setPreviewFields = useEditorStore((s) => s.setPreviewFields)

  const selected = objects.find((o) => selectedIds.has(o.id))
  const isMulti = selectedIds.size > 1

  const fieldKeys = useMemo(() => {
    if (!selected || selected.type !== "text") return []
    return extractFieldKeys(selected.text)
  }, [selected])

  function handleChange(key: string, value: string) {
    if (!selected) return
    pushSnapshot()
    const metadata = { ...selected.metadata, [key]: value }
    updateObject(selected.id, { metadata })
  }

  // Use the available fields from store, or fallback to the two test items if empty
  const fieldsList = availableFields && availableFields.length > 0 
    ? availableFields 
    : [{ key: "test-texto", label: "Texto Teste" }, { key: "test-numero", label: "Número Teste (10 dígitos)" }]

  const handleDragStart = (e: React.DragEvent, key: string) => {
    e.dataTransfer.setData("application/field-key", key)
    e.dataTransfer.effectAllowed = "copy"
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <h3 className="text-sm font-semibold">Campos</h3>
        <button
          onClick={() => setPreviewFields(!previewFields)}
          className="p-1 border-none outline-none focus:outline-none hover:bg-accent rounded-md text-muted-foreground hover:text-foreground transition-colors"
          title={previewFields ? "Ocultar valores de teste" : "Mostrar valores de teste"}
        >
          {previewFields ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
        </button>
      </div>
      
      <ScrollArea className="flex-1">
        {/* Available Fields to Drag */}
        <div className="p-3">
          <h4 className="text-xs font-semibold text-muted-foreground mb-2">Campos Disponíveis</h4>
          <div className="flex flex-col gap-2">
            {fieldsList.map((field) => (
              <div
                key={field.key}
                draggable
                onDragStart={(e) => handleDragStart(e, field.key)}
                className="flex items-center gap-2 p-2 rounded-md border bg-card text-card-foreground shadow-sm cursor-grab active:cursor-grabbing hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                <GripVertical className="h-4 w-4 text-muted-foreground" />
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="text-xs font-medium truncate">{field.label}</span>
                  <span className="text-[10px] text-muted-foreground truncate">{field.key}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Selected Element Field Values */}
        {selected && !isMulti && selected.type === "text" && fieldKeys.length > 0 && (
          <div className="p-3 border-t">
            <h4 className="text-xs font-semibold text-muted-foreground mb-2">Valor para teste</h4>
            <div className="space-y-2">
              {fieldKeys.map((key) => {
                const label = fieldsList.find((f) => f.key === key)?.label || key
                return (
                  <div key={key} className="flex flex-col gap-1">
                    <label className="text-xs text-muted-foreground">{label}</label>
                    <input
                      type={key === "test-numero" ? "number" : "text"}
                      className="flex h-7 w-full rounded border border-input bg-transparent px-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      value={selected.metadata?.[key] ?? "Valor de teste"}
                      onChange={(e) => {
                        const val = key === "test-numero" ? e.target.value.slice(0, 10) : e.target.value
                        handleChange(key, val)
                      }}
                    />
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {isMulti && (
          <div className="p-3 border-t">
            <p className="text-xs text-muted-foreground text-center">Múltiplos elementos selecionados</p>
          </div>
        )}

      </ScrollArea>
    </div>
  )
}
