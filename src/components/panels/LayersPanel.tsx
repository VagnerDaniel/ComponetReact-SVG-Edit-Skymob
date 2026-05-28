import { Eye, EyeOff, Lock, Unlock, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { useEditorStore } from "@/stores/editor-store"
import { useHistoryStore } from "@/stores/history-store"
import type { AnyCanvasObject } from "@/types/canvas"

export function LayersPanel() {
  const objects = useEditorStore((s) => s.objects)
  const selectedIds = useEditorStore((s) => s.selectedIds)
  const setSelectedIds = useEditorStore((s) => s.setSelectedIds)
  const updateObject = useEditorStore((s) => s.updateObject)
  const removeObjects = useEditorStore((s) => s.removeObjects)
  const pushSnapshot = useHistoryStore((s) => s.pushSnapshot)

  function handleSelect(id: string) {
    setSelectedIds(new Set([id]))
  }

  function handleToggleVisibility(id: string, obj: AnyCanvasObject) {
    pushSnapshot()
    updateObject(id, { visible: !obj.visible } as any)
  }

  function handleToggleLock(id: string, obj: AnyCanvasObject) {
    pushSnapshot()
    updateObject(id, { locked: !obj.locked } as any)
  }

  function handleDelete(id: string) {
    pushSnapshot()
    removeObjects([id])
  }

  return (
    <div className="flex flex-col h-full">
      <h3 className="text-sm font-semibold px-3 py-2 border-b">Layers</h3>
      <ScrollArea className="flex-1">
        {objects.length === 0 ? (
          <p className="text-xs text-muted-foreground px-3 py-4 text-center">
            No elements yet
          </p>
        ) : (
          [...objects].reverse().map((obj) => (
            <div key={obj.id}>
              <div
                className={`flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-accent transition-colors ${
                  selectedIds.has(obj.id) ? "bg-accent" : ""
                }`}
                onClick={() => handleSelect(obj.id)}
              >
                <span className="text-xs font-mono truncate flex-1">{obj.name}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleToggleVisibility(obj.id, obj)
                  }}
                >
                  {obj.visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleToggleLock(obj.id, obj)
                  }}
                >
                  {obj.locked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-destructive"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete(obj.id)
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
              <Separator />
            </div>
          ))
        )}
      </ScrollArea>
    </div>
  )
}
