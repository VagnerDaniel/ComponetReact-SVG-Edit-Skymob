const GRID_SIZE = 20

export function GridOverlay() {
  const lines: React.ReactNode[] = []
  for (let x = 0; x < 3000; x += GRID_SIZE) {
    lines.push(
      <line
        key={`v${x}`}
        x1={x}
        y1={0}
        x2={x}
        y2={3000}
        stroke="#e0e0e0"
        strokeWidth={x % (GRID_SIZE * 5) === 0 ? 0.5 : 0.25}
      />
    )
  }
  for (let y = 0; y < 3000; y += GRID_SIZE) {
    lines.push(
      <line
        key={`h${y}`}
        x1={0}
        y1={y}
        x2={3000}
        y2={y}
        stroke="#e0e0e0"
        strokeWidth={y % (GRID_SIZE * 5) === 0 ? 0.5 : 0.25}
      />
    )
  }

  return <g pointerEvents="none">{lines}</g>
}
