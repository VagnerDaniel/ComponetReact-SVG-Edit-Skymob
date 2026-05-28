import { type LucideIcon } from "lucide-react"

interface RightbarTabProps {
  icon: LucideIcon
  label: string
  active: boolean
  onClick: () => void
}

export function RightbarTab({ icon: Icon, label, active, onClick }: RightbarTabProps) {
  return (
    <button
      title={label}
      type="button"
      onClick={onClick}
      data-active={active}
      className="flex flex-col items-center gap-1 w-10 py-3 border-b border-border/50 text-[0.8rem] text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors duration-150 relative"
    >
      <Icon className="h-4 w-4" />
      <span className="[writing-mode:vertical-lr] [text-orientation:mixed]" style={{ fontFamily: "'Google Sans Code', monospace" }}>{label}</span>
      {active && (
        <span className="absolute right-0 top-1 bottom-1 w-0.5 bg-primary rounded-full" />
      )}
    </button>
  )
}
