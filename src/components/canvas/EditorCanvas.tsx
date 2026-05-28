import { useCallback, useRef, useState } from "react"
import {
  SvgCanvas,
  useSelection,
  useSnapping,
  SnapGuides,
  type SvgCanvasHandle,
  DEFAULT_SNAP_CONFIG,
} from "react-svg-canvas"
import type { Bounds, ResizeHandle, ToolEvent, SnapSpatialObject } from "react-svg-canvas"
import { useEditorStore } from "@/stores/editor-store"
import { useHistoryStore } from "@/stores/history-store"
import { CanvasObjectRenderer } from "./CanvasObject"
import { SelectionBox } from "./SelectionBox"
import { GridOverlay } from "./GridOverlay"
import type { LineObject, TextObject } from "@/types/canvas"

const VIEW_BOUNDS: Bounds = { x: 0, y: 0, width: 3000, height: 3000 }

export function EditorCanvas() {
  const canvasRef = useRef<SvgCanvasHandle>(null)
  const [lineStart, setLineStart] = useState<{ x: number; y: number } | null>(null)
  const [translateFrom, setTranslateFrom] = useState<((x: number, y: number) => [number, number]) | null>(null)

  const objects = useEditorStore((s) => s.objects)
  const selectedIds = useEditorStore((s) => s.selectedIds)
  const setSelectedIds = useEditorStore((s) => s.setSelectedIds)
  const clearSelection = useEditorStore((s) => s.clearSelection)
  const activeTool = useEditorStore((s) => s.activeTool)
  const setActiveTool = useEditorStore((s) => s.setActiveTool)
  const snapEnabled = useEditorStore((s) => s.snapEnabled)
  const gridEnabled = useEditorStore((s) => s.gridEnabled)
  const pushSnapshot = useHistoryStore((s) => s.pushSnapshot)

  const spatialObjects: SnapSpatialObject[] = objects.map((o) => ({
    id: o.id,
    bounds: { x: o.x, y: o.y, width: o.width, height: o.height },
    rotation: o.rotation,
  }))

  const selection = useSelection({
    objects: spatialObjects,
    onChange: (ids) => setSelectedIds(ids),
  })

  const snapping = useSnapping({
    objects: spatialObjects,
    config: { ...DEFAULT_SNAP_CONFIG, enabled: snapEnabled },
    viewBounds: VIEW_BOUNDS,
  })

  const getTopmostAtPoint = useCallback(
    (point: { x: number; y: number }) => {
      for (let i = objects.length - 1; i >= 0; i--) {
        const obj = objects[i]
        if (obj.locked) continue
        if (
          point.x >= obj.x &&
          point.x <= obj.x + obj.width &&
          point.y >= obj.y &&
          point.y <= obj.y + obj.height
        ) {
          return obj
        }
      }
      return null
    },
    [objects]
  )

  const handleToolStart = useCallback(
    (e: ToolEvent) => {
      const pt = { x: e.x, y: e.y }

      if (activeTool === "select") {
        const hit = getTopmostAtPoint(pt)
        if (hit) {
          selection.select(hit.id, e.shiftKey ?? false)
        } else {
          clearSelection()
        }
      }

      if (activeTool === "rect") {
        pushSnapshot()
        const id = crypto.randomUUID()
        useEditorStore.getState().addObject({
          id,
          type: "rect",
          x: pt.x,
          y: pt.y,
          width: 100,
          height: 80,
          rx: 0,
          ry: 0,
          fill: "#3b82f6",
          stroke: "#1d4ed8",
          strokeWidth: 2,
          rotation: 0,
          opacity: 1,
          visible: true,
          locked: false,
          name: "Rectangle",
        } as any)
        setSelectedIds(new Set([id]))
        setActiveTool("select")
      }

      if (activeTool === "ellipse") {
        pushSnapshot()
        const id = crypto.randomUUID()
        useEditorStore.getState().addObject({
          id,
          type: "ellipse",
          x: pt.x,
          y: pt.y,
          width: 100,
          height: 80,
          fill: "#10b981",
          stroke: "#047857",
          strokeWidth: 2,
          rotation: 0,
          opacity: 1,
          visible: true,
          locked: false,
          name: "Ellipse",
        } as any)
        setSelectedIds(new Set([id]))
        setActiveTool("select")
      }

      if (activeTool === "line") {
        if (!lineStart) {
          setLineStart(pt)
        } else {
          pushSnapshot()
          const id = crypto.randomUUID()
          const dx = pt.x - lineStart.x
          const dy = pt.y - lineStart.y
          useEditorStore.getState().addObject({
            id,
            type: "line",
            x: lineStart.x,
            y: lineStart.y,
            x2: pt.x,
            y2: pt.y,
            width: Math.abs(dx) || 1,
            height: Math.abs(dy) || 1,
            fill: "none",
            stroke: "#000",
            strokeWidth: 2,
            rotation: 0,
            opacity: 1,
            visible: true,
            locked: false,
            name: "Line",
          } as LineObject)
          setSelectedIds(new Set([id]))
          setLineStart(null)
          setActiveTool("select")
        }
      }

      if (activeTool === "text") {
        pushSnapshot()
        const id = crypto.randomUUID()
        useEditorStore.getState().addObject({
          id,
          type: "text",
          x: pt.x,
          y: pt.y,
          width: 120,
          height: 28,
          text: "Double-click to edit",
          fontSize: 20,
          fontFamily: "Arial, sans-serif",
          fontWeight: "normal",
          fill: "#000",
          stroke: "none",
          strokeWidth: 0,
          rotation: 0,
          opacity: 1,
          visible: true,
          locked: false,
          name: "Text",
        } as TextObject)
        setSelectedIds(new Set([id]))
        setActiveTool("select")
      }
    },
    [activeTool, getTopmostAtPoint, selection, clearSelection, pushSnapshot, setSelectedIds, setActiveTool, lineStart]
  )

  const handleResizeStart = useCallback(
    (handle: ResizeHandle, e: React.PointerEvent) => {
      e.preventDefault()
      e.stopPropagation()

      const bounds = selection.selectionBounds
      if (!bounds || !translateFrom) return

      pushSnapshot()

      const svgEl = (e.target as Element).closest("svg")
      if (!svgEl) return

      svgEl.setPointerCapture(e.pointerId)

      const startClientX = e.clientX
      const startClientY = e.clientY
      const startSvg = translateFrom(startClientX, startClientY)
      const startBounds = { ...bounds }
      const minSize = 5

      const selIds = selectedIds
      const initialBoundsMap = new Map<string, Bounds>()
      objects.forEach((o) => {
        if (selIds.has(o.id)) {
          initialBoundsMap.set(o.id, { x: o.x, y: o.y, width: o.width, height: o.height })
        }
      })
      const selectedObjectIds = Array.from(selIds)

      const onPointerMove = (ev: PointerEvent) => {
        if (!translateFrom) return
        const currentSvg = translateFrom(ev.clientX, ev.clientY)
        const dx = currentSvg[0] - startSvg[0]
        const dy = currentSvg[1] - startSvg[1]

        let newX = startBounds.x
        let newY = startBounds.y
        let newW = startBounds.width
        let newH = startBounds.height

        switch (handle) {
          case "e":
            newW = Math.max(minSize, startBounds.width + dx)
            break
          case "w":
            newX = startBounds.x + dx
            newW = Math.max(minSize, startBounds.width - dx)
            break
          case "s":
            newH = Math.max(minSize, startBounds.height + dy)
            break
          case "n":
            newY = startBounds.y + dy
            newH = Math.max(minSize, startBounds.height - dy)
            break
          case "se":
            newW = Math.max(minSize, startBounds.width + dx)
            newH = Math.max(minSize, startBounds.height + dy)
            break
          case "sw":
            newX = startBounds.x + dx
            newW = Math.max(minSize, startBounds.width - dx)
            newH = Math.max(minSize, startBounds.height + dy)
            break
          case "ne":
            newY = startBounds.y + dy
            newW = Math.max(minSize, startBounds.width + dx)
            newH = Math.max(minSize, startBounds.height - dy)
            break
          case "nw":
            newX = startBounds.x + dx
            newY = startBounds.y + dy
            newW = Math.max(minSize, startBounds.width - dx)
            newH = Math.max(minSize, startBounds.height - dy)
            break
        }

        const scaleX = startBounds.width > 0 ? newW / startBounds.width : 1
        const scaleY = startBounds.height > 0 ? newH / startBounds.height : 1

        for (const id of selectedObjectIds) {
          const initial = initialBoundsMap.get(id)
          if (!initial) continue

          const obj = objects.find((o) => o.id === id)
          if (!obj || obj.locked) continue

          const relX = initial.x - startBounds.x
          const relY = initial.y - startBounds.y

          if (obj.type === "line") {
            const line = obj as LineObject
            const newObjX = newX + relX * scaleX
            const newObjY = newY + relY * scaleY
            const newX2 = newObjX + (line.x2 - initial.x) * scaleX
            const newY2 = newObjY + (line.y2 - initial.y) * scaleY

            useEditorStore.getState().updateObject(id, {
              x: newObjX,
              y: newObjY,
              x2: newX2,
              y2: newY2,
              width: Math.abs(newX2 - newObjX) || 1,
              height: Math.abs(newY2 - newObjY) || 1,
} as Partial<LineObject>)
          } else {
            const newObjX = newX + relX * scaleX
            const newObjY = newY + relY * scaleY
            const newObjW = initial.width * scaleX
            const newObjH = initial.height * scaleY

            useEditorStore.getState().updateObject(id, {
              x: newObjX,
              y: newObjY,
              width: Math.max(minSize, newObjW),
              height: Math.max(minSize, newObjH),
            })
          }
        }
      }

      const onPointerUp = () => {
        svgEl.removeEventListener("pointermove", onPointerMove)
        svgEl.removeEventListener("pointerup", onPointerUp)
      }

      svgEl.addEventListener("pointermove", onPointerMove)
      svgEl.addEventListener("pointerup", onPointerUp)
    },
    [selection.selectionBounds, translateFrom, pushSnapshot, objects, selectedIds]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (e.dataTransfer.types.includes("application/field-key")) {
      e.preventDefault()
      e.dataTransfer.dropEffect = "copy"
    }
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      const key = e.dataTransfer.getData("application/field-key")
      if (!key || !translateFrom) return

      e.preventDefault()
      
      const rect = e.currentTarget.getBoundingClientRect()
      // client coordinates relative to the canvas container
      const localX = e.clientX - rect.left
      const localY = e.clientY - rect.top
      
      // Convert to SVG coordinates
      const [svgX, svgY] = translateFrom(localX, localY)

      pushSnapshot()
      const id = crypto.randomUUID()
      useEditorStore.getState().addObject({
        id,
        type: "text",
        x: svgX,
        y: svgY,
        width: 120,
        height: 28,
        text: "<`" + key + "`>",
        fontSize: 20,
        fontFamily: "Arial, sans-serif",
        fontWeight: "normal",
        fill: "#000",
        stroke: "none",
        strokeWidth: 0,
        rotation: 0,
        opacity: 1,
        visible: true,
        locked: false,
        name: "Campo " + key,
      } as TextObject)
      setSelectedIds(new Set([id]))
      setActiveTool("select")
    },
    [translateFrom, pushSnapshot, setSelectedIds, setActiveTool]
  )

  return (
    <div
      className="w-full h-full flex flex-col"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <SvgCanvas
        ref={canvasRef}
        className="flex-1"
        style={{ width: "100%", height: "100%", background: "#f8f9fa" }}
        onToolStart={handleToolStart}
        onContextReady={(ctx) => setTranslateFrom(() => ctx.translateFrom)}
        fixed={
          <SnapGuides
            activeSnaps={snapping.activeSnaps}
            config={DEFAULT_SNAP_CONFIG.guides}
            viewBounds={VIEW_BOUNDS}
          />
        }
      >
        {gridEnabled && <GridOverlay />}

      {lineStart && (
        <line
          x1={lineStart.x}
          y1={lineStart.y}
          x2={lineStart.x + 1}
          y2={lineStart.y + 1}
          stroke="#000"
          strokeWidth={2}
          strokeDasharray="4 2"
          opacity={0.5}
        />
      )}

      {objects
        .filter((o) => o.visible)
        .map((obj) => (
          <CanvasObjectRenderer
            key={obj.id}
            object={obj}
            isSelected={selectedIds.has(obj.id) && activeTool === "select"}
          />
        ))}

      {selection.selectionBounds && activeTool === "select" && (
          <SelectionBox
            bounds={selection.selectionBounds}
            onResizeStart={handleResizeStart}
          />
        )}
      </SvgCanvas>
    </div>
  )
}
