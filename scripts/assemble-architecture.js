const fs = require('fs')
const path = require('path')

const SRC = process.argv[2]
const OUT = path.join(process.cwd(), 'docs', 'architecture')

function decode(s) {
  if (typeof s !== 'string') return ''
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, '&')
}

const raw = fs.readFileSync(SRC, 'utf8')
const parsed = JSON.parse(raw)
// Le retour du workflow est sous .result
const data = parsed.result || parsed

fs.mkdirSync(path.join(OUT, 'modules'), { recursive: true })

const core = decode(data.core)
const synthesis = decode(data.synthesis)
const modules = (data.modules || []).map((m) => ({ slug: m.slug, nom: m.nom, spec: decode(m.spec) }))

const HEADER = `> Document généré le 2026-05-29 — Architecture de gestion de la Chapelle (CIER).
> 8 plateformes · Supabase · mock aujourd'hui, cible production.
> Conçu par orchestration multi-agents (core → 8 modules → synthèse).

`

// 01 — core
fs.writeFileSync(path.join(OUT, '01-core-schema.md'), `# 01 — Schéma Canonique Partagé (Core)\n\n${HEADER}${core}\n`)

// 02 — modules
const moduleLinks = []
for (const m of modules) {
  const file = `modules/${m.slug}.md`
  moduleLinks.push(`- [${m.nom}](${file})`)
  fs.writeFileSync(path.join(OUT, file), `# Module — ${m.nom}\n\n> Plateforme \`${m.slug}\` · fondée sur [le core](../01-core-schema.md).\n\n${m.spec}\n`)
}

// 03 — synthèse
fs.writeFileSync(path.join(OUT, '03-synthese.md'), `# 03 — Synthèse transverse\n\n${HEADER}${synthesis}\n`)

// 00 — index
const index = `# Architecture de gestion — La Chapelle (CIER)

${HEADER}
## Sommaire

1. [Schéma canonique partagé (Core)](01-core-schema.md) — tables transverses, membres, plateformes, rôles, tunnel d'intégration.
2. Modules par plateforme :
${moduleLinks.join('\n')}
3. [Synthèse transverse](03-synthese.md) — relations entre plateformes, matrice RBAC, dashboard admin global, KPI, tunnel d'intégration global, workflows & emails, roadmap Supabase.

## Couverture des 10 demandes
| # | Demande | Où |
|---|---------|----|
| 1 | Tables Supabase | Core (§1-6) + chaque module (§1) |
| 2 | Relations entre plateformes | Synthèse §1 |
| 3 | Parcours utilisateurs | Chaque module (§2) |
| 4 | Rôles & permissions | Core §6 + Synthèse §2 (matrice RBAC) |
| 5 | Dashboard administrateur | Synthèse §3 |
| 6 | Statistiques à suivre | Chaque module (§5) + Synthèse §4 |
| 7 | Workflows automatiques | Chaque module (§6) + Synthèse §6 |
| 8 | Déclencheurs emails | Chaque module (§7) + Synthèse §7 |
| 9 | Parcours de progression | Chaque module (§3) |
| 10 | Système d'intégration des membres | Core §5 + chaque module (§8) + Synthèse §5 |
`
fs.writeFileSync(path.join(OUT, '00-INDEX.md'), index)

// stats
const files = fs.readdirSync(OUT, { recursive: true }).filter((f) => String(f).endsWith('.md'))
let totalChars = 0
for (const f of files) totalChars += fs.statSync(path.join(OUT, String(f))).size
console.log('Fichiers écrits:', files.length)
console.log('Modules:', modules.map((m) => m.slug).join(', '))
console.log('Taille core:', core.length, 'chars | synthèse:', synthesis.length, 'chars | total docs:', totalChars, 'chars')
