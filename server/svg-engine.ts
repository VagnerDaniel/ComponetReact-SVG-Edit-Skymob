import { createCanvas } from "canvas"

// -- Types (Simplified from frontend) --
export type ObjectType = "rect" | "ellipse" | "line" | "text"

export interface CanvasObject {
  id: string
  type: ObjectType
  x: number
  y: number
  width: number
  height: number
  fill: string
  stroke: string
  strokeWidth: number
  strokeDasharray?: string
  rotation: number
  opacity: number
  visible: boolean
  locked: boolean
  name: string
  pivotX?: number
  pivotY?: number
  metadata?: Record<string, string>
}

export interface RectObject extends CanvasObject {
  type: "rect"
  rx: number
  ry: number
}

export interface EllipseObject extends CanvasObject {
  type: "ellipse"
}

export interface LineObject extends CanvasObject {
  type: "line"
  x2: number
  y2: number
}

export interface TextObject extends CanvasObject {
  type: "text"
  text: string
  fontSize: number
  fontFamily: string
  fontWeight: string
  textMode?: "inline" | "box"
  bgFill?: string
  bgStroke?: string
  bgStrokeWidth?: number
  bgStrokeDasharray?: string
}

export type AnyCanvasObject = RectObject | EllipseObject | LineObject | TextObject

export type TextSegment = { type: "text"; value: string } | { type: "field"; key: string; label: string }
export interface WrappedLine { segments: TextSegment[] }

// -- Text Parsing --
export function parseText(text: string): TextSegment[] {
  const segments: TextSegment[] = []
  const regex = /<`([^`]+)`>/g
  let lastIndex = 0
  let match

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: "text", value: text.substring(lastIndex, match.index) })
    }
    segments.push({ type: "field", key: match[1], label: match[1] })
    lastIndex = regex.lastIndex
  }

  if (lastIndex < text.length) {
    segments.push({ type: "text", value: text.substring(lastIndex) })
  }

  return segments
}

// -- Text Measurement (Node Canvas) --
let canvasCtx: ReturnType<typeof createCanvas>["getContext"] | null = null

export function measureTextWidth(text: string, fontSize: number, fontFamily: string, fontWeight: string): number {
  if (!canvasCtx) {
    const canvas = createCanvas(100, 100)
    canvasCtx = canvas.getContext("2d")
  }
  canvasCtx.font = `${fontWeight} ${fontSize}px ${fontFamily}`
  return canvasCtx.measureText(text).width
}

// -- Text Wrapping --
export function wrapTextSegments(
  segments: TextSegment[],
  maxWidth: number,
  fontSize: number,
  fontFamily: string,
  fontWeight: string,
  data?: Record<string, string>
): WrappedLine[] {
  const lines: WrappedLine[] = []
  let currentLine: TextSegment[] = []
  let currentLineWidth = 0

  const measure = (text: string) => measureTextWidth(text, fontSize, fontFamily, fontWeight)
  const spaceWidth = measure(" ")

  for (const seg of segments) {
    if (seg.type === "field") {
      const fieldText = data?.[seg.key] ?? ""
      const w = measure(fieldText)
      if (currentLineWidth + w > maxWidth && currentLine.length > 0) {
        lines.push({ segments: currentLine })
        currentLine = [{ type: "text", value: fieldText }]
        currentLineWidth = w
      } else {
        currentLine.push({ type: "text", value: fieldText })
        currentLineWidth += w
      }
    } else {
      const linesInText = seg.value.split("\n")
      for (let i = 0; i < linesInText.length; i++) {
        if (i > 0) {
          lines.push({ segments: currentLine })
          currentLine = []
          currentLineWidth = 0
        }
        
        const lineText = linesInText[i]
        if (!lineText && i < linesInText.length - 1) continue
        
        const words = lineText.split(" ")
        for (let j = 0; j < words.length; j++) {
          const word = words[j]
          const wordWidth = measure(word)
          const isFirstWordInLine = currentLine.length === 0
          
          let prefixSpace = ""
          let spacePrefixWidth = 0
          if (j > 0 || (!isFirstWordInLine && currentLine[currentLine.length - 1].type === "text")) {
            prefixSpace = " "
            spacePrefixWidth = spaceWidth
          }
          
          if (currentLineWidth + spacePrefixWidth + wordWidth > maxWidth && !isFirstWordInLine) {
            lines.push({ segments: currentLine })
            currentLine = [{ type: "text", value: word }]
            currentLineWidth = wordWidth
          } else {
            const textToAdd = prefixSpace + word
            const last = currentLine[currentLine.length - 1]
            if (last && last.type === "text") {
              last.value += textToAdd
            } else {
              currentLine.push({ type: "text", value: textToAdd })
            }
            currentLineWidth += spacePrefixWidth + wordWidth
          }
        }
      }
    }
  }
  
  if (currentLine.length > 0) {
    lines.push({ segments: currentLine })
  }
  
  return lines
}

// -- SVG Export --
function escapeXml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

function computeBoundingBox(objects: AnyCanvasObject[]) {
  if (objects.length === 0) return { x: 0, y: 0, width: 800, height: 600 }
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const obj of objects) {
    minX = Math.min(minX, obj.x)
    minY = Math.min(minY, obj.y)
    maxX = Math.max(maxX, obj.x + obj.width)
    maxY = Math.max(maxY, obj.y + obj.height)
  }
  return { x: minX, y: minY, width: maxX - minX + 20, height: maxY - minY + 20 }
}

export function objectsToSVG(objects: AnyCanvasObject[], data?: Record<string, string>): string {
  const svgParts = objects.filter(o => o.visible).map((obj) => {
    switch (obj.type) {
      case "rect": {
        const r = obj as RectObject
        const dash = r.strokeDasharray ? ` stroke-dasharray="${r.strokeDasharray}"` : ""
        return `<g transform="${r.rotation ? `rotate(${r.rotation} ${r.x + (r.pivotX ?? 0.5) * r.width} ${r.y + (r.pivotY ?? 0.5) * r.height})` : ''}"><rect x="${r.x}" y="${r.y}" width="${r.width}" height="${r.height}" rx="${r.rx || 0}" ry="${r.ry || 0}" fill="${r.fill}" stroke="${r.stroke}" stroke-width="${r.strokeWidth}"${dash} opacity="${r.opacity}" /></g>`
      }
      case "ellipse": {
        const e = obj as EllipseObject
        const dash = e.strokeDasharray ? ` stroke-dasharray="${e.strokeDasharray}"` : ""
        return `<g transform="${e.rotation ? `rotate(${e.rotation} ${e.x + (e.pivotX ?? 0.5) * e.width} ${e.y + (e.pivotY ?? 0.5) * e.height})` : ''}"><ellipse cx="${e.x + e.width / 2}" cy="${e.y + e.height / 2}" rx="${e.width / 2}" ry="${e.height / 2}" fill="${e.fill}" stroke="${e.stroke}" stroke-width="${e.strokeWidth}"${dash} opacity="${e.opacity}" /></g>`
      }
      case "line": {
        const l = obj as LineObject
        const dash = l.strokeDasharray ? ` stroke-dasharray="${l.strokeDasharray}"` : ""
        return `<g transform="${l.rotation ? `rotate(${l.rotation} ${l.x + (l.pivotX ?? 0.5) * l.width} ${l.y + (l.pivotY ?? 0.5) * l.height})` : ''}"><line x1="${l.x}" y1="${l.y}" x2="${l.x2}" y2="${l.y2}" stroke="${l.stroke}" stroke-width="${l.strokeWidth}"${dash} opacity="${l.opacity}" /></g>`
      }
      case "text": {
        const t = obj as TextObject
        const pivotX = t.x + (t.pivotX ?? 0.5) * t.width
        const pivotY = t.y + (t.pivotY ?? 0.5) * t.height
        const rotationTransform = t.rotation ? `rotate(${t.rotation} ${pivotX} ${pivotY})` : ""
        const bgDash = t.bgStrokeDasharray ? ` stroke-dasharray="${t.bgStrokeDasharray}"` : ""
        
        let bgRect = ""
        if (t.bgFill || t.bgStroke) {
          bgRect = `<rect x="${t.x}" y="${t.y}" width="${t.width}" height="${t.height}" fill="${t.bgFill || 'none'}" stroke="${t.bgStroke || 'none'}" stroke-width="${t.bgStrokeWidth || 0}"${bgDash} />`
        }

        const segments = parseText(t.text)
        const maxWidth = t.textMode === "box" ? t.width : Infinity
        const lines = wrapTextSegments(segments, maxWidth, t.fontSize, t.fontFamily, t.fontWeight, data)
        
        const strokeAttr = t.stroke === "none" && t.strokeWidth > 0 ? "#000000" : t.stroke
        const clipId = `clip-${t.id}`
        const clipPath = `<clipPath id="${clipId}"><rect x="${t.x}" y="${t.y}" width="${t.width}" height="${t.height}" /></clipPath>`
        
        let tspans = ""
        lines.forEach((line, lineIdx) => {
          const dy = lineIdx === 0 ? "1em" : "1.2em"
          tspans += `<tspan x="${t.x}" dy="${dy}">`
          line.segments.forEach((seg) => {
            if (seg.type === "text") {
              tspans += `<tspan xml:space="preserve">${escapeXml(seg.value)}</tspan>`
            } else if (seg.type === "field") {
              tspans += `<tspan xml:space="preserve">${escapeXml(data?.[seg.key] ?? "")}</tspan>`
            }
          })
          tspans += `</tspan>`
        })

        return `<g transform="${rotationTransform}">${clipPath}${bgRect}<text clip-path="url(#${clipId})" x="${t.x}" y="${t.y}" font-size="${t.fontSize}" font-family="${t.fontFamily}" font-weight="${t.fontWeight}" fill="${t.fill}" stroke="${strokeAttr}" stroke-width="${t.strokeWidth}" opacity="${t.opacity}" style="paint-order: stroke fill;">${tspans}</text></g>`
      }
      default:
        return ""
    }
  })

  const bbox = computeBoundingBox(objects)
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${bbox.x} ${bbox.y} ${bbox.width} ${bbox.height}" width="${bbox.width}" height="${bbox.height}">${svgParts.join("\n")}</svg>`
}
