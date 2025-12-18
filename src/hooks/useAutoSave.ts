import { useEffect, useRef } from 'react';
import { useEvaluationStore } from '../store/evaluationStore';

// Sauvegarde automatique toutes les 30 secondes
export function useAutoSave(intervalMs: number = 30000) {
  const saveDraft = useEvaluationStore((state) => state.saveDraft);
  const currentEvaluation = useEvaluationStore((state) => state.currentEvaluation);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Ne pas sauvegarder si pas d'évaluation ou si déjà soumise
    if (!currentEvaluation || currentEvaluation.statut !== 'brouillon') {
      return;
    }

    // Sauvegarder immédiatement au premier rendu
    saveDraft();

    // Puis sauvegarder toutes les X secondes
    intervalRef.current = setInterval(() => {
      saveDraft();
    }, intervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [currentEvaluation, saveDraft, intervalMs]);
}

