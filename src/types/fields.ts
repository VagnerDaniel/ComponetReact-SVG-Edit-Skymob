export type Dictionary = Record<string, string>

export type TextSegment =
  | { type: "text"; value: string }
  | { type: "field"; key: string; label: string }
