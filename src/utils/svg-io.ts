import type { AnyCanvasObject, RectObject, EllipseObject, LineObject, TextObject } from "@/types/canvas"

export function objectsToSVG(objects: AnyCanvasObject[]): string {
  const svgParts = objects.map((obj) => {
    switch (obj.type) {
      case "rect": {
        const r = obj as RectObject
        return `<rect x="${r.x}" y="${r.y}" width="${r.width}" height="${r.height}" rx="${r.rx || 0}" ry="${r.ry || 0}" fill="${r.fill}" stroke="${r.stroke}" stroke-width="${r.strokeWidth}" opacity="${r.opacity}" />`
      }
      case "ellipse": {
        const e = obj as EllipseObject
        return `<ellipse cx="${e.x + e.width / 2}" cy="${e.y + e.height / 2}" rx="${e.width / 2}" ry="${e.height / 2}" fill="${e.fill}" stroke="${e.stroke}" stroke-width="${e.strokeWidth}" opacity="${e.opacity}" />`
      }
      case "line": {
        const l = obj as LineObject
        return `<line x1="${l.x}" y1="${l.y}" x2="${l.x2}" y2="${l.y2}" stroke="${l.stroke}" stroke-width="${l.strokeWidth}" opacity="${l.opacity}" />`
      }
      case "text": {
        const t = obj as TextObject
        return `<text x="${t.x}" y="${t.y + t.fontSize}" font-size="${t.fontSize}" font-family="${t.fontFamily}" font-weight="${t.fontWeight}" fill="${t.fill}" opacity="${t.opacity}">${escapeXml(t.text)}</text>`
      }
      default:
        return ""
    }
  })

  const bbox = computeBoundingBox(objects)
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${bbox.x} ${bbox.y} ${bbox.width} ${bbox.height}" width="${bbox.width}" height="${bbox.height}">${svgParts.join("\n")}</svg>`
}

export function svgToObjects(svgString: string): AnyCanvasObject[] {
  const parser = new DOMParser()
  const doc = parser.parseFromString(svgString, "image/svg+xml")
  const elements = doc.querySelectorAll("rect, ellipse, circle, line, text, path")
  const objects: AnyCanvasObject[] = []

  elements.forEach((el) => {
    const tag = el.tagName.toLowerCase()
    let obj: AnyCanvasObject | null = null

    switch (tag) {
      case "rect": {
        const rect = el as SVGRectElement
        obj = {
          id: crypto.randomUUID(),
          type: "rect",
          x: parseAttr(rect.getAttribute("x"), 0),
          y: parseAttr(rect.getAttribute("y"), 0),
          width: parseAttr(rect.getAttribute("width"), 100),
          height: parseAttr(rect.getAttribute("height"), 100),
          rx: parseAttr(rect.getAttribute("rx"), 0),
          ry: parseAttr(rect.getAttribute("ry"), 0),
          fill: rect.getAttribute("fill") || "#3b82f6",
          stroke: rect.getAttribute("stroke") || "none",
          strokeWidth: parseAttr(rect.getAttribute("stroke-width"), 0),
          rotation: 0,
          opacity: parseAttr(rect.getAttribute("opacity"), 1),
          visible: true,
          locked: false,
          name: "Rectangle",
        } as RectObject
        break
      }
      case "ellipse":
      case "circle": {
        const ellipse = el as SVGEllipseElement
        const cx = parseAttr(ellipse.getAttribute("cx"), 50)
        const cy = parseAttr(ellipse.getAttribute("cy"), 50)
        const rx = parseAttr(ellipse.getAttribute("rx") || ellipse.getAttribute("r"), 50)
        const ry = parseAttr(ellipse.getAttribute("ry") || ellipse.getAttribute("r"), 50)
        obj = {
          id: crypto.randomUUID(),
          type: "ellipse",
          x: cx - rx,
          y: cy - ry,
          width: rx * 2,
          height: ry * 2,
          fill: ellipse.getAttribute("fill") || "#10b981",
          stroke: ellipse.getAttribute("stroke") || "none",
          strokeWidth: parseAttr(ellipse.getAttribute("stroke-width"), 0),
          rotation: 0,
          opacity: parseAttr(ellipse.getAttribute("opacity"), 1),
          visible: true,
          locked: false,
          name: "Ellipse",
        } as EllipseObject
        break
      }
      case "line": {
        const line = el as SVGLineElement
        obj = {
          id: crypto.randomUUID(),
          type: "line",
          x: parseAttr(line.getAttribute("x1"), 0),
          y: parseAttr(line.getAttribute("y1"), 0),
          width: Math.abs(parseAttr(line.getAttribute("x2"), 100) - parseAttr(line.getAttribute("x1"), 0)),
          height: Math.abs(parseAttr(line.getAttribute("y2"), 100) - parseAttr(line.getAttribute("y1"), 0)),
          x2: parseAttr(line.getAttribute("x2"), 100),
          y2: parseAttr(line.getAttribute("y2"), 100),
          fill: "none",
          stroke: line.getAttribute("stroke") || "#000",
          strokeWidth: parseAttr(line.getAttribute("stroke-width"), 2),
          rotation: 0,
          opacity: parseAttr(line.getAttribute("opacity"), 1),
          visible: true,
          locked: false,
          name: "Line",
        } as LineObject
        break
      }
      case "text": {
        const text = el as SVGTextElement
        obj = {
          id: crypto.randomUUID(),
          type: "text",
          x: parseAttr(text.getAttribute("x"), 0),
          y: parseAttr(text.getAttribute("y"), 24) - parseAttr(text.getAttribute("font-size"), 24),
          width: 100,
          height: parseAttr(text.getAttribute("font-size"), 24),
          text: text.textContent || "Text",
          fontSize: parseAttr(text.getAttribute("font-size"), 24),
          fontFamily: text.getAttribute("font-family") || "Arial",
          fontWeight: text.getAttribute("font-weight") || "normal",
          fill: text.getAttribute("fill") || "#000",
          stroke: text.getAttribute("stroke") || "none",
          strokeWidth: parseAttr(text.getAttribute("stroke-width"), 0),
          rotation: 0,
          opacity: parseAttr(text.getAttribute("opacity"), 1),
          visible: true,
          locked: false,
          name: "Text",
        } as TextObject
        break
      }
    }

    if (obj) objects.push(obj)
  })

  return objects
}

export function downloadSVG(svgString: string, filename = "design.svg") {
  const blob = new Blob([svgString], { type: "image/svg+xml" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function downloadPNG(svgString: string, filename = "design.png") {
  const canvas = document.createElement("canvas")
  const ctx = canvas.getContext("2d")
  const img = new Image()
  const blob = new Blob([svgString], { type: "image/svg+xml" })
  const url = URL.createObjectURL(blob)

  img.onload = () => {
    canvas.width = img.width
    canvas.height = img.height
    ctx?.drawImage(img, 0, 0)
    canvas.toBlob((pngBlob) => {
      if (pngBlob) {
        const pngUrl = URL.createObjectURL(pngBlob)
        const a = document.createElement("a")
        a.href = pngUrl
        a.download = filename
        a.click()
        URL.revokeObjectURL(pngUrl)
      }
    }, "image/png")
    URL.revokeObjectURL(url)
  }
  img.src = url
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

function parseAttr(val: string | null, fallback: number): number {
  if (val === null) return fallback
  const parsed = parseFloat(val)
  return isNaN(parsed) ? fallback : parsed
}

function escapeXml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}
