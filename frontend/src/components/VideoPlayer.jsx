import { useRef, useState, useEffect, useCallback } from 'react'
import { API_BASE } from '../api/client'

/**
 * Renders the <video> element with a transparent <canvas> overlay on top
 * for drawing bounding boxes. Coordinates are normalized (0-1) relative
 * to the video's natural width/height so they stay correct at any
 * display size or resolution.
 *
 * IMPORTANT: the canvas only intercepts mouse events while "draw mode"
 * is ON. When it's OFF, the canvas has pointer-events: none so clicks
 * pass straight through to the native video controls (play/pause/seek).
 * Without this, the invisible canvas sitting on top of the video would
 * swallow every click meant for the play button.
 */
export default function VideoPlayer({ video, annotations, onNewBox, currentLabel }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const containerRef = useRef(null)

  const [drawing, setDrawing] = useState(false)
  const [startPt, setStartPt] = useState(null)
  const [currentPt, setCurrentPt] = useState(null)
  const [dims, setDims] = useState({ w: 0, h: 0 })
  const [drawMode, setDrawMode] = useState(false)

  const videoUrl = `${API_BASE}/media/${video.local_path.split(/[\\/]/).pop()}`

  const resizeCanvasToVideo = useCallback(() => {
    const videoEl = videoRef.current
    const canvasEl = canvasRef.current
    if (!videoEl || !canvasEl) return
    const rect = videoEl.getBoundingClientRect()
    canvasEl.width = rect.width
    canvasEl.height = rect.height
    setDims({ w: rect.width, h: rect.height })
  }, [])

  useEffect(() => {
    resizeCanvasToVideo()
    window.addEventListener('resize', resizeCanvasToVideo)
    return () => window.removeEventListener('resize', resizeCanvasToVideo)
  }, [resizeCanvasToVideo, video.id])

  // turning draw mode off mid-drag shouldn't leave a stuck box
  useEffect(() => {
    if (!drawMode) {
      setDrawing(false)
      setStartPt(null)
      setCurrentPt(null)
    }
  }, [drawMode])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const t = videoRef.current ? videoRef.current.currentTime : 0
    annotations
      .filter(a => Math.abs(a.timestamp_sec - t) < 1.5)
      .forEach(a => {
        ctx.strokeStyle = '#4f8bff'
        ctx.lineWidth = 2
        ctx.strokeRect(a.bbox_x * canvas.width, a.bbox_y * canvas.height, a.bbox_w * canvas.width, a.bbox_h * canvas.height)
        if (a.label) {
          ctx.fillStyle = 'rgba(79,139,255,0.85)'
          ctx.font = '11px sans-serif'
          ctx.fillText(a.label, a.bbox_x * canvas.width + 2, a.bbox_y * canvas.height - 4)
        }
      })

    if (drawing && startPt && currentPt) {
      ctx.strokeStyle = '#ff6b4a'
      ctx.lineWidth = 2
      ctx.setLineDash([4, 3])
      const x = Math.min(startPt.x, currentPt.x)
      const y = Math.min(startPt.y, currentPt.y)
      const w = Math.abs(currentPt.x - startPt.x)
      const h = Math.abs(currentPt.y - startPt.y)
      ctx.strokeRect(x, y, w, h)
      ctx.setLineDash([])
    }
  }, [annotations, drawing, startPt, currentPt])

  useEffect(() => { draw() }, [draw, dims])

  const getRelativePoint = (e) => {
    const rect = canvasRef.current.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  const handleMouseDown = (e) => {
    if (!drawMode) return
    setDrawing(true)
    setStartPt(getRelativePoint(e))
    setCurrentPt(getRelativePoint(e))
  }

  const handleMouseMove = (e) => {
    if (!drawMode || !drawing) return
    setCurrentPt(getRelativePoint(e))
  }

  const handleMouseUp = () => {
    if (!drawMode || !drawing || !startPt || !currentPt) { setDrawing(false); return }
    const canvas = canvasRef.current
    const x = Math.min(startPt.x, currentPt.x) / canvas.width
    const y = Math.min(startPt.y, currentPt.y) / canvas.height
    const w = Math.abs(currentPt.x - startPt.x) / canvas.width
    const h = Math.abs(currentPt.y - startPt.y) / canvas.height

    setDrawing(false)
    setStartPt(null)
    setCurrentPt(null)

    if (w < 0.01 || h < 0.01) return

    const cropCanvas = document.createElement('canvas')
    const videoEl = videoRef.current
    const scaleX = videoEl.videoWidth / canvas.width
    const scaleY = videoEl.videoHeight / canvas.height
    cropCanvas.width = w * canvas.width * scaleX
    cropCanvas.height = h * canvas.height * scaleY
    const cctx = cropCanvas.getContext('2d')
    cctx.drawImage(
      videoEl,
      x * canvas.width * scaleX, y * canvas.height * scaleY,
      cropCanvas.width, cropCanvas.height,
      0, 0, cropCanvas.width, cropCanvas.height
    )
    const cropBase64 = cropCanvas.toDataURL('image/png')

    onNewBox({
      timestamp_sec: videoEl.currentTime,
      bbox_x: x, bbox_y: y, bbox_w: w, bbox_h: h,
      label: currentLabel,
      crop_image_base64: cropBase64,
    })
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <button
          onClick={() => setDrawMode(m => !m)}
          className={`text-xs px-3 py-1.5 rounded font-medium ${
            drawMode ? 'bg-accent2 text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'
          }`}
        >
          {drawMode ? '✏️ Draw Mode: ON (click to turn off)' : '▶️ Play Mode (click to enable drawing)'}
        </button>
        <span className="text-[11px] text-white/40">
          {drawMode
            ? 'Click-drag on the video to mark a box. Video controls are disabled while this is on.'
            : 'Pause the video, then turn Draw Mode on to mark a region.'}
        </span>
      </div>

      <div ref={containerRef} className="relative w-full bg-black rounded-lg overflow-hidden select-none">
        <video
          ref={videoRef}
          src={videoUrl}
          controls
          onLoadedMetadata={resizeCanvasToVideo}
          onTimeUpdate={draw}
          className="w-full block"
        />
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0"
          style={{ pointerEvents: drawMode ? 'auto' : 'none', cursor: drawMode ? 'crosshair' : 'default' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        />
      </div>
    </div>
  )
}
