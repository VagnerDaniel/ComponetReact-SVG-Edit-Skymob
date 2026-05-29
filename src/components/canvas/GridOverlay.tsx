import { useEditorStore } from "@/stores/editor-store"

export function GridOverlay() {
  const rulerUnit = useEditorStore((s) => s.rulerUnit)
  
  let minorSize = 20
  let majorCount = 5
  
  if (rulerUnit === "mm" || rulerUnit === "cm") {
    minorSize = 96 / 25.4 // 1mm
    majorCount = 10 // major line every 1cm
  } else if (rulerUnit === "in") {
    minorSize = 96 / 8 // 1/8 inch
    majorCount = 8 // major line every 1 inch
  } else {
    minorSize = 20
    majorCount = 5
  }

  const lines: React.ReactNode[] = []
  
  for (let i = 0; i * minorSize <= 3000; i++) {
    const pos = i * minorSize
    const isMajor = i % majorCount === 0
    lines.push(
      <line
        key={`v${i}`}
        x1={pos}
        y1={0}
        x2={pos}
        y2={3000}
        stroke={isMajor ? "#d4d4d4" : "#e5e5e5"}
        strokeWidth={isMajor ? 0.8 : 0.3}
      />
    )
  }
  
  for (let i = 0; i * minorSize <= 3000; i++) {
    const pos = i * minorSize
    const isMajor = i % majorCount === 0
    lines.push(
      <line
        key={`h${i}`}
        x1={0}
        y1={pos}
        x2={3000}
        y2={pos}
        stroke={isMajor ? "#d4d4d4" : "#e5e5e5"}
        strokeWidth={isMajor ? 0.8 : 0.3}
      />
    )
  }

  return <g pointerEvents="none">{lines}</g>
}
