import { useEditorStore } from "@/stores/editor-store"
import { useHistoryStore } from "@/stores/history-store"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { RectObject } from "@/types/canvas"

function InputRow({ label, value, onChange }: { label: string; value: string | number; onChange: (val: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-xs text-muted-foreground w-12 shrink-0">{label}</label>
      <input
        className="flex h-7 w-full rounded border border-input bg-transparent px-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}

function ColorInput({ label, value, onChange }: { label: string; value: string; onChange: (val: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-xs text-muted-foreground w-12 shrink-0">{label}</label>
      <div className="flex items-center gap-1 flex-1">
        <input
          type="color"
          className="h-7 w-8 rounded border border-input bg-transparent cursor-pointer"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <input
          className="flex h-7 w-full rounded border border-input bg-transparent px-2 text-xs shadow-sm font-mono"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </div>
  )
}

export function PropertiesPanel() {
  const objects = useEditorStore((s) => s.objects)
  const selectedIds = useEditorStore((s) => s.selectedIds)
  const updateObject = useEditorStore((s) => s.updateObject)
  const pushSnapshot = useHistoryStore((s) => s.pushSnapshot)

  const selected = objects.find((o) => selectedIds.has(o.id))
  if (!selected || selectedIds.size !== 1) {
    const message = selectedIds.size === 0 ? "Select an element" : "Multiple elements selected"
    return (
      <div className="flex flex-col h-full">
        <h3 className="text-sm font-semibold px-3 py-2 border-b">Properties</h3>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-xs text-muted-foreground">{message}</p>
        </div>
      </div>
    )
  }

  const selectedId = selected.id
  const isRect = (selected as RectObject).rx !== undefined

  function handleUpdate(field: string, value: string | number) {
    pushSnapshot()
    updateObject(selectedId, { [field]: value } as any)
  }

  return (
    <div className="flex flex-col h-full">
      <h3 className="text-sm font-semibold px-3 py-2 border-b">Properties</h3>
      <ScrollArea className="flex-1 p-3">
        <div className="space-y-2">
          <InputRow label="Name" value={selected.name} onChange={(v) => handleUpdate("name", v)} />
          <InputRow label="X" value={Math.round(selected.x)} onChange={(v) => handleUpdate("x", Number(v) || 0)} />
          <InputRow label="Y" value={Math.round(selected.y)} onChange={(v) => handleUpdate("y", Number(v) || 0)} />
          <InputRow label="W" value={Math.round(selected.width)} onChange={(v) => handleUpdate("width", Number(v) || 1)} />
          <InputRow label="H" value={Math.round(selected.height)} onChange={(v) => handleUpdate("height", Number(v) || 1)} />
          <InputRow label="Rot" value={`${Math.round(selected.rotation)}°`} onChange={(v) => handleUpdate("rotation", parseInt(v) || 0)} />
          <InputRow label="Opacity" value={selected.opacity} onChange={(v) => handleUpdate("opacity", Math.max(0, Math.min(1, Number(v) || 1)))} />

          {isRect && (
            <>
              <InputRow label="Rx" value={(selected as RectObject).rx} onChange={(v) => handleUpdate("rx", Number(v) || 0)} />
              <InputRow label="Ry" value={(selected as RectObject).ry} onChange={(v) => handleUpdate("ry", Number(v) || 0)} />
            </>
          )}

          <ColorInput label="Fill" value={selected.fill} onChange={(v) => handleUpdate("fill", v)} />
          <ColorInput label="Stroke" value={selected.stroke} onChange={(v) => handleUpdate("stroke", v)} />
          <InputRow label="Str W" value={selected.strokeWidth} onChange={(v) => handleUpdate("strokeWidth", Number(v) || 0)} />
        </div>
      </ScrollArea>
    </div>
  )
}
