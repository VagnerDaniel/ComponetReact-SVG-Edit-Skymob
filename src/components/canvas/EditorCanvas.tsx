import { useCallback, useEffect, useRef, useState } from "react"
import { flushSync } from "react-dom"
import {
  SvgCanvas,
  useSelection,
  useSnapping,
  SnapGuides,
  type SvgCanvasHandle,
  DEFAULT_SNAP_CONFIG,
} from "react-svg-canvas"
import type { Bounds, ResizeHandle, ToolEvent, SnapSpatialObject, RotatedBounds } from "react-svg-canvas"
import { useEditorStore } from "@/stores/editor-store"
import { useHistoryStore } from "@/stores/history-store"
import { CanvasObjectRenderer } from "./CanvasObject"
import { SelectionBox } from "./SelectionBox"
import { GridOverlay } from "./GridOverlay"
import { useHotkeys } from "react-hotkeys-hook"
import { Ruler } from "./Ruler"
import type { LineObject, TextObject } from "@/types/canvas"

const VIEW_BOUNDS: Bounds = { x: 0, y: 0, width: 3000, height: 3000 }

export function EditorCanvas() {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<SvgCanvasHandle>(null)
  const [lineStart, setLineStart] = useState<{ x: number; y: number } | null>(null)
  const [lineEnd, setLineEnd] = useState<{ x: number; y: number } | null>(null)
  // Removido translateFrom state que estava usando a função inversa (from canvas to screen) em vez de (from screen to canvas)
  const [matrix, setMatrix] = useState<[number, number, number, number, number, number]>([1, 0, 0, 1, 0, 0])
  const [draggedBounds, setDraggedBounds] = useState<RotatedBounds | null>(null)
  const [draggingGuide, setDraggingGuide] = useState<{ axis: "x" | "y"; pos: number } | null>(null)
  const [guides, setGuides] = useState<{ axis: "x" | "y"; pos: number }[]>([])

  const getCanvasCoordinates = useCallback((clientX: number, clientY: number): [number, number] => {
    const svgEl = containerRef.current?.querySelector("svg")
    if (!svgEl) return [clientX, clientY]
    
    const rect = svgEl.getBoundingClientRect()
    const localX = clientX - rect.left
    const localY = clientY - rect.top
    
    const [scale, , , , tx, ty] = matrix
    return [(localX - tx) / scale, (localY - ty) / scale]
  }, [matrix])

  const shiftHeldRef = useRef(false)
  const [editingTextId, setEditingTextId] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const availableFields = useEditorStore((s) => s.availableFields)
  const documentWidth = useEditorStore((s) => s.documentWidth)
  const documentHeight = useEditorStore((s) => s.documentHeight)
  const showRulers = useEditorStore((s) => s.showRulers)
  const rulerUnit = useEditorStore((s) => s.rulerUnit)
  const storeZoom = useEditorStore((s) => s.zoom)

  useEffect(() => {
    if (Math.abs(storeZoom - matrix[0]) > 0.001 && canvasRef.current) {
      const svgEl = containerRef.current?.querySelector("svg")
      if (svgEl) {
        const rect = svgEl.getBoundingClientRect()
        const viewCenterX = rect.width / 2
        const viewCenterY = rect.height / 2
        
        const startScale = matrix[0]
        const startCenterX = (viewCenterX - matrix[4]) / startScale
        const startCenterY = (viewCenterY - matrix[5]) / startScale
        
        const newTx = viewCenterX - startCenterX * storeZoom
        const newTy = viewCenterY - startCenterY * storeZoom
        
        canvasRef.current.setMatrix([storeZoom, 0, 0, storeZoom, newTx, newTy])
      }
    }
  }, [storeZoom, matrix])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Shift") shiftHeldRef.current = true
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Shift") shiftHeldRef.current = false
    }
    document.addEventListener("keydown", onKeyDown)
    document.addEventListener("keyup", onKeyUp)
    return () => {
      document.removeEventListener("keydown", onKeyDown)
      document.removeEventListener("keyup", onKeyUp)
    }
  }, [])

  const drawRef = useRef<{
    type: "rect" | "ellipse"
    startX: number
    startY: number
    preview: { x: number; y: number; width: number; height: number } | null
  } | null>(null)
  const [drawPreview, setDrawPreview] = useState<{
    type: "rect" | "ellipse"
    x: number
    y: number
    width: number
    height: number
  } | null>(null)
  const dragRef = useRef<{
    startX: number
    startY: number
    initialPositions: Map<string, { x: number; y: number; x2?: number; y2?: number }>
    primaryId: string
    grabPoint: { x: number; y: number }
  } | null>(null)

  const objects = useEditorStore((s) => s.objects)
  const selectedIds = useEditorStore((s) => s.selectedIds)
  const setSelectedIds = useEditorStore((s) => s.setSelectedIds)
  const clearSelection = useEditorStore((s) => s.clearSelection)
  const activeTool = useEditorStore((s) => s.activeTool)
  const setActiveTool = useEditorStore((s) => s.setActiveTool)
  const snapEnabled = useEditorStore((s) => s.snapEnabled)
  const gridEnabled = useEditorStore((s) => s.gridEnabled)
  const pushSnapshot = useHistoryStore((s) => s.pushSnapshot)

  useEffect(() => {
    if (activeTool !== "line") {
      setLineStart(null)
      setLineEnd(null)
    }
  }, [activeTool])

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

        const pivX = obj.x + (obj.pivotX ?? 0.5) * obj.width
        const pivY = obj.y + (obj.pivotY ?? 0.5) * obj.height

        let px = point.x
        let py = point.y

        if (obj.rotation) {
          const angleRad = -obj.rotation * Math.PI / 180
          const cos = Math.cos(angleRad)
          const sin = Math.sin(angleRad)
          const dx = px - pivX
          const dy = py - pivY
          px = pivX + dx * cos - dy * sin
          py = pivY + dx * sin + dy * cos
        }

        if (obj.type === "ellipse") {
          const cx = obj.x + obj.width / 2
          const cy = obj.y + obj.height / 2
          const dx = (px - cx) / (obj.width / 2)
          const dy = (py - cy) / (obj.height / 2)
          if (dx * dx + dy * dy <= 1) return obj
        } else if (
          px >= obj.x &&
          px <= obj.x + obj.width &&
          py >= obj.y &&
          py <= obj.y + obj.height
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
          pushSnapshot()

          const expectedIds = e.shiftKey
            ? (selectedIds.has(hit.id)
              ? new Set([...selectedIds].filter((id) => id !== hit.id))
              : new Set([...selectedIds, hit.id]))
            : new Set([hit.id])

          const initialPositions = new Map<string, { x: number; y: number; x2?: number; y2?: number }>()
          for (const id of expectedIds) {
            const obj = objects.find((o) => o.id === id)
            if (obj && !obj.locked) {
              initialPositions.set(id, {
                x: obj.x,
                y: obj.y,
                ...(obj.type === "line" ? { x2: (obj as LineObject).x2, y2: (obj as LineObject).y2 } : {}),
              })
            }
          }
          const hitObj = objects.find((o) => o.id === hit.id)
          const grabPoint = hitObj ? {
            x: (pt.x - hitObj.x) / hitObj.width,
            y: (pt.y - hitObj.y) / hitObj.height,
          } : { x: 0.5, y: 0.5 }
          dragRef.current = { startX: pt.x, startY: pt.y, initialPositions, primaryId: hit.id, grabPoint }
        } else {
          selection.clear()
        }
        return
      }

      if (activeTool === "rect" || activeTool === "ellipse" || activeTool === "text") {
        if (activeTool === "text") {
          const hit = getTopmostAtPoint(pt)
          if (hit && hit.type === "text") {
            setEditingTextId(hit.id)
            setActiveTool("select")
            return
          }
        }
        drawRef.current = { type: activeTool, startX: pt.x, startY: pt.y, preview: null }
        return
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
          setLineEnd(null)
          setActiveTool("select")
        }
      }


    },
    [activeTool, getTopmostAtPoint, selection, clearSelection, pushSnapshot, setSelectedIds, setActiveTool, lineStart]
  )

  const handleToolMove = useCallback((e: ToolEvent) => {
    if (drawRef.current) {
      const { startX, startY } = drawRef.current
      let x = startX
      let y = startY
      let w = e.x - startX
      let h = e.y - startY

      if (w < 0) { x = e.x; w = -w }
      if (h < 0) { y = e.y; h = -h }

      if (shiftHeldRef.current) {
        const size = Math.max(w, h)
        w = size
        h = size
      }

      const preview = { x, y, width: Math.max(5, w), height: Math.max(5, h) }
      drawRef.current = { ...drawRef.current, preview }
      setDrawPreview({ type: drawRef.current.type as "rect" | "ellipse", ...preview })
      return
    }

    if (lineStart) {
      setLineEnd({ x: e.x, y: e.y })
      return
    }

    if (!dragRef.current) return
    const { startX, startY, initialPositions, primaryId, grabPoint } = dragRef.current
    const dx = e.x - startX
    const dy = e.y - startY

    const primaryInitial = initialPositions.get(primaryId)
    if (!primaryInitial) return

    const primaryObj = useEditorStore.getState().objects.find((o) => o.id === primaryId)
    if (!primaryObj) return

    const snapResult = snapping.snapDrag({
      bounds: {
        x: primaryInitial.x + dx,
        y: primaryInitial.y + dy,
        width: primaryObj.width,
        height: primaryObj.height,
        rotation: primaryObj.rotation || 0,
      },
      objectId: primaryId,
      delta: { x: dx, y: dy },
      grabPoint,
      excludeIds: new Set(initialPositions.keys()),
    })

    const snappedDx = snapResult.position.x - primaryInitial.x
    const snappedDy = snapResult.position.y - primaryInitial.y

    flushSync(() => {
      setDraggedBounds({
        x: primaryInitial.x + snappedDx,
        y: primaryInitial.y + snappedDy,
        width: primaryObj.width,
        height: primaryObj.height,
        rotation: primaryObj.rotation || 0,
      })
    })

    for (const [id, pos] of initialPositions) {
      const obj = useEditorStore.getState().objects.find((o) => o.id === id)
      if (!obj || obj.locked) continue

      if (obj.type === "line" && pos.x2 !== undefined && pos.y2 !== undefined) {
        useEditorStore.getState().updateObject(id, {
          x: pos.x + snappedDx,
          y: pos.y + snappedDy,
          x2: pos.x2 + snappedDx,
          y2: pos.y2 + snappedDy,
        } as Partial<LineObject>)
      } else {
        useEditorStore.getState().updateObject(id, {
          x: pos.x + snappedDx,
          y: pos.y + snappedDy,
        })
      }
    }
  }, [snapping, lineStart])

  const handleToolEnd = useCallback(() => {
    if (drawRef.current) {
      const { type, startX, startY, preview } = drawRef.current

      function createObj(x: number, y: number, w: number, h: number, isClick: boolean) {
        const id = crypto.randomUUID()
        if (type === "rect") {
          useEditorStore.getState().addObject({
            id, type: "rect",
            x, y, width: w, height: h,
            rx: 0, ry: 0,
            fill: "#3b82f6", stroke: "#1d4ed8", strokeWidth: 2,
            rotation: 0, opacity: 1, visible: true, locked: false, name: "Rectangle",
          } as any)
        } else if (type === "ellipse") {
          useEditorStore.getState().addObject({
            id, type: "ellipse",
            x, y, width: w, height: h,
            fill: "#10b981", stroke: "#047857", strokeWidth: 2,
            rotation: 0, opacity: 1, visible: true, locked: false, name: "Ellipse",
          } as any)
        } else if (type === "text") {
          useEditorStore.getState().addObject({
            id, type: "text",
            x, y, width: isClick ? 120 : w, height: isClick ? 28 : h,
            text: "Duplo-clique para editar",
            fontSize: 20,
            fontFamily: "Arial, sans-serif",
            fontWeight: "normal",
            textMode: isClick ? "inline" : "box",
            fill: "#000", stroke: "none", strokeWidth: 0,
            rotation: 0, opacity: 1, visible: true, locked: false, name: "Texto",
          } as TextObject)
          setEditingTextId(id)
        }
        setSelectedIds(new Set([id]))
      }

      if (preview && preview.width >= 5 && preview.height >= 5) {
        pushSnapshot()
        createObj(preview.x, preview.y, preview.width, preview.height, false)
        setActiveTool("select")
      } else {
        pushSnapshot()
        createObj(startX, startY, 100, 80, true)
        setActiveTool("select")
      }
      drawRef.current = null
      setDrawPreview(null)
      return
    }

    dragRef.current = null
    setDraggedBounds(null)
    snapping.clearSnaps()
  }, [snapping, pushSnapshot, setSelectedIds, setActiveTool])

  const handleResizeStart = useCallback(
    (handle: ResizeHandle, e: React.PointerEvent) => {
      e.preventDefault()
      e.stopPropagation()

      const bounds = selection.selectionBounds
      if (!bounds) return

      pushSnapshot()

      const svgEl = (e.target as Element).closest("svg")
      if (!svgEl) return

      svgEl.setPointerCapture(e.pointerId)

      const startClientX = e.clientX
      const startClientY = e.clientY
      const startSvg = getCanvasCoordinates(startClientX, startClientY)
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
        const currentSvg = getCanvasCoordinates(ev.clientX, ev.clientY)
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
    [selection.selectionBounds, pushSnapshot, objects, selectedIds, getCanvasCoordinates]
  )

  const handleRotateStart = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const store = useEditorStore.getState()
    const currentSelectedIds = store.selectedIds

    pushSnapshot()

    const svgEl = (e.target as Element).closest("svg")
    if (!svgEl) return

    const bounds = selection.selectionBounds
    if (!bounds) return

    const single = currentSelectedIds.size === 1 ? store.objects.find((o) => currentSelectedIds.has(o.id)) : null
    const boxX = single ? (single.type === "line" ? Math.min(single.x, (single as any).x2) : single.x) : 0
    const boxY = single ? (single.type === "line" ? Math.min(single.y, (single as any).y2) : single.y) : 0
    
    const pivotSvgX = single ? boxX + (single.pivotX ?? 0.5) * single.width : bounds.x + bounds.width / 2
    const pivotSvgY = single ? boxY + (single.pivotY ?? 0.5) * single.height : bounds.y + bounds.height / 2
    
    const startSvg = getCanvasCoordinates(e.clientX, e.clientY)
    const startAngle = Math.atan2(startSvg[1] - pivotSvgY, startSvg[0] - pivotSvgX)

    const initialRotations = new Map<string, number>()
    for (const id of currentSelectedIds) {
      const obj = store.objects.find((o) => o.id === id)
      if (obj) initialRotations.set(id, obj.rotation)
    }

    const onPointerMove = (ev: PointerEvent) => {
      const currentSvg = getCanvasCoordinates(ev.clientX, ev.clientY)
      const currentAngle = Math.atan2(currentSvg[1] - pivotSvgY, currentSvg[0] - pivotSvgX)
      const deltaAngle = (currentAngle - startAngle) * 180 / Math.PI

      for (const [id, initialRotation] of initialRotations) {
        useEditorStore.getState().updateObject(id, {
          rotation: ((initialRotation + deltaAngle) % 360 + 360) % 360,
        })
      }
    }

    const onPointerUp = () => {
      svgEl.removeEventListener("pointermove", onPointerMove)
      svgEl.removeEventListener("pointerup", onPointerUp)
    }

    svgEl.addEventListener("pointermove", onPointerMove)
    svgEl.addEventListener("pointerup", onPointerUp)
  }, [pushSnapshot, getCanvasCoordinates])

  const handlePivotStart = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    e.stopPropagation()
    e.preventDefault()
    pushSnapshot()

    const store = useEditorStore.getState()
    const currentSelectedIds = store.selectedIds
    const single = currentSelectedIds.size === 1 ? store.objects.find((o) => currentSelectedIds.has(o.id)) : null
    if (!single) return

    const startSvg = getCanvasCoordinates(e.clientX, e.clientY)
    const initialPivotX = single.pivotX ?? 0.5
    const initialPivotY = single.pivotY ?? 0.5
    
    // Calcula as coordenadas reais da quina superior esquerda
    const initialBoxX = single.type === "line" ? Math.min(single.x, (single as any).x2) : single.x
    const initialBoxY = single.type === "line" ? Math.min(single.y, (single as any).y2) : single.y
    
    // Pivô absoluto em coordenadas SVG globais
    const initialPivotAbsX = initialBoxX + initialPivotX * single.width
    const initialPivotAbsY = initialBoxY + initialPivotY * single.height

    const initialX = single.x
    const initialY = single.y
    const initialX2 = single.type === "line" ? (single as any).x2 : undefined
    const initialY2 = single.type === "line" ? (single as any).y2 : undefined
    
    const rotation = single.rotation || 0
    const angleRad = rotation * Math.PI / 180
    const cos = Math.cos(angleRad)
    const sin = Math.sin(angleRad)

    const onPointerMove = (ev: PointerEvent) => {
      const currentSvg = getCanvasCoordinates(ev.clientX, ev.clientY)
      
      const dxSvg = currentSvg[0] - startSvg[0]
      const dySvg = currentSvg[1] - startSvg[1]

      const dpX = dxSvg * cos + dySvg * sin
      const dpY = -dxSvg * sin + dySvg * cos

      const newX = initialX + dxSvg - dpX
      const newY = initialY + dySvg - dpY
      
      let newX2 = initialX2
      let newY2 = initialY2

      if (single.type === "line" && newX2 !== undefined && newY2 !== undefined) {
        newX2 = initialX2 + dxSvg - dpX
        newY2 = initialY2 + dySvg - dpY
      }

      const newBoxX = single.type === "line" ? Math.min(newX, newX2!) : newX
      const newBoxY = single.type === "line" ? Math.min(newY, newY2!) : newY

      const currentAbsolutePivotX = initialPivotAbsX + dxSvg
      const currentAbsolutePivotY = initialPivotAbsY + dySvg

      const px = (currentAbsolutePivotX - newBoxX) / Math.max(1, single.width)
      const py = (currentAbsolutePivotY - newBoxY) / Math.max(1, single.height)

      const updateData: any = {
        pivotX: px,
        pivotY: py,
        x: newX,
        y: newY
      }

      if (single.type === "line") {
        updateData.x2 = newX2
        updateData.y2 = newY2
      }

      useEditorStore.getState().updateObject(single.id, updateData)
    }

    const onPointerUp = () => {
      window.removeEventListener("pointermove", onPointerMove)
      window.removeEventListener("pointerup", onPointerUp)
    }

    window.addEventListener("pointermove", onPointerMove)
    window.addEventListener("pointerup", onPointerUp)
  }, [pushSnapshot, useEditorStore, matrix])

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    const pt = getCanvasCoordinates(e.clientX, e.clientY)
    const hit = getTopmostAtPoint({ x: pt[0], y: pt[1] })
    if (hit && hit.type === "text") {
      setEditingTextId(hit.id)
      setActiveTool("select")
    }
  }, [getTopmostAtPoint, setActiveTool, getCanvasCoordinates])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (e.dataTransfer.types.includes("application/field-key")) {
      e.preventDefault()
      e.dataTransfer.dropEffect = "copy"
    }
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      const key = e.dataTransfer.getData("application/field-key")
      if (!key) return

      e.preventDefault()
      
      const rect = e.currentTarget.getBoundingClientRect()
      // client coordinates relative to the canvas container
      const localX = e.clientX - rect.left
      const localY = e.clientY - rect.top
      
      // Convert
      const [svgX, svgY] = getCanvasCoordinates(e.clientX, e.clientY)

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
    [pushSnapshot, setSelectedIds, setActiveTool, getCanvasCoordinates]
  )

  const handleGuideDragStart = useCallback(
    (axis: "x" | "y", startEvent: React.PointerEvent) => {
      const containerRect = containerRef.current?.getBoundingClientRect()
      if (!containerRect) return
      
      const svgLeft = containerRect.left + (showRulers ? 24 : 0)
      const svgTop = containerRect.top + (showRulers ? 24 : 0)

      const getLogicalPos = (clientX: number, clientY: number) => {
        if (axis === "x") {
          return (clientX - svgLeft - matrix[4]) / matrix[0]
        } else {
          return (clientY - svgTop - matrix[5]) / matrix[0]
        }
      }

      const initialPos = getLogicalPos(startEvent.clientX, startEvent.clientY)
      setDraggingGuide({ axis, pos: initialPos })

      const onMove = (e: PointerEvent) => {
        setDraggingGuide({ axis, pos: getLogicalPos(e.clientX, e.clientY) })
      }

      const onUp = (e: PointerEvent) => {
        const finalPos = getLogicalPos(e.clientX, e.clientY)
        
        let shouldKeep = true
        if (axis === "x" && e.clientX - containerRect.left < 24) shouldKeep = false
        if (axis === "y" && e.clientY - containerRect.top < 24) shouldKeep = false

        if (shouldKeep) {
          setGuides((prev) => [...prev, { axis, pos: finalPos }])
        }

        setDraggingGuide(null)
        window.removeEventListener("pointermove", onMove)
        window.removeEventListener("pointerup", onUp)
      }

      window.addEventListener("pointermove", onMove)
      window.addEventListener("pointerup", onUp)
    },
    [matrix, showRulers]
  )

  return (
    <div className="w-full h-full flex flex-col relative" ref={containerRef}>
      {/* Top Ruler Container */}
      {showRulers && (
        <div className="absolute top-0 left-[24px] right-0 h-[24px] bg-slate-50 border-b border-slate-200 z-10">
          <Ruler orientation="horizontal" pan={matrix[4]} zoom={matrix[0]} unit={rulerUnit} onPointerDown={(e) => handleGuideDragStart("y", e)} />
        </div>
      )}
      
      {/* Left Ruler Container */}
      {showRulers && (
        <div className="absolute top-[24px] left-0 bottom-0 w-[24px] bg-slate-50 border-r border-slate-200 z-10">
          <Ruler orientation="vertical" pan={matrix[5]} zoom={matrix[0]} unit={rulerUnit} onPointerDown={(e) => handleGuideDragStart("x", e)} />
        </div>
      )}

      {/* Top Left Corner Square */}
      {showRulers && (
        <div className="absolute top-0 left-0 w-[24px] h-[24px] bg-slate-50 border-r border-b border-slate-200 z-20" />
      )}

      {/* Main Canvas Area */}
      <div
        className={`absolute right-0 bottom-0 ${showRulers ? 'top-[24px] left-[24px]' : 'top-0 left-0'}`}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onDoubleClick={handleDoubleClick}
      >
        <SvgCanvas
          ref={canvasRef}
          className="w-full h-full"
          style={{ background: "#f8f9fa" }}
          onToolStart={handleToolStart}
          onToolMove={handleToolMove}
          onToolEnd={handleToolEnd}
          onContextReady={(ctx) => {
            const newMatrix = [...ctx.matrix] as [number, number, number, number, number, number]
            setMatrix(newMatrix)
            if (Math.abs(newMatrix[0] - useEditorStore.getState().zoom) > 0.001) {
              useEditorStore.getState().setZoom(newMatrix[0])
            }
          }}
          fixed={
            <SnapGuides
              activeSnaps={snapping.activeSnaps}
              config={DEFAULT_SNAP_CONFIG.guides}
              viewBounds={VIEW_BOUNDS}
              draggedBounds={draggedBounds ?? undefined}
            />
          }
        >
        {/* Stage / Palco */}
        <rect
          x={0}
          y={0}
          width={documentWidth}
          height={documentHeight}
          fill="white"
          stroke="#e5e5e5"
          strokeWidth={1}
          style={{ filter: "drop-shadow(0px 4px 10px rgba(0,0,0,0.08))" }}
          pointerEvents="none"
        />

        {gridEnabled && <GridOverlay />}

      {lineStart && lineEnd && (
        <line
          x1={lineStart.x}
          y1={lineStart.y}
          x2={lineEnd.x}
          y2={lineEnd.y}
          stroke="#000"
          strokeWidth={2}
          strokeDasharray="4 2"
          opacity={0.5}
        />
      )}

      {/* Rulers Guides */}
      {guides.map((g, i) => (
        <g
          key={i}
          className={`cursor-${g.axis === 'y' ? 'ns' : 'ew'}-resize group`}
          onPointerDown={(e) => {
            e.stopPropagation()
            setGuides((prev) => prev.filter((_, idx) => idx !== i))
            handleGuideDragStart(g.axis, e)
          }}
        >
          {/* Hit area invisível grossa */}
          <line
            x1={g.axis === "y" ? -99999 : g.pos}
            y1={g.axis === "x" ? -99999 : g.pos}
            x2={g.axis === "y" ? 99999 : g.pos}
            y2={g.axis === "x" ? 99999 : g.pos}
            stroke="transparent"
            strokeWidth={10 / matrix[0]}
            pointerEvents="all"
          />
          {/* Linha visual fina */}
          <line
            x1={g.axis === "y" ? -99999 : g.pos}
            y1={g.axis === "x" ? -99999 : g.pos}
            x2={g.axis === "y" ? 99999 : g.pos}
            y2={g.axis === "x" ? 99999 : g.pos}
            stroke="#0ea5e9"
            strokeWidth={1 / matrix[0]}
            strokeDasharray={`${4 / matrix[0]} ${4 / matrix[0]}`}
            pointerEvents="none"
            className="group-hover:stroke-blue-500 group-hover:stroke-[1.5px]"
          />
        </g>
      ))}
      
      {draggingGuide && (
        <line
          x1={draggingGuide.axis === "y" ? -99999 : draggingGuide.pos}
          y1={draggingGuide.axis === "x" ? -99999 : draggingGuide.pos}
          x2={draggingGuide.axis === "y" ? 99999 : draggingGuide.pos}
          y2={draggingGuide.axis === "x" ? 99999 : draggingGuide.pos}
          stroke="#0ea5e9"
          strokeWidth={1 / matrix[0]}
          strokeDasharray={`${4 / matrix[0]} ${4 / matrix[0]}`}
          pointerEvents="none"
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

      {editingTextId && (() => {
        const t = objects.find((o) => o.id === editingTextId) as TextObject | undefined
        if (!t) return null
        const pivotX = t.x + (t.pivotX ?? 0.5) * t.width
        const pivotY = t.y + (t.pivotY ?? 0.5) * t.height
        const rotationTransform = t.rotation ? `rotate(${t.rotation} ${pivotX} ${pivotY})` : undefined

        return (
          <g transform={rotationTransform}>
            <foreignObject
              x={t.x - 4}
              y={t.y - 4}
              width={Math.max(t.width + 200, 400)}
              height={Math.max(t.height + 200, 400)}
              style={{ overflow: "visible" }}
            >
              <div className="flex flex-col gap-1 w-fit" onPointerDown={(e) => e.stopPropagation()}>
                <textarea
                  ref={textareaRef}
                  autoFocus
                defaultValue={t.text}
                onPointerDown={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  e.stopPropagation()
                  if (e.key === "Escape") setEditingTextId(null)
                }}
                onBlur={(e) => {
                  const target = e.target
                  useEditorStore.getState().updateObject(t.id, { 
                    text: target.value,
                    width: t.textMode === "box" ? t.width : Math.max(20, target.scrollWidth - 4),
                    height: Math.max(20, target.scrollHeight - 4)
                  })
                  setEditingTextId(null)
                }}
                style={{
                  width: t.textMode === "box" ? t.width + 8 : "max-content",
                  height: t.textMode === "box" ? t.height + 8 : "max-content",
                  minWidth: t.textMode === "box" ? undefined : t.width + 8,
                  minHeight: t.textMode === "box" ? undefined : t.height + 8,
                  fontSize: t.fontSize,
                  fontFamily: t.fontFamily,
                  fontWeight: t.fontWeight,
                  color: t.fill,
                  background: "white",
                  border: "2px dashed #2563eb",
                  outline: "none",
                  resize: "none",
                  padding: "2px",
                  margin: 0,
                  lineHeight: 1.2,
                  whiteSpace: t.textMode === "box" ? "pre-wrap" : "pre",
                  overflow: "hidden",
                  boxShadow: "0 0 0 2px rgba(37, 99, 235, 0.2)",
                  borderRadius: "4px"
                }}
              />
              <div 
                className="flex flex-wrap gap-1 bg-white border border-gray-300 p-1 rounded shadow-sm w-max max-w-[400px] max-h-[120px] overflow-y-auto"
                onMouseDown={(e) => e.preventDefault()} // Prevents textarea from losing focus
              >
                {(availableFields && availableFields.length > 0 ? availableFields : [
                  { key: "test-texto", label: "Texto Teste" }, 
                  { key: "test-numero", label: "Número Teste" }
                ]).map((f) => (
                  <button
                    key={f.key}
                    onClick={() => {
                      if (!textareaRef.current) return
                      const el = textareaRef.current
                      const start = el.selectionStart
                      const end = el.selectionEnd
                      const currentVal = el.value
                      const textToInsert = `<${"`"}${f.key}${"`"}>`
                      const newVal = currentVal.substring(0, start) + textToInsert + currentVal.substring(end)
                      el.value = newVal
                      useEditorStore.getState().updateObject(t.id, { text: newVal })
                      el.focus()
                      el.setSelectionRange(start + textToInsert.length, start + textToInsert.length)
                    }}
                    className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded hover:bg-blue-100 cursor-pointer"
                  >
                    +{f.label}
                  </button>
                ))}
              </div>
              </div>
            </foreignObject>
          </g>
        )
      })()}

      {drawPreview && (drawPreview.type === "rect" ? (
        <rect
          x={drawPreview.x}
          y={drawPreview.y}
          width={drawPreview.width}
          height={drawPreview.height}
          fill="#3b82f6"
          fillOpacity={0.15}
          stroke="#3b82f6"
          strokeWidth={2}
        />
      ) : (
        <ellipse
          cx={drawPreview.x + drawPreview.width / 2}
          cy={drawPreview.y + drawPreview.height / 2}
          rx={drawPreview.width / 2}
          ry={drawPreview.height / 2}
          fill="#10b981"
          fillOpacity={0.15}
          stroke="#10b981"
          strokeWidth={2}
        />
      ))}

      {selection.selectionBounds && activeTool === "select" && (() => {
        const single = selectedIds.size === 1 ? objects.find((o) => selectedIds.has(o.id)) : null
        const boxX = single ? (single.type === "line" ? Math.min(single.x, (single as any).x2) : single.x) : 0
        const boxY = single ? (single.type === "line" ? Math.min(single.y, (single as any).y2) : single.y) : 0
        
        const boxBounds = single
          ? { x: boxX, y: boxY, width: single.width, height: single.height }
          : selection.selectionBounds
        const boxRotation = single?.rotation || 0
        return (
          <SelectionBox
            bounds={boxBounds}
            rotation={boxRotation}
            pivotX={single?.pivotX}
            pivotY={single?.pivotY}
            onResizeStart={handleResizeStart}
            onRotateStart={handleRotateStart}
            onPivotStart={single && selectedIds.size === 1 ? handlePivotStart : undefined}
          />
        )
      })()}
      </SvgCanvas>
      </div>
    </div>
  )
}
