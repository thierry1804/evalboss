-- Migration pour permettre aux utilisateurs authentifiés de lire toutes les évaluations
-- Cette politique complète la politique publique existante qui permet l'accès par matricule

-- Ajouter une politique qui permet aux utilisateurs authentifiés de lire toutes les évaluations
CREATE POLICY "Les utilisateurs authentifiés peuvent lire toutes les évaluations"
  ON evaluations FOR SELECT
  USING (auth.role() = 'authenticated');
