import type { Bounds, ResizeHandle } from "react-svg-canvas"

interface Props {
  bounds: Bounds
  rotation?: number
  stroke?: string
  strokeWidth?: number
  strokeDasharray?: string
  showHandles?: boolean
  onResizeStart?: (handle: ResizeHandle, e: React.PointerEvent) => void
}

export function SelectionBox({
  bounds,
  rotation = 0,
  stroke = "#6366f1",
  strokeWidth = 1.5,
  strokeDasharray = "4 2",
  showHandles = true,
  onResizeStart,
}: Props) {
  const handleSize = 8

  function createHandleHandler(handle: ResizeHandle) {
    return (e: React.PointerEvent) => {
      e.stopPropagation()
      e.preventDefault()
      onResizeStart?.(handle, e)
    }
  }

  return (
    <g transform={rotation ? `rotate(${rotation} ${bounds.x + bounds.width / 2} ${bounds.y + bounds.height / 2})` : ""}>
      <rect
        x={bounds.x}
        y={bounds.y}
        width={bounds.width}
        height={bounds.height}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeDasharray={strokeDasharray}
        pointerEvents="none"
      />
      {showHandles && (
        <>
          <rect
            x={bounds.x - handleSize / 2}
            y={bounds.y - handleSize / 2}
            width={handleSize}
            height={handleSize}
            fill="white"
            stroke={stroke}
            strokeWidth={1}
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
            strokeWidth={1}
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
            strokeWidth={1}
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
            strokeWidth={1}
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
            strokeWidth={1}
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
            strokeWidth={1}
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
            strokeWidth={1}
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
            strokeWidth={1}
            style={{ cursor: "w-resize" }}
            onPointerDown={createHandleHandler("w")}
          />
        </>
      )}
    </g>
  )
}
