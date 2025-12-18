import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { QuestionCard } from '../components/QuestionCard';
import { ProgressBar } from '../components/ProgressBar';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { useEvaluationStore } from '../store/evaluationStore';
import { useAutoSave } from '../hooks/useAutoSave';
import { GROUPE_LABELS, GroupeQuestion } from '../types';
import { ArrowLeft, ArrowRight } from 'lucide-react';

export function Questionnaire() {
  const { evaluationId } = useParams<{ evaluationId: string }>();
  const navigate = useNavigate();

  const currentEvaluation = useEvaluationStore((state) => state.currentEvaluation);
  const loadEvaluation = useEvaluationStore((state) => state.loadEvaluation);
  const saveReponse = useEvaluationStore((state) => state.saveReponse);
  const isLoading = useEvaluationStore((state) => state.isLoading);

  // Sauvegarde automatique toutes les 30 secondes
  useAutoSave();

  const [currentGroupe, setCurrentGroupe] = useState<GroupeQuestion>('soft_skills');
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  useEffect(() => {
    if (evaluationId && !currentEvaluation) {
      loadEvaluation(evaluationId);
    }
  }, [evaluationId, currentEvaluation, loadEvaluation]);

  if (isLoading || !currentEvaluation) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4" />
          <p className="text-gray-600">Chargement de l'évaluation...</p>
        </div>
      </div>
    );
  }

  const groupes: GroupeQuestion[] = ['soft_skills', 'hard_skills', 'performance_projet'];

  const questionsDuGroupe = currentEvaluation.reponses.filter(
    (r) => r.groupe === currentGroupe
  );

  const handleNoteChange = (reponseId: string, note: number) => {
    const reponse = currentEvaluation.reponses.find((r) => r.id === reponseId);
    if (reponse) {
      saveReponse(reponse.questionId, note, undefined, reponseId);
    }
  };

  const handleCommentaireChange = (reponseId: string, commentaire: string) => {
    const reponse = currentEvaluation.reponses.find((r) => r.id === reponseId);
    if (reponse) {
      saveReponse(reponse.questionId, reponse.noteCollaborateur, commentaire, reponseId);
    }
  };


  const handleGoToResults = () => {
    // Vérifier que toutes les questions sont répondues
    const allAnswered = currentEvaluation.reponses.every(
      (r) => r.noteCollaborateur >= 1 && r.noteCollaborateur <= 5
    );

    if (!allAnswered) {
      setShowConfirmModal(true);
      return;
    }

    navigate(`/resultats/${currentEvaluation.id}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header fixe */}
        <div className="sticky top-0 z-10 bg-gray-50 pb-4 pt-2 mb-6">
          <div className="mb-4">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Questionnaire d'auto-évaluation
            </h1>
            <p className="text-gray-600">
              {currentEvaluation.collaborateur.prenom} {currentEvaluation.collaborateur.nom} -{' '}
              {currentEvaluation.collaborateur.poste}
            </p>
          </div>

          <ProgressBar reponses={currentEvaluation.reponses} />

          {/* Onglets fixe */}
          <div className="flex gap-2 mt-4">
            {groupes.map((groupe) => (
              <button
                key={groupe}
                onClick={() => {
                  setCurrentGroupe(groupe);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`
                  flex-1 py-2 px-4 rounded-lg font-medium transition-colors
                  ${
                    groupe === currentGroupe
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }
                `}
              >
                {GROUPE_LABELS[groupe]}
              </button>
            ))}
          </div>
        </div>

        {/* Liste des questions du groupe */}
        <div className="space-y-4">
          {questionsDuGroupe.map((reponse) => (
            <QuestionCard
              key={reponse.id}
              reponse={reponse}
              onNoteChange={(note) => handleNoteChange(reponse.id, note)}
              onCommentaireChange={(commentaire) =>
                handleCommentaireChange(reponse.id, commentaire)
              }
            />
          ))}
        </div>

        {/* Actions en bas */}
        <div className="mt-8 flex justify-between items-center">
          <Button variant="ghost" onClick={() => navigate('/')}>
            <ArrowLeft size={16} className="mr-2" />
            Retour à l'accueil
          </Button>
          <Button variant="primary" size="lg" onClick={handleGoToResults}>
            Passer aux résultats
            <ArrowRight size={16} className="ml-2" />
          </Button>
        </div>

        {/* Modal de confirmation si toutes les questions ne sont pas répondues */}
        {showConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <Card className="max-w-md">
              <h3 className="text-lg font-semibold mb-4">
                Questions non complétées
              </h3>
              <p className="text-gray-600 mb-4">
                Certaines questions n'ont pas été notées. Souhaitez-vous tout de même
                continuer vers les résultats ?
              </p>
              <div className="flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setShowConfirmModal(false)}>
                  Continuer l'évaluation
                </Button>
                <Button
                  variant="primary"
                  onClick={() => {
                    setShowConfirmModal(false);
                    navigate(`/resultats/${currentEvaluation.id}`);
                  }}
                >
                  Voir les résultats
                </Button>
              </div>
            </Card>
          </div>
        )}

        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Vos réponses sont sauvegardées automatiquement toutes les 30 secondes.</p>
        </div>
      </div>
    </div>
  );
}

