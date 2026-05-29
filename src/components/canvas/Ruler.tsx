import { useEffect, useRef, useState } from "react"

interface RulerProps {
  orientation: "horizontal" | "vertical"
  pan: number
  zoom: number
  unit: "px" | "mm" | "cm" | "in"
  onPointerDown?: (e: React.PointerEvent) => void
}

export function Ruler({ orientation, pan, zoom, unit, onPointerDown }: RulerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [, setTick] = useState(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const observer = new ResizeObserver(() => setTick(t => t + 1))
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    
    // Auto-resize for DPI scaling
    const dpr = window.devicePixelRatio || 1
    const { clientWidth, clientHeight } = canvas
    
    // Only re-allocate if size changed
    if (canvas.width !== clientWidth * dpr || canvas.height !== clientHeight * dpr) {
      canvas.width = clientWidth * dpr
      canvas.height = clientHeight * dpr
    }
    
    ctx.save()
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, clientWidth, clientHeight)
    
    ctx.fillStyle = "#64748b"
    ctx.strokeStyle = "#cbd5e1"
    ctx.lineWidth = 1
    ctx.font = "9px Inter, sans-serif"
    ctx.textBaseline = "middle"
    ctx.textAlign = orientation === "horizontal" ? "center" : "right"
    
    // Convert units to pixels
    // 1 in = 96px, 1 cm = 37.795px, 1 mm = 3.7795px
    let pixelsPerUnit = 1
    if (unit === "mm") pixelsPerUnit = 96 / 25.4
    if (unit === "cm") pixelsPerUnit = 96 / 2.54
    if (unit === "in") pixelsPerUnit = 96
    
    let step = 50 // logical units
    if (unit === "cm" || unit === "in") step = 1
    if (unit === "mm") step = 10
    
    let physicalStep = step * pixelsPerUnit * zoom
    
    // Adjust step based on zoom so it doesn't get too crowded or too sparse
    while (physicalStep < 40) {
      step *= (unit === "in" ? 2 : 10)
      physicalStep = step * pixelsPerUnit * zoom
    }
    while (physicalStep > 200 && step > (unit === "in" ? 0.25 : 1)) {
      step /= (unit === "in" ? 2 : 10)
      physicalStep = step * pixelsPerUnit * zoom
    }
    
    const subStep = step / 10
    
    const maxVal = (orientation === "horizontal" ? clientWidth : clientHeight) / zoom / pixelsPerUnit
    const startVal = -pan / zoom / pixelsPerUnit
    
    const startTick = Math.floor(startVal / subStep) * subStep
    
    ctx.beginPath()
    for (let logical = startTick; logical <= startVal + maxVal + subStep; logical += subStep) {
      const physical = Math.round((logical * pixelsPerUnit * zoom) + pan) + 0.5
      
      const isMajor = Math.abs(Math.round(logical / step) * step - logical) < (subStep / 4)
      const isMid = Math.abs(Math.round(logical / (step / 2)) * (step / 2) - logical) < (subStep / 4)
      
      if (orientation === "horizontal") {
        const tickHeight = isMajor ? 8 : isMid ? 5 : 3
        ctx.moveTo(physical, clientHeight - tickHeight)
        ctx.lineTo(physical, clientHeight)
        
        if (isMajor) {
          ctx.textAlign = "center"
          ctx.textBaseline = "top"
          const valText = Number.isInteger(logical) ? logical.toString() : logical.toFixed(2).replace(/\.00$/, "")
          ctx.fillText(valText, physical, 4)
        }
      } else {
        const tickWidth = isMajor ? 8 : isMid ? 5 : 3
        ctx.moveTo(clientWidth - tickWidth, physical)
        ctx.lineTo(clientWidth, physical)
        
        if (isMajor) {
          ctx.save()
          ctx.translate(10, physical)
          ctx.rotate(-Math.PI / 2)
          ctx.textAlign = "center"
          ctx.textBaseline = "middle"
          const valText = Number.isInteger(logical) ? logical.toString() : logical.toFixed(2).replace(/\.00$/, "")
          ctx.fillText(valText, 0, 0)
          ctx.restore()
        }
      }
    }
    ctx.stroke()
    ctx.restore()
    
  }, [pan, zoom, unit])

  return (
    <canvas 
      ref={canvasRef} 
      className={`w-full h-full bg-slate-50 ${orientation === 'horizontal' ? 'cursor-ns-resize' : 'cursor-ew-resize'}`}
      onPointerDown={onPointerDown}
    />
  )
}
