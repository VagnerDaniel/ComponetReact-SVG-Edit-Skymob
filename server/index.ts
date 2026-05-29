import express from "express"
import cors from "cors"
import { Resvg } from "@resvg/resvg-js"
import AdmZip from "adm-zip"
import { objectsToSVG, AnyCanvasObject } from "./svg-engine.js"

const app = express()
app.use(cors())
app.use(express.json({ limit: "50mb" }))

app.post("/api/generate", async (req, res) => {
  try {
    const { objects, data, format = "png" } = req.body as {
      objects: AnyCanvasObject[]
      data: Record<string, string>[]
      format?: string
    }

    if (!objects || !Array.isArray(objects)) {
      return res.status(400).json({ error: "Invalid 'objects' array" })
    }
    if (!data || !Array.isArray(data)) {
      return res.status(400).json({ error: "Invalid 'data' array" })
    }

    // Process a single item
    if (data.length === 1) {
      const svg = objectsToSVG(objects, data[0])
      
      const resvg = new Resvg(svg, {
        fitTo: { mode: "original" },
        font: { loadSystemFonts: true }
      })
      const pngData = resvg.render()
      const pngBuffer = pngData.asPng()

      res.setHeader("Content-Type", "image/png")
      res.setHeader("Content-Disposition", `attachment; filename="export.png"`)
      return res.send(pngBuffer)
    }

    // Process multiple items (Batch)
    const zip = new AdmZip()
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i]
      const svg = objectsToSVG(objects, row)
      
      const resvg = new Resvg(svg, {
        fitTo: { mode: "original" },
        font: { loadSystemFonts: true }
      })
      const pngData = resvg.render()
      const pngBuffer = pngData.asPng()

      // Give file a meaningful name based on the first key in the row, or index
      const primaryValue = Object.values(row)[0] || `item_${i + 1}`
      const filename = `${primaryValue.replace(/[^a-z0-9]/gi, "_").toLowerCase()}_${i + 1}.png`
      
      zip.addFile(filename, pngBuffer)
    }

    const zipBuffer = zip.toBuffer()
    res.setHeader("Content-Type", "application/zip")
    res.setHeader("Content-Disposition", `attachment; filename="lote_imagens.zip"`)
    return res.send(zipBuffer)
    
  } catch (error) {
    console.error("Error generating images:", error)
    res.status(500).json({ error: "Failed to generate images" })
  }
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`Backend API running on http://localhost:${PORT}`)
})
