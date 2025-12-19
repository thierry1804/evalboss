-- Migration pour permettre aux managers de mettre à jour le champ analyse_ia
-- même si l'évaluation est soumise ou validée

-- Créer une politique RLS qui permet aux managers authentifiés
-- de mettre à jour le champ analyse_ia pour toutes les évaluations
CREATE POLICY "Les managers peuvent mettre à jour analyse_ia"
  ON evaluations FOR UPDATE
  USING (
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM managers 
      WHERE managers.id = auth.uid()
    )
  )
  WITH CHECK (
    -- Permettre la mise à jour si :
    -- 1. Le statut est brouillon (politique existante)
    statut = 'brouillon' OR
    -- 2. Le statut est soumise ou validée ET on est manager authentifié
    (statut IN ('soumise', 'validee') AND 
     auth.role() = 'authenticated' AND
     EXISTS (
       SELECT 1 FROM managers 
       WHERE managers.id = auth.uid()
     ))
  );

