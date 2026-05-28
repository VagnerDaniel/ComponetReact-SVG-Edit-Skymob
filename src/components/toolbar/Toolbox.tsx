import {
  MousePointer2,
  Square,
  Circle,
  Minus,
  Type,
} from "lucide-react"
import { useEditorStore } from "@/stores/editor-store"
import type { ToolType } from "@/types/canvas"

const tools: { type: ToolType; icon: typeof Square; shortcut: string }[] = [
  { type: "select", icon: MousePointer2, shortcut: "V" },
  { type: "rect", icon: Square, shortcut: "R" },
  { type: "ellipse", icon: Circle, shortcut: "E" },
  { type: "line", icon: Minus, shortcut: "L" },
  { type: "text", icon: Type, shortcut: "T" },
]

export function Toolbox() {
  const activeTool = useEditorStore((s) => s.activeTool)
  const setActiveTool = useEditorStore((s) => s.setActiveTool)

  return (
    <div className="w-11 flex flex-col items-center gap-1 py-2 bg-[#f5f5f5] border-r border-border">
      {tools.map((tool) => {
        const Icon = tool.icon
        const isActive = activeTool === tool.type
        return (
          <button
            key={tool.type}
            className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-200 cursor-pointer border ${
              isActive
                ? "bg-[#0078d4]/[0.05] border-[#0078d4]/20 text-[#0078d4] shadow-sm"
                : "border-transparent text-slate-500 hover:bg-slate-200/60 hover:text-slate-900"
            }`}
            onClick={() => setActiveTool(tool.type)}
            title={`${tool.type.charAt(0).toUpperCase() + tool.type.slice(1)} (${tool.shortcut})`}
          >
            <Icon className="h-4 w-4" />
          </button>
        )
      })}
    </div>
  )
}
