import type { AnyCanvasObject, RectObject, EllipseObject, LineObject, TextObject } from "@/types/canvas"
import { parseText } from "@/utils/text-parser"
import { dictionary } from "@/config/dictionary"
import { useEditorStore } from "@/stores/editor-store"
import { wrapTextSegments } from "@/utils/text-measure"

interface Props {
  object: AnyCanvasObject
  isSelected: boolean
}

export function CanvasObjectRenderer({ object, isSelected }: Props) {
  const previewFields = useEditorStore((s) => s.previewFields)
  const strokeWidth = object.strokeWidth
  const stroke = object.stroke === "none" && strokeWidth > 0 ? "#000000" : object.stroke
  const boxX = object.type === "line" ? Math.min(object.x, (object as any).x2) : object.x
  const boxY = object.type === "line" ? Math.min(object.y, (object as any).y2) : object.y
  const pivotX = boxX + (object.pivotX ?? 0.5) * object.width
  const pivotY = boxY + (object.pivotY ?? 0.5) * object.height
  const rotationTransform = object.rotation ? `rotate(${object.rotation} ${pivotX} ${pivotY})` : undefined

  switch (object.type) {
    case "rect": {
      const r = object as RectObject
      return (
        <g transform={rotationTransform}>
          <rect
            x={r.x}
            y={r.y}
            width={r.width}
            height={r.height}
            rx={r.rx}
            ry={r.ry}
            fill={r.fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeDasharray={r.strokeDasharray}
            opacity={r.opacity}
          />
        </g>
      )
    }
    case "ellipse": {
      const e = object as EllipseObject
      return (
        <g transform={rotationTransform}>
          <ellipse
            cx={e.x + e.width / 2}
            cy={e.y + e.height / 2}
            rx={e.width / 2}
            ry={e.height / 2}
            fill={e.fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeDasharray={e.strokeDasharray}
            opacity={e.opacity}
          />
        </g>
      )
    }
    case "line": {
      const l = object as LineObject
      return (
        <g transform={rotationTransform}>
          <line
            x1={l.x}
            y1={l.y}
            x2={l.x2}
            y2={l.y2}
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeDasharray={l.strokeDasharray}
            opacity={l.opacity}
          />
        </g>
      )
    }
    case "text": {
      const t = object as TextObject
      const segments = parseText(t.text, dictionary)
      const lines = wrapTextSegments(
        segments,
        t.textMode === "box" ? t.width : Infinity,
        t.fontSize,
        t.fontFamily,
        t.fontWeight,
        previewFields,
        t.metadata
      )
      const clipId = `clip-${t.id}`
      
      return (
        <g transform={rotationTransform}>
          {(t.bgFill || t.bgStroke) && (
            <rect
              x={t.x}
              y={t.y}
              width={t.width}
              height={t.height}
              fill={t.bgFill || "none"}
              stroke={t.bgStroke || "none"}
              strokeWidth={t.bgStrokeWidth || 0}
              strokeDasharray={t.bgStrokeDasharray}
            />
          )}
          {isSelected && (
            <rect 
              x={t.x} 
              y={t.y} 
              width={t.width} 
              height={t.height} 
              fill="none" 
              stroke="#9ca3af" 
              strokeWidth="1" 
              strokeDasharray="4 4" 
              opacity="0.5" 
              style={{ pointerEvents: "none" }} 
            />
          )}
          <clipPath id={clipId}>
            <rect x={t.x} y={t.y} width={t.width} height={t.height} />
          </clipPath>
          <text
            clipPath={`url(#${clipId})`}
            x={t.x}
            y={t.y}
            fontSize={t.fontSize}
            fontFamily={t.fontFamily}
            fontWeight={t.fontWeight}
            fill={t.fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
            opacity={t.opacity}
            style={{ userSelect: "none", cursor: "default", paintOrder: "stroke fill" }}
          >
            {lines.map((line, lineIdx) => (
              <tspan key={lineIdx} x={t.x} dy={lineIdx === 0 ? "1em" : "1.2em"}>
                {line.segments.map((seg, i) =>
                  seg.type === "field" ? (
                    <tspan
                      key={i}
                      fill={previewFields ? undefined : "#2563eb"}
                      style={previewFields ? undefined : { textDecoration: "underline", textDecorationStyle: "dotted" }}
                      data-field-key={seg.key}
                    >
                      {previewFields ? (t.metadata?.[seg.key] ?? "Valor de teste") : `<${"`"}${seg.label}${"`"}>`}
                    </tspan>
                  ) : (
                    <tspan key={i} xmlSpace="preserve">{seg.value}</tspan>
                  )
                )}
              </tspan>
            ))}
          </text>
        </g>
      )
    }
    default:
      return null
  }
}
