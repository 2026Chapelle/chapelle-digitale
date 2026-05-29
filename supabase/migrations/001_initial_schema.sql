-- ============================================
-- CIER Platform — Initial Database Schema
-- ============================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- ============================================
-- ENUM TYPES
-- ============================================

CREATE TYPE user_role AS ENUM ('visiteur', 'membre', 'disciple', 'leader', 'berger', 'pasteur', 'admin', 'super_admin');
CREATE TYPE user_status AS ENUM ('actif', 'inactif', 'suspendu', 'en_attente');
CREATE TYPE membre_statut AS ENUM ('visiteur', 'nouveau_membre', 'membre_actif', 'disciple', 'leader_cellule', 'berger', 'pasteur');
CREATE TYPE formation_type AS ENUM ('cours', 'atelier', 'certification', 'parcours', 'masterclass');
CREATE TYPE formation_niveau AS ENUM ('debutant', 'intermediaire', 'avance', 'expert');
CREATE TYPE evenement_type AS ENUM ('culte', 'conference', 'retraite', 'formation', 'concert', 'jeune', 'evangelisation', 'cellule', 'special');
CREATE TYPE don_type AS ENUM ('don', 'dime', 'offrande', 'promesse', 'partenariat', 'projet');
CREATE TYPE don_statut AS ENUM ('en_attente', 'complete', 'echoue', 'rembourse');
CREATE TYPE don_frequence AS ENUM ('unique', 'mensuel', 'trimestriel', 'annuel');
CREATE TYPE priere_statut AS ENUM ('active', 'repondue', 'archivee');
CREATE TYPE priere_visibilite AS ENUM ('public', 'prive', 'groupe');
CREATE TYPE live_statut AS ENUM ('planifie', 'en_direct', 'pause', 'termine');
CREATE TYPE notification_type AS ENUM ('live_commence', 'nouvel_evenement', 'priere_repondue', 'formation_disponible', 'message_groupe', 'rdv_rappel', 'badge_obtenu', 'progression_formation', 'nouveau_temoignage', 'systeme');
CREATE TYPE plateforme_id AS ENUM ('cier', 'chapelle-familiale', 'jeunesse', 'femmes-exceptions', 'cite-refuge', 'cfic', 'mahanaim', 'familles-chapelle');

-- ============================================
-- PROFILES (extends Supabase auth.users)
-- ============================================

CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  prenom TEXT NOT NULL DEFAULT '',
  nom TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  telephone TEXT,
  pays TEXT,
  ville TEXT,
  role user_role NOT NULL DEFAULT 'visiteur',
  statut user_status NOT NULL DEFAULT 'actif',
  membre_statut membre_statut NOT NULL DEFAULT 'visiteur',
  plateforme_principale plateforme_id DEFAULT 'cier',
  score_engagement INTEGER NOT NULL DEFAULT 0 CHECK (score_engagement >= 0 AND score_engagement <= 100),
  parcours_disciple_etape INTEGER NOT NULL DEFAULT 0 CHECK (parcours_disciple_etape >= 0 AND parcours_disciple_etape <= 6),
  -- Profil spirituel
  dons_spirituels TEXT[] DEFAULT '{}',
  annee_conversion INTEGER,
  groupe_cellule_id UUID,
  berger_id UUID REFERENCES profiles(id),
  baptise BOOLEAN NOT NULL DEFAULT FALSE,
  date_bapteme DATE,
  integre_via TEXT,
  comment_entendu TEXT,
  -- Préférences
  langue TEXT NOT NULL DEFAULT 'fr',
  notifications_push BOOLEAN NOT NULL DEFAULT TRUE,
  notifications_email BOOLEAN NOT NULL DEFAULT TRUE,
  newsletter BOOLEAN NOT NULL DEFAULT TRUE,
  whatsapp_alerts BOOLEAN NOT NULL DEFAULT FALSE,
  -- Meta
  date_inscription TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  derniere_connexion TIMESTAMPTZ,
  ip_inscription TEXT,
  source_inscription TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger: update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Trigger: auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, prenom, nom, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'prenom', ''),
    COALESCE(NEW.raw_user_meta_data->>'nom', ''),
    'visiteur'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- FORMATIONS / LMS
-- ============================================

CREATE TABLE formations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  titre TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  contenu_court TEXT NOT NULL DEFAULT '',
  instructeur_id UUID REFERENCES profiles(id),
  instructeur_nom TEXT NOT NULL DEFAULT '',
  instructeur_avatar TEXT,
  plateforme_id plateforme_id,
  type formation_type NOT NULL DEFAULT 'cours',
  niveau formation_niveau NOT NULL DEFAULT 'debutant',
  statut TEXT NOT NULL DEFAULT 'brouillon' CHECK (statut IN ('brouillon', 'publie', 'archive')),
  image_couverture TEXT,
  duree_heures NUMERIC(5,1) NOT NULL DEFAULT 0,
  prix NUMERIC(10,2),
  gratuit BOOLEAN NOT NULL DEFAULT FALSE,
  certifiant BOOLEAN NOT NULL DEFAULT FALSE,
  prerequis TEXT[] DEFAULT '{}',
  objectifs TEXT[] DEFAULT '{}',
  inscrits_count INTEGER NOT NULL DEFAULT 0,
  note_moyenne NUMERIC(3,2) DEFAULT 0,
  avis_count INTEGER NOT NULL DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  meta_titre TEXT,
  meta_description TEXT,
  date_publication TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER formations_updated_at
  BEFORE UPDATE ON formations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE modules_formation (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  formation_id UUID NOT NULL REFERENCES formations(id) ON DELETE CASCADE,
  titre TEXT NOT NULL,
  description TEXT,
  ordre INTEGER NOT NULL DEFAULT 0,
  duree_minutes INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE lecons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  module_id UUID NOT NULL REFERENCES modules_formation(id) ON DELETE CASCADE,
  formation_id UUID NOT NULL REFERENCES formations(id) ON DELETE CASCADE,
  titre TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('video', 'audio', 'texte', 'pdf', 'quiz', 'live')),
  contenu_url TEXT,
  contenu_texte TEXT,
  duree_minutes INTEGER NOT NULL DEFAULT 0,
  ordre INTEGER NOT NULL DEFAULT 0,
  gratuite BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE inscriptions_formation (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  formation_id UUID NOT NULL REFERENCES formations(id) ON DELETE CASCADE,
  progression INTEGER NOT NULL DEFAULT 0 CHECK (progression >= 0 AND progression <= 100),
  statut TEXT NOT NULL DEFAULT 'actif' CHECK (statut IN ('actif', 'termine', 'abandonne')),
  lecons_completees UUID[] DEFAULT '{}',
  score_quiz INTEGER,
  certificat_url TEXT,
  dernier_acces TIMESTAMPTZ,
  date_inscription TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  date_completion TIMESTAMPTZ,
  UNIQUE(user_id, formation_id)
);

-- ============================================
-- ÉVÉNEMENTS
-- ============================================

CREATE TABLE evenements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  titre TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  type evenement_type NOT NULL DEFAULT 'culte',
  plateforme_id plateforme_id,
  date_debut TIMESTAMPTZ NOT NULL,
  date_fin TIMESTAMPTZ NOT NULL,
  lieu TEXT,
  lieu_virtuel_url TEXT,
  image_couverture TEXT,
  organisateur_id UUID REFERENCES profiles(id),
  capacite_max INTEGER,
  inscrits_count INTEGER NOT NULL DEFAULT 0,
  est_gratuit BOOLEAN NOT NULL DEFAULT TRUE,
  prix NUMERIC(10,2),
  est_en_ligne BOOLEAN NOT NULL DEFAULT TRUE,
  est_en_presentiel BOOLEAN NOT NULL DEFAULT FALSE,
  stream_url TEXT,
  statut TEXT NOT NULL DEFAULT 'brouillon' CHECK (statut IN ('brouillon', 'publie', 'annule', 'termine')),
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE inscriptions_evenement (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  evenement_id UUID NOT NULL REFERENCES evenements(id) ON DELETE CASCADE,
  statut TEXT NOT NULL DEFAULT 'confirme' CHECK (statut IN ('confirme', 'annule', 'liste_attente')),
  date_inscription TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, evenement_id)
);

-- ============================================
-- PRIÈRE
-- ============================================

CREATE TABLE demandes_priere (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  user_nom TEXT NOT NULL,
  user_avatar TEXT,
  sujet TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  visibilite priere_visibilite NOT NULL DEFAULT 'public',
  statut priere_statut NOT NULL DEFAULT 'active',
  urgent BOOLEAN NOT NULL DEFAULT FALSE,
  nombre_priants INTEGER NOT NULL DEFAULT 0,
  temoignage TEXT,
  tags TEXT[] DEFAULT '{}',
  date_creation TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  date_reponse TIMESTAMPTZ
);

CREATE TABLE priants (
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  demande_id UUID NOT NULL REFERENCES demandes_priere(id) ON DELETE CASCADE,
  date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, demande_id)
);

-- ============================================
-- DONS & FINANCES
-- ============================================

CREATE TABLE campagnes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  titre TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  image_couverture TEXT,
  objectif_montant NUMERIC(12,2) NOT NULL DEFAULT 0,
  montant_collecte NUMERIC(12,2) NOT NULL DEFAULT 0,
  devise TEXT NOT NULL DEFAULT 'EUR',
  date_debut TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  date_fin TIMESTAMPTZ,
  statut TEXT NOT NULL DEFAULT 'active' CHECK (statut IN ('active', 'terminee', 'archivee')),
  featured BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE dons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  user_nom TEXT NOT NULL,
  user_email TEXT NOT NULL,
  montant NUMERIC(12,2) NOT NULL CHECK (montant > 0),
  devise TEXT NOT NULL DEFAULT 'EUR',
  type don_type NOT NULL DEFAULT 'don',
  frequence don_frequence NOT NULL DEFAULT 'unique',
  statut don_statut NOT NULL DEFAULT 'en_attente',
  message TEXT,
  anonyme BOOLEAN NOT NULL DEFAULT FALSE,
  campagne_id UUID REFERENCES campagnes(id) ON DELETE SET NULL,
  methode_paiement TEXT NOT NULL DEFAULT 'stripe',
  stripe_payment_intent_id TEXT UNIQUE,
  stripe_subscription_id TEXT,
  recu_envoye BOOLEAN NOT NULL DEFAULT FALSE,
  date_creation TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- LIVE STREAM
-- ============================================

CREATE TABLE live_streams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  titre TEXT NOT NULL,
  description TEXT,
  miniature_url TEXT,
  stream_url TEXT NOT NULL,
  replay_url TEXT,
  statut live_statut NOT NULL DEFAULT 'planifie',
  spectateurs_live INTEGER DEFAULT 0,
  vues_totales INTEGER NOT NULL DEFAULT 0,
  duree_minutes INTEGER,
  speaker_id UUID REFERENCES profiles(id),
  speaker_nom TEXT NOT NULL,
  plateforme_id plateforme_id DEFAULT 'cier',
  date_programmee TIMESTAMPTZ,
  date_debut TIMESTAMPTZ,
  date_fin TIMESTAMPTZ,
  chat_actif BOOLEAN NOT NULL DEFAULT TRUE,
  prieres_activees BOOLEAN NOT NULL DEFAULT TRUE,
  reactions_activees BOOLEAN NOT NULL DEFAULT TRUE,
  youtube_video_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE messages_live (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  live_id UUID NOT NULL REFERENCES live_streams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  user_nom TEXT NOT NULL,
  user_avatar TEXT,
  user_role user_role NOT NULL DEFAULT 'visiteur',
  contenu TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'message' CHECK (type IN ('message', 'priere', 'temoignage', 'reaction', 'systeme')),
  reaction TEXT,
  approuve BOOLEAN NOT NULL DEFAULT TRUE,
  date TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- GROUPES / CELLULES
-- ============================================

CREATE TABLE groupes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nom TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'cellule' CHECK (type IN ('cellule', 'groupe_priere', 'equipe_service', 'formation', 'departement')),
  plateforme_id plateforme_id,
  leader_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  membres_count INTEGER NOT NULL DEFAULT 0,
  lieu_reunion TEXT,
  jour_reunion TEXT,
  heure_reunion TEXT,
  est_virtuel BOOLEAN NOT NULL DEFAULT FALSE,
  reunion_url TEXT,
  image TEXT,
  statut TEXT NOT NULL DEFAULT 'actif' CHECK (statut IN ('actif', 'inactif')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE membres_groupe (
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  groupe_id UUID NOT NULL REFERENCES groupes(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'membre' CHECK (role IN ('leader', 'co-leader', 'membre')),
  date_adhesion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, groupe_id)
);

-- ============================================
-- NOTIFICATIONS
-- ============================================

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type notification_type NOT NULL DEFAULT 'systeme',
  titre TEXT NOT NULL,
  message TEXT NOT NULL,
  lien TEXT,
  lue BOOLEAN NOT NULL DEFAULT FALSE,
  data JSONB DEFAULT '{}',
  date TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- BADGES / GAMIFICATION
-- ============================================

CREATE TABLE user_badges (
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  badge_id TEXT NOT NULL,
  date_obtenu TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, badge_id)
);

-- ============================================
-- CRM
-- ============================================

CREATE TABLE crm_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  nom TEXT NOT NULL,
  prenom TEXT NOT NULL,
  email TEXT NOT NULL,
  telephone TEXT,
  pays TEXT,
  source TEXT NOT NULL DEFAULT 'organic',
  tags TEXT[] DEFAULT '{}',
  score INTEGER NOT NULL DEFAULT 0,
  etape_pipeline TEXT NOT NULL DEFAULT 'nouveau',
  dernier_contact TIMESTAMPTZ,
  prochaine_action TEXT,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE crm_interactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id UUID NOT NULL REFERENCES crm_contacts(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('email', 'appel', 'sms', 'whatsapp', 'rdv', 'evenement', 'don', 'formation')),
  description TEXT NOT NULL,
  auteur_id UUID REFERENCES profiles(id),
  date TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- JOURNAL SPIRITUEL
-- ============================================

CREATE TABLE journal_spirituel (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  titre TEXT NOT NULL,
  contenu TEXT NOT NULL DEFAULT '',
  humeur TEXT CHECK (humeur IN ('joie', 'paix', 'force', 'lutte', 'gratitude', 'intercession')),
  verset_reference TEXT,
  prive BOOLEAN NOT NULL DEFAULT TRUE,
  date TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- RENDEZ-VOUS PASTORAUX
-- ============================================

CREATE TABLE rendez_vous (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  demandeur_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  pasteur_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  sujet TEXT NOT NULL,
  description TEXT DEFAULT '',
  date_souhaitee TIMESTAMPTZ,
  date_confirmee TIMESTAMPTZ,
  type TEXT NOT NULL DEFAULT 'priere' CHECK (type IN ('priere', 'accompagnement', 'conseil', 'delivrance', 'autre')),
  statut TEXT NOT NULL DEFAULT 'en_attente' CHECK (statut IN ('en_attente', 'confirme', 'refuse', 'realise', 'annule')),
  notes_pasteur TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_statut ON profiles(statut);
CREATE INDEX idx_profiles_plateforme ON profiles(plateforme_principale);
CREATE INDEX idx_profiles_score ON profiles(score_engagement DESC);

CREATE INDEX idx_formations_statut ON formations(statut);
CREATE INDEX idx_formations_plateforme ON formations(plateforme_id);
CREATE INDEX idx_formations_slug ON formations(slug);

CREATE INDEX idx_evenements_date ON evenements(date_debut);
CREATE INDEX idx_evenements_statut ON evenements(statut);

CREATE INDEX idx_dons_user ON dons(user_id);
CREATE INDEX idx_dons_statut ON dons(statut);
CREATE INDEX idx_dons_date ON dons(date_creation DESC);

CREATE INDEX idx_prieres_statut ON demandes_priere(statut);
CREATE INDEX idx_prieres_date ON demandes_priere(date_creation DESC);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_lue ON notifications(lue);

CREATE INDEX idx_messages_live ON messages_live(live_id, date);

-- Full text search
CREATE INDEX idx_formations_search ON formations USING GIN(to_tsvector('french', titre || ' ' || description));
CREATE INDEX idx_membres_search ON profiles USING GIN(to_tsvector('french', prenom || ' ' || nom || ' ' || COALESCE(email, '')));

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE formations ENABLE ROW LEVEL SECURITY;
ALTER TABLE inscriptions_formation ENABLE ROW LEVEL SECURITY;
ALTER TABLE demandes_priere ENABLE ROW LEVEL SECURITY;
ALTER TABLE dons ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_spirituel ENABLE ROW LEVEL SECURITY;
ALTER TABLE rendez_vous ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin', 'pasteur')
    )
  );

CREATE POLICY "Public profiles are viewable"
  ON profiles FOR SELECT
  USING (statut = 'actif');

-- Formations policies
CREATE POLICY "Published formations are public"
  ON formations FOR SELECT USING (statut = 'publie');

CREATE POLICY "Admins manage formations"
  ON formations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin', 'pasteur', 'berger')
    )
  );

-- Inscriptions policies
CREATE POLICY "Users see own inscriptions"
  ON inscriptions_formation FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can inscribe"
  ON inscriptions_formation FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progression"
  ON inscriptions_formation FOR UPDATE USING (auth.uid() = user_id);

-- Prayers policies
CREATE POLICY "Public prayers are visible"
  ON demandes_priere FOR SELECT USING (visibilite = 'public' AND statut != 'archivee');

CREATE POLICY "Users can submit prayers"
  ON demandes_priere FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own prayers"
  ON demandes_priere FOR UPDATE USING (auth.uid() = user_id);

-- Notifications policies
CREATE POLICY "Users see own notifications"
  ON notifications FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE USING (auth.uid() = user_id);

-- Journal policies
CREATE POLICY "Users see own journal"
  ON journal_spirituel FOR ALL USING (auth.uid() = user_id);

-- User badges policies
CREATE POLICY "Users see own badges"
  ON user_badges FOR SELECT USING (auth.uid() = user_id);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Auto-update membre_count on groupe
CREATE OR REPLACE FUNCTION update_groupe_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE groupes
  SET membres_count = (
    SELECT COUNT(*) FROM membres_groupe WHERE groupe_id = COALESCE(NEW.groupe_id, OLD.groupe_id)
  )
  WHERE id = COALESCE(NEW.groupe_id, OLD.groupe_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER groupe_count_trigger
  AFTER INSERT OR DELETE ON membres_groupe
  FOR EACH ROW EXECUTE FUNCTION update_groupe_count();

-- Auto-update priants count
CREATE OR REPLACE FUNCTION update_priants_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE demandes_priere
  SET nombre_priants = (
    SELECT COUNT(*) FROM priants WHERE demande_id = COALESCE(NEW.demande_id, OLD.demande_id)
  )
  WHERE id = COALESCE(NEW.demande_id, OLD.demande_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER priants_count_trigger
  AFTER INSERT OR DELETE ON priants
  FOR EACH ROW EXECUTE FUNCTION update_priants_count();

-- Auto-update formation inscriptions count
CREATE OR REPLACE FUNCTION update_formation_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE formations
  SET inscrits_count = (
    SELECT COUNT(*) FROM inscriptions_formation WHERE formation_id = COALESCE(NEW.formation_id, OLD.formation_id)
  )
  WHERE id = COALESCE(NEW.formation_id, OLD.formation_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER formation_count_trigger
  AFTER INSERT OR DELETE ON inscriptions_formation
  FOR EACH ROW EXECUTE FUNCTION update_formation_count();

-- Calculate engagement score
CREATE OR REPLACE FUNCTION calculate_engagement_score(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  score INTEGER := 0;
  logins INTEGER;
  formations INTEGER;
  prayers INTEGER;
  donations INTEGER;
BEGIN
  SELECT COUNT(*) INTO logins
  FROM notifications
  WHERE user_id = p_user_id
  AND date > NOW() - INTERVAL '30 days';

  SELECT COUNT(*) INTO formations
  FROM inscriptions_formation
  WHERE user_id = p_user_id AND statut = 'termine';

  SELECT COUNT(*) INTO prayers
  FROM demandes_priere
  WHERE user_id = p_user_id;

  SELECT COUNT(*) INTO donations
  FROM dons
  WHERE user_id = p_user_id AND statut = 'complete';

  score := LEAST(logins * 2, 20) +
           LEAST(formations * 10, 30) +
           LEAST(prayers * 3, 15) +
           LEAST(donations * 5, 25);

  RETURN LEAST(score, 100);
END;
$$ LANGUAGE plpgsql;
