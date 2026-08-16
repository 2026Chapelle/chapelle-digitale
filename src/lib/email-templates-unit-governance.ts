import 'server-only'
import { emailLayout, escapeHtml } from '@/lib/email'

export function unitGovernanceInviteEmail(input: {
  unitName: string
  roleLabel: string
  acceptUrl: string
  expiresLabel: string
}): { subject: string; html: string; text: string } {
  const unit = escapeHtml(input.unitName)
  const role = escapeHtml(input.roleLabel)
  const subject = `Invitation — accès ${input.roleLabel} · ${input.unitName}`
  const text = `Vous êtes invité(e) en tant que ${input.roleLabel} pour « ${input.unitName} ». Lien (expire ${input.expiresLabel}) : ${input.acceptUrl}`
  const html = emailLayout({
    title: 'Invitation d’accès',
    preheader: `Invitation ${input.roleLabel}`,
    body:
      `<p style="margin:0 0 14px">Vous êtes invité(e) à rejoindre l’unité <strong>${unit}</strong> avec le rôle <strong>${role}</strong>.</p>` +
      `<p style="margin:0 0 14px">Ce lien expire le <strong>${escapeHtml(input.expiresLabel)}</strong>.</p>`,
    cta: { label: 'Accepter l’invitation', href: input.acceptUrl },
  })
  return { subject, html, text }
}
