import type { AnyCanvasObject, RectObject, EllipseObject, LineObject, TextObject } from "@/types/canvas"
import { parseText } from "@/utils/text-parser"
import { dictionary } from "@/config/dictionary"
import { useEditorStore } from "@/stores/editor-store"

interface Props {
  object: AnyCanvasObject
  isSelected: boolean
}

export function CanvasObjectRenderer({ object, isSelected }: Props) {
  const previewFields = useEditorStore((s) => s.previewFields)
  const stroke = isSelected ? "#6366f1" : object.stroke
  const strokeWidth = isSelected ? object.strokeWidth + 1 : object.strokeWidth

  switch (object.type) {
    case "rect": {
      const r = object as RectObject
      return (
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
          opacity={r.opacity}
        />
      )
    }
    case "ellipse": {
      const e = object as EllipseObject
      return (
        <ellipse
          cx={e.x + e.width / 2}
          cy={e.y + e.height / 2}
          rx={e.width / 2}
          ry={e.height / 2}
          fill={e.fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
          opacity={e.opacity}
        />
      )
    }
    case "line": {
      const l = object as LineObject
      return (
        <line
          x1={l.x}
          y1={l.y}
          x2={l.x2}
          y2={l.y2}
          stroke={stroke}
          strokeWidth={strokeWidth}
          opacity={l.opacity}
        />
      )
    }
    case "text": {
      const t = object as TextObject
      const segments = parseText(t.text, dictionary)
      return (
        <text
          x={t.x}
          y={t.y + t.fontSize}
          fontSize={t.fontSize}
          fontFamily={t.fontFamily}
          fontWeight={t.fontWeight}
          fill={t.fill}
          opacity={t.opacity}
          style={{ userSelect: "none", cursor: "default" }}
        >
          {segments.map((seg, i) =>
            seg.type === "field" ? (
              <tspan
                key={i}
                fill="#2563eb"
                style={{ textDecoration: "underline", textDecorationStyle: "dotted" }}
                data-field-key={seg.key}
              >
                {previewFields ? (t.metadata?.[seg.key] ?? "Valor de teste") : `<${"`"}${seg.label}${"`"}>`}
              </tspan>
            ) : (
              <tspan key={i}>{seg.value}</tspan>
            )
          )}
        </text>
      )
    }
    default:
      return null
  }
}
