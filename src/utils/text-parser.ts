import type { Dictionary, TextSegment } from "@/types/fields"

const FIELD_REGEX = /<`([^`]+)`>/g

export function parseText(text: string, dict: Dictionary): TextSegment[] {
  const segments: TextSegment[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  FIELD_REGEX.lastIndex = 0
  while ((match = FIELD_REGEX.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: "text", value: text.slice(lastIndex, match.index) })
    }
    const key = match[1]
    segments.push({ type: "field", key, label: dict[key] ?? key })
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < text.length) {
    segments.push({ type: "text", value: text.slice(lastIndex) })
  }

  return segments
}

export function extractFieldKeys(text: string): string[] {
  const keys = new Set<string>()
  let match: RegExpExecArray | null
  FIELD_REGEX.lastIndex = 0
  while ((match = FIELD_REGEX.exec(text)) !== null) {
    keys.add(match[1])
  }
  return Array.from(keys)
}

export function insertField(text: string, key: string, cursorPos: number): string {
  return text.slice(0, cursorPos) + "<`" + key + "`>" + text.slice(cursorPos)
}
