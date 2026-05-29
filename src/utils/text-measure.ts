let canvasCtx: CanvasRenderingContext2D | null = null

export function measureTextWidth(text: string, fontSize: number, fontFamily: string, fontWeight: string): number {
  if (typeof document === "undefined") return 0
  if (!canvasCtx) {
    const canvas = document.createElement("canvas")
    canvasCtx = canvas.getContext("2d")
  }
  if (!canvasCtx) return 0
  
  canvasCtx.font = `${fontWeight} ${fontSize}px ${fontFamily}`
  return canvasCtx.measureText(text).width
}

import type { TextSegment } from "@/types/fields"

export interface WrappedLine {
  segments: TextSegment[]
}

export function wrapTextSegments(
  segments: TextSegment[],
  maxWidth: number,
  fontSize: number,
  fontFamily: string,
  fontWeight: string,
  previewFields: boolean,
  metadata?: Record<string, string>
): WrappedLine[] {
  const lines: WrappedLine[] = []
  let currentLine: TextSegment[] = []
  let currentLineWidth = 0

  const measure = (text: string) => measureTextWidth(text, fontSize, fontFamily, fontWeight)
  const spaceWidth = measure(" ")

  for (const seg of segments) {
    if (seg.type === "field") {
      const fieldText = previewFields ? (metadata?.[seg.key] ?? "Valor de teste") : `<${seg.label}>`
      const w = measure(fieldText)
      if (currentLineWidth + w > maxWidth && currentLine.length > 0) {
        lines.push({ segments: currentLine })
        currentLine = [{ ...seg }]
        currentLineWidth = w
      } else {
        currentLine.push({ ...seg })
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
