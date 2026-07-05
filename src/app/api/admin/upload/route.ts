import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { randomUUID } from 'crypto'
import { supabaseAdmin, IS_DEMO_MODE } from '@/lib/supabase'

/**
 * Upload de fichiers vers Supabase Storage (bucket public `media`).
 *
 *   POST   /api/admin/upload   (multipart form-data, champ "file")
 *            → { ok, url, path, mime, size }
 *   DELETE /api/admin/upload   { path }
 *            → supprime l'objet du bucket
 *
 * Permet à l'équipe d'AJOUTER / REMPLACER / SUPPRIMER images, PDF, vidéos et
 * audio depuis le back-office, sans toucher au code. Réservé au cookie admin ;
 * écritures via la service role (bypass RLS). En démo : 400 explicite.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { isAdminRequest } from '@/lib/admin-auth'
const BUCKET = 'media'

/**
 * Sécurité upload — types AUTORISÉS uniquement (deny-by-default).
 * Chaque entrée : dossier de rangement, extension forcée (ignore l'extension
 * fournie par l'utilisateur → bloque les `.php.jpg`), plafond de taille, et
 * éventuelle signature binaire (« magic bytes ») vérifiée pour les types servis
 * en ligne (images, PDF). Le SVG est volontairement EXCLU (vecteur XSS).
 */
const MB = 1_048_576
type Allowed = { folder: string; ext: string; maxBytes: number; magic?: (b: Buffer) => boolean }

const startsWith = (b: Buffer, sig: number[]) =>
  sig.every((byte, i) => b[i] === byte)

const ALLOWED: Record<string, Allowed> = {
  // Images (magic bytes vérifiés)
  'image/jpeg': { folder: 'images', ext: 'jpg', maxBytes: 20 * MB, magic: (b) => startsWith(b, [0xff, 0xd8, 0xff]) },
  'image/png':  { folder: 'images', ext: 'png', maxBytes: 20 * MB, magic: (b) => startsWith(b, [0x89, 0x50, 0x4e, 0x47]) },
  'image/gif':  { folder: 'images', ext: 'gif', maxBytes: 20 * MB, magic: (b) => startsWith(b, [0x47, 0x49, 0x46, 0x38]) },
  'image/webp': { folder: 'images', ext: 'webp', maxBytes: 20 * MB, magic: (b) => startsWith(b, [0x52, 0x49, 0x46, 0x46]) && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50 },
  'image/avif': { folder: 'images', ext: 'avif', maxBytes: 20 * MB },
  // Documents (magic bytes : %PDF)
  'application/pdf': { folder: 'documents', ext: 'pdf', maxBytes: 50 * MB, magic: (b) => startsWith(b, [0x25, 0x50, 0x44, 0x46]) },
  // Audio (signatures trop variées → whitelist MIME + extension forcée)
  'audio/mpeg': { folder: 'audio', ext: 'mp3', maxBytes: 150 * MB },
  'audio/mp4':  { folder: 'audio', ext: 'm4a', maxBytes: 150 * MB },
  'audio/aac':  { folder: 'audio', ext: 'aac', maxBytes: 150 * MB },
  'audio/ogg':  { folder: 'audio', ext: 'ogg', maxBytes: 150 * MB },
  'audio/wav':  { folder: 'audio', ext: 'wav', maxBytes: 150 * MB },
  'audio/webm': { folder: 'audio', ext: 'weba', maxBytes: 150 * MB },
  // Vidéo
  'video/mp4':       { folder: 'videos', ext: 'mp4', maxBytes: 500 * MB },
  'video/webm':      { folder: 'videos', ext: 'webm', maxBytes: 500 * MB },
  'video/quicktime': { folder: 'videos', ext: 'mov', maxBytes: 500 * MB },
}

function guard(req: NextRequest): NextResponse | null {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ ok: false, message: 'Non autorisé.' }, { status: 401 })
  }
  return null
}

/** Base de nom sûre (sans extension : l'extension est forcée d'après le MIME). */
function safeBase(name: string): string {
  const dot = name.lastIndexOf('.')
  return (dot > 0 ? name.slice(0, dot) : name)
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // retire les accents
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60) || 'fichier'
}

export async function POST(req: NextRequest) {
  const denied = guard(req); if (denied) return denied
  if (IS_DEMO_MODE) {
    return NextResponse.json(
      { ok: false, message: 'Supabase requis pour l’upload de fichiers.' },
      { status: 400 },
    )
  }
  try {
    const form = await req.formData()
    const file = form.get('file')
    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, message: 'Aucun fichier fourni.' }, { status: 400 })
    }

    const mime = (file.type || '').toLowerCase()
    const rule = ALLOWED[mime]
    if (!rule) {
      return NextResponse.json(
        { ok: false, message: 'Type de fichier non autorisé. Acceptés : images, PDF, audio, vidéo.' },
        { status: 415 },
      )
    }
    if (file.size > rule.maxBytes) {
      return NextResponse.json(
        { ok: false, message: `Fichier trop volumineux (max ${Math.round(rule.maxBytes / MB)} Mo pour ce type).` },
        { status: 413 },
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    // Vérifie la signature binaire réelle (anti-usurpation de type MIME).
    if (rule.magic && !rule.magic(buffer)) {
      return NextResponse.json(
        { ok: false, message: 'Le contenu du fichier ne correspond pas à son type déclaré.' },
        { status: 422 },
      )
    }

    // Extension FORCÉE d'après le MIME (jamais celle fournie par l'utilisateur).
    const path = `${rule.folder}/${randomUUID().slice(0, 8)}-${safeBase(file.name)}.${rule.ext}`

    // Bucket cible : 'media' (public, défaut) ou 'media-videos' (PRIVÉ) pour les
    // vidéos internes protégées (Lot C). Le bucket privé n'est autorisé que pour
    // les fichiers vidéo.
    const wantPrivateVideo = (form.get('bucket') || '').toString() === 'media-videos' && rule.folder === 'videos'
    const targetBucket = wantPrivateVideo ? 'media-videos' : BUCKET

    const { error } = await supabaseAdmin.storage
      .from(targetBucket)
      .upload(path, buffer, { contentType: mime, upsert: false })
    if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 400 })

    if (wantPrivateVideo) {
      // Pas d'URL publique : on renvoie le CHEMIN (à stocker dans video_path) +
      // une URL signée d'aperçu (courte durée).
      const { data: signed } = await supabaseAdmin.storage.from(targetBucket).createSignedUrl(path, 7200)
      return NextResponse.json({ ok: true, bucket: targetBucket, path, url: signed?.signedUrl || null, mime, size: file.size })
    }

    const { data: pub } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path)
    return NextResponse.json({ ok: true, bucket: BUCKET, url: pub.publicUrl, path, mime, size: file.size })
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message || 'Erreur d’upload' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const denied = guard(req); if (denied) return denied
  if (IS_DEMO_MODE) {
    return NextResponse.json({ ok: false, message: 'Supabase requis.' }, { status: 400 })
  }
  try {
    const body = await req.json().catch(() => ({}))
    let path: string | undefined = body.path
    // Tolère une URL publique complète → en extrait le chemin objet.
    if (path && path.includes('/object/public/' + BUCKET + '/')) {
      path = path.split('/object/public/' + BUCKET + '/')[1]
    }
    if (!path) return NextResponse.json({ ok: false, message: 'path requis.' }, { status: 400 })
    const { error } = await supabaseAdmin.storage.from(BUCKET).remove([path])
    if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 400 })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message || 'Erreur' }, { status: 500 })
  }
}
