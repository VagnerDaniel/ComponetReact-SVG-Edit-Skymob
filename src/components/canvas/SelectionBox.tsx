import type { Bounds, ResizeHandle } from "react-svg-canvas"

interface Props {
  bounds: Bounds
  rotation?: number
  stroke?: string
  strokeWidth?: number
  strokeDasharray?: string
  showHandles?: boolean
  pivotX?: number
  pivotY?: number
  onResizeStart?: (handle: ResizeHandle, e: React.PointerEvent) => void
  onRotateStart?: (e: React.PointerEvent) => void
  onPivotStart?: (e: React.PointerEvent) => void
}

export function SelectionBox({
  bounds,
  rotation = 0,
  stroke = "#6366f1",
  strokeWidth: _strokeWidth = 1.5,
  strokeDasharray: _strokeDasharray = "4 2",
  showHandles = true,
  pivotX = 0.5,
  pivotY = 0.5,
  onResizeStart,
  onRotateStart,
  onPivotStart,
}: Props) {
  const handleSize = 1.5

  const centerX = bounds.x + bounds.width / 2
  const pivotSvgX = bounds.x + pivotX * bounds.width
  const pivotSvgY = bounds.y + pivotY * bounds.height

  function createHandleHandler(handle: ResizeHandle) {
    return (e: React.PointerEvent) => {
      e.stopPropagation()
      e.preventDefault()
      onResizeStart?.(handle, e)
    }
  }

  return (
    <g transform={rotation ? `rotate(${rotation} ${pivotSvgX} ${pivotSvgY})` : ""}>
      {showHandles && onPivotStart && (
        <g
          style={{ cursor: "crosshair" }}
          onPointerDown={(e) => {
            e.stopPropagation()
            e.preventDefault()
            onPivotStart(e)
          }}
        >
          <circle cx={pivotSvgX} cy={pivotSvgY} r={1} fill="white" stroke={stroke} strokeWidth={0.3} />
          <circle cx={pivotSvgX} cy={pivotSvgY} r={0.3} fill={stroke} stroke="none" />
        </g>
      )}

      {showHandles && onRotateStart && (
        <>
          <line
            x1={centerX}
            y1={bounds.y}
            x2={centerX}
            y2={bounds.y - 10}
            stroke={stroke}
            strokeWidth={0.5}
          />
          <circle
            cx={centerX}
            cy={bounds.y - 10}
            r={1}
            fill="white"
            stroke={stroke}
            strokeWidth={0.3}
            style={{ cursor: "grab" }}
            onPointerDown={(e) => {
              e.stopPropagation()
              e.preventDefault()
              onRotateStart(e)
            }}
          />
        </>
      )}

      {showHandles && (
        <>
          <rect
            x={bounds.x - handleSize / 2}
            y={bounds.y - handleSize / 2}
            width={handleSize}
            height={handleSize}
            fill="white"
            stroke={stroke}
            strokeWidth={0.5}
            style={{ cursor: "nw-resize" }}
            onPointerDown={createHandleHandler("nw")}
          />
          <rect
            x={bounds.x + bounds.width / 2 - handleSize / 2}
            y={bounds.y - handleSize / 2}
            width={handleSize}
            height={handleSize}
            fill="white"
            stroke={stroke}
            strokeWidth={0.5}
            style={{ cursor: "n-resize" }}
            onPointerDown={createHandleHandler("n")}
          />
          <rect
            x={bounds.x + bounds.width - handleSize / 2}
            y={bounds.y - handleSize / 2}
            width={handleSize}
            height={handleSize}
            fill="white"
            stroke={stroke}
            strokeWidth={0.5}
            style={{ cursor: "ne-resize" }}
            onPointerDown={createHandleHandler("ne")}
          />
          <rect
            x={bounds.x + bounds.width - handleSize / 2}
            y={bounds.y + bounds.height / 2 - handleSize / 2}
            width={handleSize}
            height={handleSize}
            fill="white"
            stroke={stroke}
            strokeWidth={0.5}
            style={{ cursor: "e-resize" }}
            onPointerDown={createHandleHandler("e")}
          />
          <rect
            x={bounds.x + bounds.width - handleSize / 2}
            y={bounds.y + bounds.height - handleSize / 2}
            width={handleSize}
            height={handleSize}
            fill="white"
            stroke={stroke}
            strokeWidth={0.5}
            style={{ cursor: "se-resize" }}
            onPointerDown={createHandleHandler("se")}
          />
          <rect
            x={bounds.x + bounds.width / 2 - handleSize / 2}
            y={bounds.y + bounds.height - handleSize / 2}
            width={handleSize}
            height={handleSize}
            fill="white"
            stroke={stroke}
            strokeWidth={0.5}
            style={{ cursor: "s-resize" }}
            onPointerDown={createHandleHandler("s")}
          />
          <rect
            x={bounds.x - handleSize / 2}
            y={bounds.y + bounds.height - handleSize / 2}
            width={handleSize}
            height={handleSize}
            fill="white"
            stroke={stroke}
            strokeWidth={0.5}
            style={{ cursor: "sw-resize" }}
            onPointerDown={createHandleHandler("sw")}
          />
          <rect
            x={bounds.x - handleSize / 2}
            y={bounds.y + bounds.height / 2 - handleSize / 2}
            width={handleSize}
            height={handleSize}
            fill="white"
            stroke={stroke}
            strokeWidth={0.5}
            style={{ cursor: "w-resize" }}
            onPointerDown={createHandleHandler("w")}
          />
        </>
      )}
    </g>
  )
}
