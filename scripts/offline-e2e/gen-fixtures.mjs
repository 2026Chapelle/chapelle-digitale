#!/usr/bin/env node
/**
 * Génère des fixtures offline DÉTERMINISTES (Lot Offline 1.2).
 *
 * Produit sous tests/fixtures/offline/ :
 *   - sample.pdf  : PDF minimal valide, 1 page (application/pdf)
 *   - sample.wav  : WAV PCM 8 bits mono 1 s @ 8 kHz (audio/wav — MIME whitelisté
 *                   côté offline, décodable de façon fiable en Chromium headless)
 *   - fixtures.json : métadonnées déterministes (id, titre, mime, taille, sha256,
 *                     date fixe, autorisation)
 *
 * Aucune donnée aléatoire (checksums stables). Aucun contenu réel de membre.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..', '..')
const OUT = resolve(ROOT, 'tests', 'fixtures', 'offline')
mkdirSync(OUT, { recursive: true })

/** PDF minimal valide (1 page A4, texte « E2E OFFLINE FIXTURE »). */
function buildPdf() {
  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n',
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
    '5 0 obj\n<< /Length 66 >>\nstream\nBT /F1 24 Tf 72 760 Td (E2E OFFLINE FIXTURE) Tj ET\nendstream\nendobj\n',
  ]
  let pdf = '%PDF-1.4\n'
  const offsets = []
  for (const obj of objects) {
    offsets.push(pdf.length)
    pdf += obj
  }
  const xrefPos = pdf.length
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  for (const off of offsets) {
    pdf += String(off).padStart(10, '0') + ' 00000 n \n'
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`
  return Buffer.from(pdf, 'latin1')
}

/** WAV PCM 8 bits mono, 1 s @ 8 kHz, tonalité 440 Hz (déterministe). */
function buildWav() {
  const sampleRate = 8000
  const seconds = 1
  const n = sampleRate * seconds
  const data = Buffer.alloc(n)
  for (let i = 0; i < n; i++) {
    // 8-bit unsigned PCM, sinus 440 Hz, amplitude modérée.
    const s = Math.sin((2 * Math.PI * 440 * i) / sampleRate)
    data[i] = Math.max(0, Math.min(255, Math.round(128 + s * 100)))
  }
  const header = Buffer.alloc(44)
  header.write('RIFF', 0, 'ascii')
  header.writeUInt32LE(36 + data.length, 4)
  header.write('WAVE', 8, 'ascii')
  header.write('fmt ', 12, 'ascii')
  header.writeUInt32LE(16, 16) // PCM chunk size
  header.writeUInt16LE(1, 20) // PCM
  header.writeUInt16LE(1, 22) // mono
  header.writeUInt32LE(sampleRate, 24)
  header.writeUInt32LE(sampleRate, 28) // byte rate (1 byte/sample * rate)
  header.writeUInt16LE(1, 32) // block align
  header.writeUInt16LE(8, 34) // bits per sample
  header.write('data', 36, 'ascii')
  header.writeUInt32LE(data.length, 40)
  return Buffer.concat([header, data])
}

function sha256(buf) {
  return createHash('sha256').update(buf).digest('hex')
}

const pdf = buildPdf()
const wav = buildWav()
writeFileSync(resolve(OUT, 'sample.pdf'), pdf)
writeFileSync(resolve(OUT, 'sample.wav'), wav)

const manifest = {
  generatedBy: 'scripts/offline-e2e/gen-fixtures.mjs',
  note: 'Fixtures déterministes, 100 % factices. Aucune donnée réelle.',
  fixedDate: '2026-01-01T00:00:00.000Z',
  items: [
    {
      contentId: 'e2e-pdf-001',
      file: 'sample.pdf',
      title: 'Fixture PDF E2E',
      type: 'pdf',
      mime: 'application/pdf',
      sizeBytes: pdf.length,
      sha256: sha256(pdf),
      authorized: true,
      accessVersion: 'published:2026-01-01T00:00:00.000Z',
    },
    {
      contentId: 'e2e-audio-001',
      file: 'sample.wav',
      title: 'Fixture Audio E2E',
      type: 'audio',
      mime: 'audio/wav',
      sizeBytes: wav.length,
      sha256: sha256(wav),
      authorized: true,
      accessVersion: 'published:2026-01-01T00:00:00.000Z',
    },
  ],
}
writeFileSync(resolve(OUT, 'fixtures.json'), JSON.stringify(manifest, null, 2) + '\n')

console.log('[offline-e2e] fixtures générées :')
for (const it of manifest.items) {
  console.log(`  - ${it.file} (${it.type}, ${it.sizeBytes} o, sha256 ${it.sha256.slice(0, 12)}…)`)
}
