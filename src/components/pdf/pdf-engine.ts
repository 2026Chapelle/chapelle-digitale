'use client'
/**
 * CITADELLE PDF-1 — Accès paresseux au moteur pdf.js (pdfjs-dist).
 *
 * Le moteur PDF n'est JAMAIS dans le bundle initial : il est importé
 * dynamiquement (`await import('pdfjs-dist')`) au premier chargement d'un
 * document. Le worker est un asset LOCAL et VERSIONNÉ (bundlé par webpack via
 * `new URL(...)`), servi en same-origin — aucun CDN externe, aucune version en
 * dur. La CSP autorise `worker-src 'self' blob:`.
 *
 * Ce module est purement I/O : la logique de navigation vit dans
 * `src/lib/pdf/reader-navigation.ts` (pure, testée).
 */

// Types minimalistes de pdf.js réellement utilisés (évite de coupler l'app à
// l'ensemble des typings de pdfjs-dist).
export interface PdfPageViewport {
  width: number
  height: number
}
export interface PdfRenderTask {
  promise: Promise<void>
  cancel: () => void
}
export interface PdfTextItem {
  str: string
  transform: number[]
  width: number
  height: number
}
export interface PdfTextContent {
  items: PdfTextItem[]
  styles: Record<string, unknown>
}
export interface PdfPageProxy {
  getViewport: (params: { scale: number }) => PdfPageViewport
  render: (params: {
    canvasContext: CanvasRenderingContext2D
    viewport: PdfPageViewport
    transform?: number[]
  }) => PdfRenderTask
  /** Contenu texte de la page (couche texte sélectionnable + recherche). */
  getTextContent: () => Promise<PdfTextContent>
  cleanup: () => void
}

/** Tâche de rendu de la couche texte (renderTextLayer, pdfjs v3.11). */
export interface PdfTextLayerTask {
  promise: Promise<void>
  cancel: () => void
}

/**
 * Rend la couche texte SÉLECTIONNABLE d'une page dans `container`, alignée sur le
 * `viewport` (même échelle que le canvas). API officielle pdfjs-dist 3.11 :
 * `renderTextLayer({ textContentSource, container, viewport })`.
 */
export async function renderPdfTextLayer(params: {
  textContentSource: PdfTextContent
  container: HTMLElement
  viewport: PdfPageViewport
}): Promise<PdfTextLayerTask> {
  const pdfjs = await getPdfEngine()
  return pdfjs.renderTextLayer({
    textContentSource: params.textContentSource,
    container: params.container,
    viewport: params.viewport,
  }) as PdfTextLayerTask
}
export interface PdfDocumentProxy {
  numPages: number
  getPage: (pageNumber: number) => Promise<PdfPageProxy>
  /** Signets / table des matières (null si le PDF n'en a pas). */
  getOutline: () => Promise<unknown[] | null>
  /** Résout une destination NOMMÉE en destination explicite. */
  getDestination: (id: string) => Promise<unknown[] | null>
  /** Index 0-based d'une page depuis sa référence {num,gen}. */
  getPageIndex: (ref: { num: number; gen: number }) => Promise<number>
  cleanup: () => Promise<void> | void
  destroy: () => Promise<void> | void
}
export interface PdfLoadingTask {
  promise: Promise<PdfDocumentProxy>
  destroy: () => Promise<void> | void
}

let enginePromise: Promise<any> | null = null

/** Importe pdf.js une seule fois et configure le worker local versionné. */
export function getPdfEngine(): Promise<any> {
  if (!enginePromise) {
    enginePromise = import('pdfjs-dist').then((pdfjs) => {
      // Worker LOCAL bundlé (hash webpack), servi en same-origin. Pas de CDN.
      const workerUrl = new URL(
        'pdfjs-dist/build/pdf.worker.min.js',
        import.meta.url,
      ).toString()
      pdfjs.GlobalWorkerOptions.workerSrc = workerUrl
      return pdfjs
    })
  }
  return enginePromise
}

/**
 * Ouvre un document PDF depuis une URL. Renvoie la « loading task » pour pouvoir
 * l'annuler/détruire proprement (le hook `usePdfDocument` s'en charge).
 */
export async function openPdfDocument(src: string): Promise<PdfLoadingTask> {
  const pdfjs = await getPdfEngine()
  // withCredentials=false : les PDF actuels sont publics (bucket `media`).
  // Un accès signé/privé sera traité dans un lot ultérieur (PDF-2/3).
  return pdfjs.getDocument({ url: src, withCredentials: false }) as PdfLoadingTask
}
