const fs = require('fs');

let c = fs.readFileSync('src/components/canvas/EditorCanvas.tsx', 'utf8');

c = c.split('\n').join('__NEWLINE__');
c = c.split('\r__NEWLINE__').join('__NEWLINE__');

// First replacement
let target1 = "  const rulerUnit = useEditorStore((s) => s.rulerUnit)";
let replacement1 = `  const rulerUnit = useEditorStore((s) => s.rulerUnit)
  const storeZoom = useEditorStore((s) => s.zoom)
  const documentWidth = useEditorStore((s) => s.documentWidth)
  const documentHeight = useEditorStore((s) => s.documentHeight)
  const fitToScreenTrigger = useEditorStore((s) => s.fitToScreenTrigger)
  const triggerFitToScreen = useEditorStore((s) => s.triggerFitToScreen)

  const DISPLAY_ZOOM_RATIO = 2.12;
  const lastAppliedStoreZoom = useRef<number>(storeZoom);
  const [isInitialized, setIsInitialized] = useState(false);`;
c = c.replace(target1, replacement1.split('\n').join('__NEWLINE__'));

// Second replacement
let target2 = `  useEffect(() => {__NEWLINE__    if (activeTool !== "line") {`;
let replacement2 = `  // Initial fit to screen on mount
  useEffect(() => {
    const timer = setTimeout(() => { triggerFitToScreen(false) }, 50)
    return () => clearTimeout(timer)
  }, [triggerFitToScreen])

  useEffect(() => {
    if (fitToScreenTrigger && canvasRef.current) {
      if (fitToScreenTrigger.animated) {
        canvasRef.current.centerOnRectAnimated(0, 0, documentWidth, documentHeight, { padding: 40, duration: 400 })
      } else {
        canvasRef.current.centerOnRect(0, 0, documentWidth, documentHeight, 40)
      }
      if (!isInitialized) setIsInitialized(true)
    }
  }, [fitToScreenTrigger, documentWidth, documentHeight, isInitialized])

  useEffect(() => {
    const targetInternalZoom = storeZoom * DISPLAY_ZOOM_RATIO
    if (canvasRef.current && Math.abs(matrix[0] - targetInternalZoom) > 0.001 && Math.abs(lastAppliedStoreZoom.current - storeZoom) > 0.001) {
      lastAppliedStoreZoom.current = storeZoom
      const m = canvasRef.current.getMatrix()
      const containerRect = containerRef.current?.getBoundingClientRect()
      if (containerRect) {
        if (selection.selectionBounds && selectedIds.size > 0) {
          const bounds = selection.selectionBounds
          const relativeX = 0.5
          const relativeY = 0.5
          const anchorLogicalX = bounds.x + bounds.width * relativeX
          const anchorLogicalY = bounds.y + bounds.height * relativeY
          const anchorPhysicalX = anchorLogicalX * m[0] + m[4]
          const anchorPhysicalY = anchorLogicalY * m[0] + m[5]
          const newTx = anchorPhysicalX - anchorLogicalX * targetInternalZoom
          const newTy = anchorPhysicalY - anchorLogicalY * targetInternalZoom
          canvasRef.current.setMatrix([targetInternalZoom, 0, 0, targetInternalZoom, newTx, newTy])
        } else {
          const cx = containerRect.width / 2
          const cy = containerRect.height / 2
          const logicalX = (cx - m[4]) / m[0]
          const logicalY = (cy - m[5]) / m[0]
          const newTx = cx - logicalX * targetInternalZoom
          const newTy = cy - logicalY * targetInternalZoom
          canvasRef.current.setMatrix([targetInternalZoom, 0, 0, targetInternalZoom, newTx, newTy])
        }
      }
    }
  }, [storeZoom, matrix, selection.selectionBounds, selectedIds])

  useEffect(() => {
    if (activeTool !== "line") {`;
c = c.replace(target2, replacement2.split('\n').join('__NEWLINE__'));

// Third replacement
let target3 = `            const newMatrix = [...ctx.matrix] as [number, number, number, number, number, number]__NEWLINE__            setMatrix(newMatrix)`;
let replacement3 = `            const newMatrix = [...ctx.matrix] as [number, number, number, number, number, number]
            setMatrix(newMatrix)
            const displayZoom = newMatrix[0] / DISPLAY_ZOOM_RATIO
            if (Math.abs(useEditorStore.getState().zoom - displayZoom) > 0.001) {
              lastAppliedStoreZoom.current = displayZoom
              useEditorStore.getState().setZoom(displayZoom)
            }`;
c = c.replace(target3, replacement3.split('\n').join('__NEWLINE__'));

// Fourth replacement
let target4 = `      {/* Main Canvas Area */}__NEWLINE__      <div__NEWLINE__        className={\`absolute right-0 bottom-0 \${showRulers ? 'top-[24px] left-[24px]' : 'top-0 left-0'}\`}`;
let replacement4 = `      {/* Main Canvas Area */}
      <div
        ref={containerRef}
        className={\`absolute right-0 bottom-0 transition-opacity duration-300 \${showRulers ? 'top-[24px] left-[24px]' : 'top-0 left-0'} \${isInitialized ? 'opacity-100' : 'opacity-0'}\`}`;
c = c.replace(target4, replacement4.split('\n').join('__NEWLINE__'));

c = c.split('__NEWLINE__').join('\n');
fs.writeFileSync('src/components/canvas/EditorCanvas.tsx', c);
console.log('done!');
