-- Migration initiale pour l'application d'évaluation
-- Création des tables et configuration RLS

-- Extension pour générer des UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table des évaluations
CREATE TABLE IF NOT EXISTS evaluations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  matricule TEXT NOT NULL,
  nom TEXT NOT NULL,
  prenom TEXT NOT NULL,
  poste TEXT NOT NULL CHECK (poste IN (
    'integrateur_graphiste',
    'developpeur',
    'tech_lead',
    'lead_dev',
    'referent_technique',
    'business_analyst',
    'chef_projet',
    'pmo'
  )),
  niveau_seniorite TEXT NOT NULL CHECK (niveau_seniorite IN ('junior', 'confirme', 'senior')),
  date_integration DATE NOT NULL,
  date_derniere_eval DATE,
  reponses JSONB NOT NULL DEFAULT '[]'::jsonb,
  scores JSONB NOT NULL DEFAULT '{}'::jsonb,
  commentaires JSONB DEFAULT '{}'::jsonb,
  statut TEXT NOT NULL DEFAULT 'brouillon' CHECK (statut IN ('brouillon', 'soumise', 'validee')),
  timestamps JSONB NOT NULL DEFAULT jsonb_build_object('creation', now()),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_evaluations_matricule ON evaluations(matricule);
CREATE INDEX IF NOT EXISTS idx_evaluations_statut ON evaluations(statut);
CREATE INDEX IF NOT EXISTS idx_evaluations_poste ON evaluations(poste);
CREATE INDEX IF NOT EXISTS idx_evaluations_created_at ON evaluations(created_at);
CREATE INDEX IF NOT EXISTS idx_evaluations_matricule_date ON evaluations(matricule, created_at);

-- Table des questions (catalogue)
CREATE TABLE IF NOT EXISTS questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profil TEXT NOT NULL CHECK (profil IN (
    'integrateur_graphiste',
    'developpeur',
    'tech_lead',
    'lead_dev',
    'referent_technique',
    'business_analyst',
    'chef_projet',
    'pmo'
  )),
  groupe TEXT NOT NULL CHECK (groupe IN ('soft_skills', 'hard_skills', 'performance_projet')),
  question TEXT NOT NULL,
  categorie_ia BOOLEAN NOT NULL DEFAULT false,
  coefficient INTEGER NOT NULL,
  ordre INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_questions_profil ON questions(profil);
CREATE INDEX IF NOT EXISTS idx_questions_groupe ON questions(groupe);
CREATE INDEX IF NOT EXISTS idx_questions_profil_groupe_ordre ON questions(profil, groupe, ordre);

-- Table des managers (extension de auth.users)
CREATE TABLE IF NOT EXISTS managers (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  nom TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table des évaluations manager
CREATE TABLE IF NOT EXISTS evaluations_manager (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  evaluation_id UUID NOT NULL REFERENCES evaluations(id) ON DELETE CASCADE,
  manager_id UUID NOT NULL REFERENCES managers(id) ON DELETE CASCADE,
  reponses_manager JSONB NOT NULL DEFAULT '[]'::jsonb,
  scores_manager JSONB NOT NULL DEFAULT '{}'::jsonb,
  commentaire_manager TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(evaluation_id, manager_id)
);

CREATE INDEX IF NOT EXISTS idx_evaluations_manager_evaluation_id ON evaluations_manager(evaluation_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_manager_manager_id ON evaluations_manager(manager_id);

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers pour updated_at
CREATE TRIGGER update_evaluations_updated_at BEFORE UPDATE ON evaluations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_evaluations_manager_updated_at BEFORE UPDATE ON evaluations_manager
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS)

-- Activer RLS sur toutes les tables
ALTER TABLE evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE managers ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluations_manager ENABLE ROW LEVEL SECURITY;

-- Policies pour evaluations
-- Lecture publique par matricule (pour les collaborateurs)
CREATE POLICY "Les collaborateurs peuvent lire leurs évaluations par matricule"
  ON evaluations FOR SELECT
  USING (true); -- Permettre la lecture publique (validation côté application par matricule)

-- Insertion publique (création d'évaluation)
CREATE POLICY "Création publique d'évaluations"
  ON evaluations FOR INSERT
  WITH CHECK (true);

-- Mise à jour publique pour brouillons (permet de passer de brouillon à soumise)
CREATE POLICY "Mise à jour des brouillons par matricule"
  ON evaluations FOR UPDATE
  USING (statut = 'brouillon')
  WITH CHECK (statut IN ('brouillon', 'soumise'));

-- Policies pour questions (lecture publique)
CREATE POLICY "Lecture publique des questions"
  ON questions FOR SELECT
  USING (true);

-- Policies pour managers (lecture pour utilisateurs authentifiés)
CREATE POLICY "Les managers authentifiés peuvent lire les managers"
  ON managers FOR SELECT
  USING (auth.role() = 'authenticated');

-- Policies pour evaluations_manager
-- Lecture pour managers authentifiés
CREATE POLICY "Les managers authentifiés peuvent lire leurs évaluations"
  ON evaluations_manager FOR SELECT
  USING (auth.role() = 'authenticated');

-- Insertion pour managers authentifiés
CREATE POLICY "Les managers authentifiés peuvent créer des évaluations"
  ON evaluations_manager FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Mise à jour pour managers authentifiés
CREATE POLICY "Les managers authentifiés peuvent mettre à jour leurs évaluations"
  ON evaluations_manager FOR UPDATE
  USING (auth.role() = 'authenticated');

