'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { MessageCircle, Send, Loader2, ArrowLeft, UserCog } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { useAuth } from '@/components/providers/AuthProvider'
import toast from 'react-hot-toast'

interface Msg { id: string; sender_id: string; recipient_id: string; body: string; created_at: string }
interface Thread { with: string; last: string; date: string; unread: number; profile?: { prenom?: string; nom?: string; role?: string } | null }

const fullName = (p?: { prenom?: string; nom?: string } | null) => p ? `${p.prenom ?? ''} ${p.nom ?? ''}`.trim() || 'Contact' : 'Contact'

export default function MessagesPage() {
  const { user } = useAuth()
  const uid = user?.id
  const [threads, setThreads] = useState<Thread[]>([])
  const [responsable, setResponsable] = useState<any>(null)
  const [active, setActive] = useState<{ id: string; profile?: any } | null>(null)
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [body, setBody] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  const loadThreads = useCallback(async () => {
    try { const r = await fetch('/api/member/messages', { credentials: 'same-origin' }); const j = await r.json(); if (j.ok) { setThreads(j.data); setResponsable(j.responsable) } } catch { /* */ }
    setLoading(false)
  }, [])
  useEffect(() => { loadThreads() }, [loadThreads])

  const openThread = useCallback(async (id: string, profile?: any) => {
    setActive({ id, profile })
    try { const r = await fetch(`/api/member/messages?with=${id}`, { credentials: 'same-origin' }); const j = await r.json(); if (j.ok) { setMsgs(j.data); setActive({ id, profile: j.interlocuteur || profile }) } } catch { /* */ }
    setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  }, [])

  async function send() {
    if (!active || !body.trim()) return
    setSending(true)
    try {
      const r = await fetch('/api/member/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ recipient_id: active.id, body }) })
      const j = await r.json()
      if (j.ok) { setBody(''); await openThread(active.id, active.profile); loadThreads() } else toast.error(j.message || 'Échec')
    } catch { toast.error('Erreur réseau') }
    setSending(false)
  }

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container-royal">
        <PageHeader eyebrow="Espace Membre" title={<>Mes <span className="text-cinematic-gold">Messages</span></>} description="Échangez avec votre responsable et l'équipe pastorale." />

        <div className="grid md:grid-cols-3 gap-6">
          {/* Liste des fils */}
          <div className={`card-royal ${active ? 'hidden md:block' : ''}`}>
            {responsable && !threads.some((t) => t.with === responsable.id) && (
              <button onClick={() => openThread(responsable.id, responsable)} className="w-full mb-3 btn-gold text-xs py-2 inline-flex items-center justify-center gap-1.5"><UserCog className="w-3.5 h-3.5" /> Écrire à mon responsable</button>
            )}
            {loading ? <Loader2 className="w-5 h-5 animate-spin text-gold mx-auto" /> : threads.length === 0 && !responsable ? (
              <p className="text-xs text-pearl/40 font-inter text-center py-6">Aucune conversation. Votre responsable ou l'équipe pourra vous écrire ici.</p>
            ) : (
              <div className="space-y-1">
                {threads.map((t) => (
                  <button key={t.with} onClick={() => openThread(t.with, t.profile)} className="w-full text-left p-3 rounded-xl hover:bg-white/[0.04] transition-colors flex items-center gap-3" style={{ background: active?.id === t.with ? 'rgba(212,175,55,0.08)' : 'transparent' }}>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0" style={{ background: 'rgba(212,175,55,0.15)', color: '#D4AF37' }}>{(t.profile?.prenom?.[0] || '?')}</div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-inter text-pearl/85 truncate">{fullName(t.profile)}</p>
                      <p className="text-[11px] text-pearl/40 truncate">{t.last}</p>
                    </div>
                    {t.unread > 0 && <span className="w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center text-black bg-gold">{t.unread}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Conversation */}
          <div className={`card-royal md:col-span-2 flex flex-col ${active ? '' : 'hidden md:flex'}`} style={{ minHeight: 420 }}>
            {!active ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                <MessageCircle className="w-10 h-10 text-gold/40 mb-3" />
                <p className="text-sm text-pearl/40 font-inter">Sélectionnez une conversation.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 pb-3 border-b border-white/5 mb-3">
                  <button onClick={() => setActive(null)} className="md:hidden p-1 text-pearl/50"><ArrowLeft className="w-4 h-4" /></button>
                  <span className="font-cinzel font-bold text-pearl text-sm">{fullName(active.profile)}</span>
                </div>
                <div className="flex-1 overflow-y-auto space-y-2 pr-1" style={{ maxHeight: 360 }}>
                  {msgs.length === 0 ? <p className="text-xs text-pearl/35 font-inter text-center py-8">Démarrez la conversation.</p> : msgs.map((m) => {
                    const mine = m.sender_id === uid
                    return (
                      <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                        <div className="max-w-[75%] rounded-2xl px-3 py-2 text-sm font-inter" style={{ background: mine ? 'linear-gradient(135deg,#D4AF37,#C49A20)' : 'rgba(255,255,255,0.05)', color: mine ? '#1A0F00' : 'rgba(255,255,255,0.85)' }}>
                          <p className="whitespace-pre-wrap break-words">{m.body}</p>
                        </div>
                      </div>
                    )
                  })}
                  <div ref={endRef} />
                </div>
                <div className="flex gap-2 pt-3 border-t border-white/5 mt-3">
                  <input className="input-royal flex-1" placeholder="Votre message…" value={body} onChange={(e) => setBody(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }} />
                  <button onClick={send} disabled={sending || !body.trim()} className="btn-gold px-4 inline-flex items-center gap-1.5 disabled:opacity-50">{sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}</button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
