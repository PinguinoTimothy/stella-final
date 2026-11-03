// Opens a stored PDF and draws one page to a canvas, sized for the screen (sharp on phones, no blur).
import * as pdfjs from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

// Browsers refuse canvases that are too big (about 4096 px per side on phones, and a total pixel budget).
// A map that is too big for them comes out as a blank white page, so the drawing size is capped.
const MAX_SIDE = 4096
const MAX_AREA = 16_000_000

export async function openPdf(blob) {
  const data = await blob.arrayBuffer()
  return pdfjs.getDocument({ data }).promise
}

/**
 * Draws page `pageNo` so that it is `cssWidth` pixels wide on screen.
 * `onError(e)` runs if the page cannot be drawn, `onDone()` when it is on screen.
 * Returns a function that cancels the drawing.
 */
export function drawPage(doc, pageNo, canvas, cssWidth, onError, onDone) {
  let task = null
  let cancelled = false
  // On-screen width: a finite number, never wider than a large screen. Anything else falls back to a safe size.
  const shownWidth = Number.isFinite(cssWidth) ? Math.min(Math.max(cssWidth, 50), 4000) : 600
  const done = (async () => {
    const page = await doc.getPage(pageNo)
    if (cancelled) return
    const base = page.getViewport({ scale: 1 })
    if (!(base.width > 0 && base.height > 0)) return
    // Draw at least twice the on-screen size and let the browser scale it down: text stays sharp.
    // The size caps above still apply, so large pages cannot exhaust memory.
    const dpr = Math.min(Math.max(window.devicePixelRatio || 1, 2), 3)
    let scale = (shownWidth / base.width) * dpr
    const w = base.width * scale
    const h = base.height * scale
    const fit = Math.min(1, MAX_SIDE / w, MAX_SIDE / h, Math.sqrt(MAX_AREA / (w * h)))
    scale *= fit
    const vp = page.getViewport({ scale })
    canvas.width = Math.floor(vp.width)
    canvas.height = Math.floor(vp.height)
    canvas.style.width = shownWidth + 'px'
    canvas.style.height = Math.round((shownWidth * base.height) / base.width) + 'px'
    task = page.render({ canvasContext: canvas.getContext('2d'), viewport: vp })
    await task.promise
    if (!cancelled) onDone?.()
  })().catch((e) => {
    if (!cancelled && e?.name !== 'RenderingCancelledException') onError?.(e)
  })
  return () => {
    cancelled = true
    task?.cancel()
    return done
  }
}
