import { useState, useRef, useEffect, useCallback } from "react"
import { Layers, Settings, Tags } from "lucide-react"
import { RightbarTab } from "./RightbarTab"
import { PropertiesPanel } from "./PropertiesPanel"
import { LayersPanel } from "./LayersPanel"
import { FieldsPanel } from "./FieldsPanel"

const STORAGE_KEY = "rightbar-width"
const MIN_WIDTH = 180
const MAX_WIDTH = 500
const DEFAULT_WIDTH = 240

const panels = [
  { id: "properties", icon: Settings, label: "Propriedades", component: PropertiesPanel },
  { id: "layers", icon: Layers, label: "dock.layers", component: LayersPanel },
  { id: "fields", icon: Tags, label: "Campos", component: FieldsPanel },
] as const

type PanelId = (typeof panels)[number]["id"]

export function Rightbar() {
  const [activePanel, setActivePanel] = useState<PanelId | "">("properties")
  const [contentWidth, setContentWidth] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved ? Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, Number(saved))) : DEFAULT_WIDTH
    } catch {
      return DEFAULT_WIDTH
    }
  })
  const [isDragging, setIsDragging] = useState(false)
  const dragRef = useRef({ startX: 0, startWidth: 0 })

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(contentWidth))
    } catch {
      /* quota exceeded */
    }
  }, [contentWidth])

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      dragRef.current = { startX: e.clientX, startWidth: contentWidth }
      setIsDragging(true)
    },
    [contentWidth]
  )

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      const delta = dragRef.current.startX - e.clientX
      const newWidth = Math.max(
        MIN_WIDTH,
        Math.min(MAX_WIDTH, dragRef.current.startWidth + delta)
      )
      setContentWidth(newWidth)
    }

    const handleMouseUp = () => setIsDragging(false)

    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)
    document.body.style.userSelect = "none"

    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
      document.body.style.userSelect = ""
    }
  }, [isDragging])

  const handleTabClick = (id: PanelId) => {
    setActivePanel((prev) => (prev === id ? "" : id))
  }

  const ActiveComponent = panels.find((p) => p.id === activePanel)?.component
  const showContent = activePanel && ActiveComponent

  return (
    <div className="flex">
      <div className="flex flex-col border-l bg-muted/30 w-10 shrink-0">
        {panels.map((panel) => (
          <RightbarTab
            key={panel.id}
            icon={panel.icon}
            label={panel.label}
            active={activePanel === panel.id}
            onClick={() => handleTabClick(panel.id)}
          />
        ))}
      </div>
      <div
        className={`w-[5px] cursor-col-resize shrink-0 transition-colors ${
          showContent
            ? "hover:bg-primary/30 active:bg-primary/50"
            : "invisible pointer-events-none"
        }`}
        onMouseDown={handleMouseDown}
      />
      <div
        className={`overflow-hidden shrink-0 ${isDragging ? "" : "transition-[width,opacity] duration-200"}`}
        style={{ width: showContent ? contentWidth : 0, opacity: showContent ? 1 : 0 }}
      >
        {showContent && (
          <aside className="border-l bg-[#fafafa] h-full" style={{ width: contentWidth }}>
            <ActiveComponent />
          </aside>
        )}
      </div>
    </div>
  )
}
