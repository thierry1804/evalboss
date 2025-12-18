-- Fix pour permettre la soumission d'évaluations
-- La politique actuelle vérifie que statut = 'brouillon' dans USING, 
-- mais cela empêche de changer le statut vers 'soumise'

-- Supprimer l'ancienne politique
DROP POLICY IF EXISTS "Mise à jour des brouillons par matricule" ON evaluations;

-- Créer une nouvelle politique qui permet la mise à jour si le statut actuel est 'brouillon'
-- Cette politique permet de passer de 'brouillon' à 'soumise'
CREATE POLICY "Mise à jour des brouillons"
  ON evaluations FOR UPDATE
  USING (statut = 'brouillon')
  WITH CHECK (statut IN ('brouillon', 'soumise'));

