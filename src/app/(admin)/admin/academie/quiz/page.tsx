'use client'
import { CmsManager } from '@/components/features/admin/CmsManager'

const STATUS = [{ value: 'published', label: 'Publié' }, { value: 'planned', label: 'À venir' }, { value: 'archived', label: 'Archivé' }]
const QUESTIONS_HINT = `[
  { "id": "q1", "question": "…", "options": ["A", "B", "C"], "correct": 1, "explication": "…" }
]`

export default function AdminAcademieQuiz() {
  return (
    <CmsManager
      apiBase="/api/admin/academy" resource="quizzes" itemLabel="quiz" previewable={false}
      statusField="status" statusColumn="status" publishedValue="published" draftValue="planned"
      eyebrow="Académie des Élus"
      title={<>Gérer les <span className="text-cinematic-gold">Quiz</span></>}
      description="Quiz officiel par module (validation automatique côté serveur). Les bonnes réponses ne sont jamais exposées aux étudiants. Requiert la migration academy poussée."
      fields={[
        { name: 'titre', label: 'Titre' },
        { name: 'module_id', label: 'Module (id)', placeholder: 'uuid du module' },
        { name: 'seuil_reussite', label: 'Seuil de réussite (%)', type: 'number', default: 70 },
        { name: 'status', label: 'Statut', type: 'select', options: STATUS, default: 'planned' },
        { name: 'questions', label: 'Questions (JSON)', type: 'json', hideInTable: true, placeholder: QUESTIONS_HINT },
      ]}
    />
  )
}
