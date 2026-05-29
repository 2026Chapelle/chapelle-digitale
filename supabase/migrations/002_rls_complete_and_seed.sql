-- ============================================
-- CIER Platform — Migration 002
-- Complète les RLS manquantes + helper staff + seed de démarrage
-- Idempotent : peut être ré-appliqué sans erreur.
-- ============================================

-- --------------------------------------------
-- Helper : l'utilisateur courant est-il staff ?
-- (évite de répéter la sous-requête de rôle partout)
-- --------------------------------------------
CREATE OR REPLACE FUNCTION is_staff()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'super_admin', 'pasteur', 'berger', 'leader')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- --------------------------------------------
-- Activer RLS sur les tables qui ne l'avaient pas
-- --------------------------------------------
ALTER TABLE priants               ENABLE ROW LEVEL SECURITY;
ALTER TABLE evenements            ENABLE ROW LEVEL SECURITY;
ALTER TABLE inscriptions_evenement ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_streams          ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages_live         ENABLE ROW LEVEL SECURITY;
ALTER TABLE groupes               ENABLE ROW LEVEL SECURITY;
ALTER TABLE membres_groupe        ENABLE ROW LEVEL SECURITY;
ALTER TABLE campagnes             ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_contacts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_interactions      ENABLE ROW LEVEL SECURITY;

-- ============================================
-- DONS — (RLS était activé en 001 mais SANS policy = tout bloqué)
-- ============================================
DROP POLICY IF EXISTS "Users see own dons" ON dons;
CREATE POLICY "Users see own dons"
  ON dons FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Anyone can create a don" ON dons;
CREATE POLICY "Anyone can create a don"
  ON dons FOR INSERT WITH CHECK (true); -- dons invités autorisés (user_id peut être NULL)

DROP POLICY IF EXISTS "Staff manage dons" ON dons;
CREATE POLICY "Staff manage dons"
  ON dons FOR ALL USING (is_staff());

-- ============================================
-- RENDEZ-VOUS — (idem : RLS activé sans policy en 001)
-- ============================================
DROP POLICY IF EXISTS "Users manage own rdv" ON rendez_vous;
CREATE POLICY "Users manage own rdv"
  ON rendez_vous FOR ALL USING (auth.uid() = demandeur_id);

DROP POLICY IF EXISTS "Pasteur sees assigned rdv" ON rendez_vous;
CREATE POLICY "Pasteur sees assigned rdv"
  ON rendez_vous FOR ALL USING (auth.uid() = pasteur_id OR is_staff());

-- ============================================
-- PRIANTS — un utilisateur s'engage à prier
-- ============================================
DROP POLICY IF EXISTS "Public can count priants" ON priants;
CREATE POLICY "Public can count priants"
  ON priants FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users join prayer" ON priants;
CREATE POLICY "Users join prayer"
  ON priants FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users leave prayer" ON priants;
CREATE POLICY "Users leave prayer"
  ON priants FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- ÉVÉNEMENTS
-- ============================================
DROP POLICY IF EXISTS "Published events are public" ON evenements;
CREATE POLICY "Published events are public"
  ON evenements FOR SELECT USING (statut = 'publie' OR is_staff());

DROP POLICY IF EXISTS "Staff manage events" ON evenements;
CREATE POLICY "Staff manage events"
  ON evenements FOR ALL USING (is_staff());

DROP POLICY IF EXISTS "Users manage own event signups" ON inscriptions_evenement;
CREATE POLICY "Users manage own event signups"
  ON inscriptions_evenement FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- LIVE STREAMS + messages
-- ============================================
DROP POLICY IF EXISTS "Live streams are public" ON live_streams;
CREATE POLICY "Live streams are public"
  ON live_streams FOR SELECT USING (true);

DROP POLICY IF EXISTS "Staff manage live" ON live_streams;
CREATE POLICY "Staff manage live"
  ON live_streams FOR ALL USING (is_staff());

DROP POLICY IF EXISTS "Approved live messages are visible" ON messages_live;
CREATE POLICY "Approved live messages are visible"
  ON messages_live FOR SELECT USING (approuve = true OR auth.uid() = user_id OR is_staff());

DROP POLICY IF EXISTS "Users post live messages" ON messages_live;
CREATE POLICY "Users post live messages"
  ON messages_live FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Staff moderate live messages" ON messages_live;
CREATE POLICY "Staff moderate live messages"
  ON messages_live FOR ALL USING (is_staff());

-- ============================================
-- GROUPES / CELLULES
-- ============================================
DROP POLICY IF EXISTS "Active groups are public" ON groupes;
CREATE POLICY "Active groups are public"
  ON groupes FOR SELECT USING (statut = 'actif' OR is_staff());

DROP POLICY IF EXISTS "Staff manage groups" ON groupes;
CREATE POLICY "Staff manage groups"
  ON groupes FOR ALL USING (is_staff());

DROP POLICY IF EXISTS "Users see own memberships" ON membres_groupe;
CREATE POLICY "Users see own memberships"
  ON membres_groupe FOR SELECT USING (auth.uid() = user_id OR is_staff());

DROP POLICY IF EXISTS "Users join groups" ON membres_groupe;
CREATE POLICY "Users join groups"
  ON membres_groupe FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users leave groups" ON membres_groupe;
CREATE POLICY "Users leave groups"
  ON membres_groupe FOR DELETE USING (auth.uid() = user_id OR is_staff());

-- ============================================
-- CAMPAGNES (publiques en lecture)
-- ============================================
DROP POLICY IF EXISTS "Active campaigns are public" ON campagnes;
CREATE POLICY "Active campaigns are public"
  ON campagnes FOR SELECT USING (statut = 'active' OR is_staff());

DROP POLICY IF EXISTS "Staff manage campaigns" ON campagnes;
CREATE POLICY "Staff manage campaigns"
  ON campagnes FOR ALL USING (is_staff());

-- ============================================
-- CRM (staff uniquement)
-- ============================================
DROP POLICY IF EXISTS "Staff only crm contacts" ON crm_contacts;
CREATE POLICY "Staff only crm contacts"
  ON crm_contacts FOR ALL USING (is_staff());

DROP POLICY IF EXISTS "Staff only crm interactions" ON crm_interactions;
CREATE POLICY "Staff only crm interactions"
  ON crm_interactions FOR ALL USING (is_staff());

-- ============================================
-- SEED DE DÉMARRAGE (pour ne pas avoir une base vide après config)
-- ============================================

-- Formations publiées
INSERT INTO formations (titre, slug, description, contenu_court, instructeur_nom, plateforme_id, type, niveau, statut, duree_heures, gratuit, certifiant, objectifs, date_publication)
VALUES
  ('Fondements de la Foi', 'fondements-de-la-foi',
   'Un parcours essentiel pour bâtir une foi solide sur le roc de la Parole.',
   '7 modules pour ancrer votre marche avec Dieu.',
   'Rév. Doxa Salomon', 'cier', 'parcours', 'debutant', 'publie', 6.5, true, true,
   ARRAY['Comprendre le salut', 'Lire la Bible', 'Prier avec foi'], NOW()),
  ('École de la Prière', 'ecole-de-la-priere',
   'Apprenez à intercéder avec puissance et constance.',
   'Le secret d''une vie de prière transformée.',
   'Pasteur Intercession', 'mahanaim', 'cours', 'intermediaire', 'publie', 4.0, true, false,
   ARRAY['Bâtir une discipline', 'Intercession ciblée', 'Combat spirituel'], NOW())
ON CONFLICT (slug) DO NOTHING;

-- Demandes de prière publiques (anonymes)
INSERT INTO demandes_priere (user_nom, sujet, description, visibilite, statut, tags)
SELECT * FROM (VALUES
  ('Marie C.', 'Restauration familiale', 'Pour la réconciliation dans mon foyer.', 'public'::priere_visibilite, 'active'::priere_statut, ARRAY['Famille']),
  ('Anonyme',  'Guérison', 'Pour ma santé et celle de mes proches.', 'public'::priere_visibilite, 'active'::priere_statut, ARRAY['Santé']),
  ('Joseph M.','Direction divine', 'Sagesse pour une décision importante.', 'public'::priere_visibilite, 'active'::priere_statut, ARRAY['Spirituel'])
) AS v(user_nom, sujet, description, visibilite, statut, tags)
WHERE NOT EXISTS (SELECT 1 FROM demandes_priere WHERE sujet = v.sujet);

-- Prochain live (planifié)
INSERT INTO live_streams (titre, description, stream_url, statut, speaker_nom, plateforme_id, date_programmee)
SELECT 'Culte Royal du Dimanche', 'Adoration, Parole et présence de Dieu.', 'https://youtube.com/@cier', 'planifie', 'Rév. Doxa Salomon', 'cier', NOW() + INTERVAL '3 days'
WHERE NOT EXISTS (SELECT 1 FROM live_streams WHERE titre = 'Culte Royal du Dimanche');
