import { Toolbar } from "@/components/toolbar/Toolbar"
import { Toolbox } from "@/components/toolbar/Toolbox"
import { EditorCanvas } from "@/components/canvas/EditorCanvas"
import { Rightbar } from "@/components/panels/Rightbar"
import { StatusBar } from "@/components/StatusBar"
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts"

import { useEffect } from "react"
import { useEditorStore } from "@/stores/editor-store"

export interface SvgEditorProps {
  availableFields?: { key: string; label: string }[]
}

export default function App({ availableFields }: SvgEditorProps) {
  useKeyboardShortcuts()
  const setAvailableFields = useEditorStore((s) => s.setAvailableFields)

  useEffect(() => {
    if (availableFields) {
      setAvailableFields(availableFields)
    }
  }, [availableFields, setAvailableFields])

  return (
    <div className="h-screen w-screen flex flex-col bg-background overflow-hidden">
      <Toolbar />

      <div className="flex flex-1 overflow-hidden">
        <Toolbox />

        <main className="flex-1 relative">
          <EditorCanvas />
        </main>

        <Rightbar />
      </div>

      <StatusBar />
    </div>
  )
}
