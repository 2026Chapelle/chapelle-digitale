/**
 * CITADELLE PDF-1 — Baril d'exports du lecteur PDF / Flipbook.
 *
 * Point d'entrée réutilisable pour tous les contextes Citadelle. Importer
 * `PdfReaderLauncher` (déclencheur paresseux) est le cas d'usage courant :
 * il maintient pdf.js hors du bundle des pages.
 */
export { PdfReaderLauncher } from './PdfReaderLauncher'
export type { PdfReaderLauncherProps } from './PdfReaderLauncher'
export { PdfReader } from './PdfReader'
export type { PdfReaderProps } from './PdfReader'
export { PdfDocumentReader } from './PdfDocumentReader'
export type { PdfDocumentReaderProps } from './PdfDocumentReader'
