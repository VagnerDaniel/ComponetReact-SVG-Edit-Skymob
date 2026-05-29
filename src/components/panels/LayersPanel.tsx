import { useCallback, useRef, useState } from "react"
import { Eye, EyeOff, Lock, Unlock, Trash2, GripVertical } from "lucide-react"
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
  const reorderObject = useEditorStore((s) => s.reorderObject)
  const pushSnapshot = useHistoryStore((s) => s.pushSnapshot)

  const dragIdRef = useRef<string | null>(null)
  const dropTargetRef = useRef<{ id: string; position: "before" | "after" } | null>(null)
  const [dropIndicator, setDropIndicator] = useState<{ id: string; position: "before" | "after" } | null>(null)

  const handleSelect = useCallback((id: string) => {
    setSelectedIds(new Set([id]))
  }, [setSelectedIds])

  const handleToggleVisibility = useCallback((id: string, obj: AnyCanvasObject) => {
    pushSnapshot()
    updateObject(id, { visible: !obj.visible } as any)
  }, [pushSnapshot, updateObject])

  const handleToggleLock = useCallback((id: string, obj: AnyCanvasObject) => {
    pushSnapshot()
    updateObject(id, { locked: !obj.locked } as any)
  }, [pushSnapshot, updateObject])

  const handleDelete = useCallback((id: string) => {
    pushSnapshot()
    removeObjects([id])
  }, [pushSnapshot, removeObjects])

  const handleDragStart = useCallback((e: React.DragEvent, id: string) => {
    dragIdRef.current = id
    e.dataTransfer.effectAllowed = "move"
    e.dataTransfer.setData("text/plain", id)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, id: string) => {
    if (id === dragIdRef.current) return
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    const rect = e.currentTarget.getBoundingClientRect()
    const y = e.clientY - rect.top
    const position: "before" | "after" = y < rect.height / 2 ? "before" : "after"
    const target = { id, position }
    dropTargetRef.current = target
    setDropIndicator(target)
  }, [])

  const handleDragEnd = useCallback(() => {
    dragIdRef.current = null
    dropTargetRef.current = null
    setDropIndicator(null)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    const draggedId = e.dataTransfer.getData("text/plain")
    const target = dropTargetRef.current
    const id = dragIdRef.current
    dragIdRef.current = null
    dropTargetRef.current = null
    setDropIndicator(null)
    if (draggedId && draggedId !== targetId && target && id) {
      setTimeout(() => {
        pushSnapshot()
        reorderObject(draggedId, targetId, target.position)
      })
    }
  }, [pushSnapshot, reorderObject])

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
              {dropIndicator?.id === obj.id && dropIndicator.position === "before" && (
                <div className="h-0.5 bg-primary" />
              )}
              <div
                draggable
                className={`flex items-center gap-1 px-3 py-2 cursor-pointer hover:bg-accent transition-colors ${
                  selectedIds.has(obj.id) ? "bg-accent" : ""
                }`}
                onClick={() => handleSelect(obj.id)}
                onDragStart={(e) => handleDragStart(e, obj.id)}
                onDragOver={(e) => handleDragOver(e, obj.id)}
                onDragEnd={handleDragEnd}
                onDrop={(e) => handleDrop(e, obj.id)}
              >
                <GripVertical className="h-3 w-3 text-muted-foreground shrink-0" />
                <span className="text-xs font-mono truncate flex-1 min-w-0">{obj.name}</span>
                <div className="flex items-center gap-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
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
                    className="h-5 w-5"
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
                    className="h-5 w-5 text-destructive"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(obj.id)
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              {dropIndicator?.id === obj.id && dropIndicator.position === "after" && (
                <div className="h-0.5 bg-primary" />
              )}
              {dropIndicator?.id !== obj.id && <Separator />}
            </div>
          ))
        )}
        <div
          className="h-1"
          onDragOver={(e) => {
            if (!dragIdRef.current) return
            e.preventDefault()
          }}
          onDrop={(e) => {
            e.preventDefault()
            const draggedId = e.dataTransfer.getData("text/plain")
            dragIdRef.current = null
            dropTargetRef.current = null
            setDropIndicator(null)
            if (!draggedId || objects.length === 0) return
            const last = objects[objects.length - 1]
            if (draggedId !== last.id) {
              setTimeout(() => {
                pushSnapshot()
                reorderObject(draggedId, last.id, "after")
              })
            }
          }}
        />
      </ScrollArea>
    </div>
  )
}
