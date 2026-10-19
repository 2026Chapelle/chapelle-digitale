import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { IS_DEMO_MODE } from '@/lib/supabase'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSessionProfile } from '@/lib/member-auth'
import { hasCompletedAllSentinellesModules, isSentinellesFormation, normalizeSentinellesEngagement } from '@/lib/formations/sentinelles'

const FORM_SLUG = 'ecole-des-sentinelles-engagement'
const SOURCE = 'ecole-des-sentinelles'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function sentinellesContext(formationId: string, userId: string) {
  const { data: formation } = await supabaseAdmin.from('formations').select('id, slug, titre').eq('id', formationId).maybeSingle()
  if (!formation || !isSentinellesFormation(formation.slug)) return null
  const [{ data: enrollment }, { data: modules }, { data: completions }] = await Promise.all([
    supabaseAdmin.from('inscriptions_formation').select('id').eq('user_id', userId).eq('formation_id', formationId).maybeSingle(),
    supabaseAdmin.from('formation_modules').select('id').eq('formation_id', formationId).eq('status', 'published'),
    supabaseAdmin.from('module_completions').select('module_id').eq('formation_id', formationId).eq('user_id', userId),
  ])
  const moduleIds = (modules || []).map((module: { id: string }) => module.id)
  const completedIds = new Set((completions || []).map((completion: { module_id: string }) => completion.module_id))
  return { formation, enrolled: !!enrollment, ready: hasCompletedAllSentinellesModules(moduleIds, completedIds) }
}

async function chapelleMember(userId: string) {
  const db = supabaseAdmin.schema('chapelle')
  const { data } = await db.from('members').select('id').eq('auth_user_id', userId).maybeSingle()
  return data?.id ? { db, memberId: data.id as string } : null
}

export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  if (IS_DEMO_MODE) return NextResponse.json({ ok: false, demo: true }, { status: 401 })
  const session = await getSessionProfile()
  if (!session) return NextResponse.json({ ok: false, message: 'Non authentifié.' }, { status: 401 })
  const { id } = await props.params
  try {
    const [context, member] = await Promise.all([sentinellesContext(id, session.uid), chapelleMember(session.uid)])
    if (!context) return NextResponse.json({ ok: false, message: 'Formation introuvable.' }, { status: 404 })
    if (!member) return NextResponse.json({ ok: true, data: { ready: false, engagement: null } })
    const { data } = await member.db.from('form_submissions')
      .select('id, payload, created_at').eq('form_slug', FORM_SLUG).eq('member_id', member.memberId)
      .order('created_at', { ascending: false }).limit(1).maybeSingle()
    return NextResponse.json({
      ok: true,
      data: { ready: context.enrolled && context.ready, engagement: data ? { declaration: data.payload?.declaration || '', engaged_at: data.created_at } : null },
    })
  } catch (error: any) {
    return NextResponse.json({ ok: false, message: error?.message || 'Erreur' }, { status: 500 })
  }
}

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  if (IS_DEMO_MODE) return NextResponse.json({ ok: false, demo: true }, { status: 401 })
  const session = await getSessionProfile()
  if (!session) return NextResponse.json({ ok: false, message: 'Non authentifié.' }, { status: 401 })
  const { id } = await props.params
  try {
    const [context, member] = await Promise.all([sentinellesContext(id, session.uid), chapelleMember(session.uid)])
    if (!context) return NextResponse.json({ ok: false, message: 'Formation introuvable.' }, { status: 404 })
    if (!context.enrolled) return NextResponse.json({ ok: false, message: 'Inscrivez-vous à cette formation avant de confirmer votre engagement.' }, { status: 403 })
    if (!context.ready) return NextResponse.json({ ok: false, message: 'Terminez les six modules avant de confirmer votre engagement.' }, { status: 403 })
    if (!member) return NextResponse.json({ ok: false, message: 'Votre identité membre n’est pas encore disponible.' }, { status: 403 })
    const engagement = normalizeSentinellesEngagement(await req.json().catch(() => ({})))
    if (!engagement) return NextResponse.json({ ok: false, message: 'Votre déclaration et votre confirmation sont requises.' }, { status: 400 })

    const { data: platform } = await member.db.from('platforms').select('id').eq('slug', 'mahanaim').maybeSingle()
    const profile = session.profile || {}
    const { data, error } = await member.db.from('form_submissions').insert({
      platform_id: platform?.id || null,
      member_id: member.memberId,
      form_slug: FORM_SLUG,
      source: SOURCE,
      email: session.email,
      payload: {
        stage: 'engagement_sentinelles', prenom: profile.prenom || '', nom: profile.nom || '', message: engagement.declaration,
        declaration: engagement.declaration, formation_id: context.formation.id, formation_slug: context.formation.slug, formation_titre: context.formation.titre,
      },
    }).select('id, created_at, payload').single()
    if (error || !data?.id) return NextResponse.json({ ok: false, message: error?.message || 'Enregistrement impossible.' }, { status: 400 })
    return NextResponse.json({ ok: true, data: { declaration: data.payload?.declaration || engagement.declaration, engaged_at: data.created_at } })
  } catch (error: any) {
    return NextResponse.json({ ok: false, message: error?.message || 'Erreur' }, { status: 500 })
  }
}
