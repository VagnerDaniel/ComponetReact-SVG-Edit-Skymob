export type ToolType = "select" | "rect" | "ellipse" | "line" | "text"

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

export interface EditorState {
  objects: AnyCanvasObject[]
  selectedIds: Set<string>
  activeTool: ToolType
  zoom: number
  snapEnabled: boolean
  gridEnabled: boolean
  clipboard: AnyCanvasObject[]
  availableFields: { key: string; label: string }[]
  previewFields: boolean
}

