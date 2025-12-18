-- Migration pour ajouter le champ analyse_ia à la table evaluations
-- Ce champ stocke l'analyse générée par Gemini AI

ALTER TABLE evaluations 
ADD COLUMN IF NOT EXISTS analyse_ia JSONB DEFAULT NULL;

-- Index pour améliorer les performances des requêtes sur analyse_ia
CREATE INDEX IF NOT EXISTS idx_evaluations_analyse_ia ON evaluations USING GIN (analyse_ia);

-- Commentaire pour documenter le champ
COMMENT ON COLUMN evaluations.analyse_ia IS 'Analyse générée par Gemini AI contenant points forts, axes d''amélioration, recommandations et plan de progression';

