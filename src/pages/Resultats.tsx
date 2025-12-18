import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useEvaluationStore } from '../store/evaluationStore';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Textarea } from '../components/ui/Textarea';
import { RadarChartComponent } from '../components/charts/RadarChart';
import { BarChartComponent } from '../components/charts/BarChart';
import { generateRecommendations, generateAnalyseCompetences, generateRecommendationsWithGemini, AnalyseCompetences } from '../lib/recommendations';
import { NIVEAU_IA_LABELS, PROFIL_LABELS } from '../types';
import { formatDate } from '../lib/utils';
import { exportEvaluationToPDF } from '../lib/pdfExport';
import { CheckCircle, AlertCircle, TrendingUp, Sparkles, Download } from 'lucide-react';

export function Resultats() {
  const { evaluationId } = useParams<{ evaluationId: string }>();
  const navigate = useNavigate();

  const currentEvaluation = useEvaluationStore((state) => state.currentEvaluation);
  const loadEvaluation = useEvaluationStore((state) => state.loadEvaluation);
  const saveCommentaireFinal = useEvaluationStore((state) => state.saveCommentaireFinal);
  const submitEvaluation = useEvaluationStore((state) => state.submitEvaluation);
  const saveAnalyseGemini = useEvaluationStore((state) => state.saveAnalyseGemini);
  const isLoading = useEvaluationStore((state) => state.isLoading);

  const [commentaireFinal, setCommentaireFinal] = useState('');
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [analyse, setAnalyse] = useState<AnalyseCompetences | null>(null);
  const [planProgression, setPlanProgression] = useState<string[]>([]);
  const [isLoadingAnalyse, setIsLoadingAnalyse] = useState(false);

  useEffect(() => {
    if (evaluationId && !currentEvaluation) {
      loadEvaluation(evaluationId);
    }
    if (currentEvaluation?.commentaires?.collaborateur) {
      setCommentaireFinal(currentEvaluation.commentaires.collaborateur);
    }
  }, [evaluationId, currentEvaluation, loadEvaluation]);

  // Charger l'analyse Gemini lorsque l'évaluation est disponible
  useEffect(() => {
    if (currentEvaluation) {
      const scores = currentEvaluation.scores.autoEvaluation;
      
      // Vérifier si l'analyse Gemini existe déjà
      if (currentEvaluation.analyseGemini) {
        console.log('Analyse Gemini existante trouvée, utilisation de l\'analyse sauvegardée');
        // Utiliser l'analyse existante
        const existingAnalyse = currentEvaluation.analyseGemini;
        setAnalyse({
          pointsForts: existingAnalyse.pointsForts,
          axesAmelioration: existingAnalyse.axesAmelioration,
          recommandationsPrioritaires: existingAnalyse.recommandationsPrioritaires,
          analyseDetaillee: existingAnalyse.analyseDetaillee,
        });
        setPlanProgression(existingAnalyse.planProgression);
        setIsLoadingAnalyse(false);
      } else {
        // Générer une nouvelle analyse
        console.log('Aucune analyse Gemini trouvée, génération d\'une nouvelle analyse...');
        setIsLoadingAnalyse(true);
        
        Promise.all([
          generateAnalyseCompetences(currentEvaluation, scores),
          generateRecommendationsWithGemini(currentEvaluation, scores),
        ])
          .then(async ([analyseResult, { planProgression: plan }]) => {
            console.log('Analyse générée:', { 
              hasDetaillee: !!analyseResult.analyseDetaillee,
              pointsForts: analyseResult.pointsForts.length,
              axesAmelioration: analyseResult.axesAmelioration.length,
            });
            
            setAnalyse(analyseResult);
            setPlanProgression(plan);
            
            // Si l'analyse contient des données Gemini (analyseDetaillee), sauvegarder
            if (analyseResult.analyseDetaillee) {
              console.log('Sauvegarde de l\'analyse Gemini...');
              const analyseGemini = {
                pointsForts: analyseResult.pointsForts,
                axesAmelioration: analyseResult.axesAmelioration,
                recommandationsPrioritaires: analyseResult.recommandationsPrioritaires,
                planProgression: plan,
                analyseDetaillee: analyseResult.analyseDetaillee,
                dateGeneration: new Date(),
              };
              const saved = await saveAnalyseGemini(analyseGemini);
              if (saved) {
                console.log('Analyse Gemini sauvegardée avec succès');
              } else {
                console.error('Échec de la sauvegarde de l\'analyse Gemini');
              }
            } else {
              console.warn('L\'analyse générée ne contient pas d\'analyseDetaillee, elle ne sera pas sauvegardée');
            }
          })
          .catch((error) => {
            console.error('Erreur lors du chargement de l\'analyse:', error);
            // Fallback vers l'analyse par défaut
            generateAnalyseCompetences(currentEvaluation, scores)
              .then((defaultAnalyse) => {
                console.log('Utilisation de l\'analyse par défaut');
                setAnalyse(defaultAnalyse);
              })
              .catch((err) => {
                console.error('Erreur lors de la génération de l\'analyse par défaut:', err);
                // En cas d'erreur, utiliser une analyse vide
                setAnalyse({
                  pointsForts: [],
                  axesAmelioration: [],
                  recommandationsPrioritaires: [],
                });
              });
            const recommandations = generateRecommendations(
              currentEvaluation.collaborateur.poste,
              scores
            );
            setPlanProgression(recommandations.planProgression);
          })
          .finally(() => {
            setIsLoadingAnalyse(false);
          });
      }
    }
  }, [currentEvaluation, saveAnalyseGemini]);

  if (isLoading || !currentEvaluation) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4" />
          <p className="text-gray-600">Chargement des résultats...</p>
        </div>
      </div>
    );
  }

  const scores = currentEvaluation.scores.autoEvaluation;
  const recommandations = generateRecommendations(
    currentEvaluation.collaborateur.poste,
    scores
  );
  
  // Utiliser l'analyse chargée ou une analyse par défaut
  const analyseData = analyse || {
    pointsForts: [],
    axesAmelioration: [],
    recommandationsPrioritaires: [],
  };

  // Calculer les moyennes originales (sur 5) pour affichage avec coefficient
  const moyenneSoftSkills = scores.softSkills / 20;
  const moyenneHardSkills = scores.hardSkills / 20;
  const moyennePerformanceProjet = scores.performanceProjet / 20;
  const moyenneIA = scores.competencesIA / 20;

  // Données pour le graphique radar principal
  const radarData = [
    { subject: 'Soft Skills', value: scores.softSkills },
    { subject: 'Hard Skills', value: scores.hardSkills },
    { subject: 'Performance Projet', value: scores.performanceProjet },
  ];

  // Données pour le graphique radar IA (compétences IA par catégorie)
  const iaQuestions = currentEvaluation.reponses.filter((r) => r.categorieIA);
  const iaReponses = iaQuestions.map((r) => r.noteCollaborateur);
  const iaMoyenne = iaReponses.length > 0
    ? iaReponses.reduce((a, b) => a + b, 0) / iaReponses.length * 20
    : 0;

  const iaRadarData = [
    { subject: 'Compétences IA', value: iaMoyenne },
    { subject: 'Utilisation outils', value: iaMoyenne * 0.9 },
    { subject: 'Intégration projets', value: iaMoyenne * 0.85 },
  ];

  // Données pour les graphiques en barres
  const barData = [
    { name: 'Soft Skills', value: scores.softSkills },
    { name: 'Hard Skills', value: scores.hardSkills },
    { name: 'Performance Projet', value: scores.performanceProjet },
    { name: 'Compétences IA', value: scores.competencesIA },
  ];

  const handleCommentaireChange = (value: string) => {
    setCommentaireFinal(value);
    saveCommentaireFinal(value);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    const success = await submitEvaluation();
    setIsSubmitting(false);
    
    if (success) {
      setShowSubmitModal(false);
      // Afficher un message de succès
      alert('Évaluation soumise avec succès ! Vous ne pourrez plus la modifier.');
      // Optionnellement, rediriger ou désactiver les modifications
    }
  };

  const isSubmitted = currentEvaluation.statut === 'soumise' || currentEvaluation.statut === 'validee';

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Résultats de l'évaluation</h1>
          <p className="text-gray-600">
            {currentEvaluation.collaborateur.prenom} {currentEvaluation.collaborateur.nom} -{' '}
            {PROFIL_LABELS[currentEvaluation.collaborateur.poste]}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Date de création : {formatDate(currentEvaluation.timestamps.creation)}
          </p>
        </div>

        {/* Scores principaux */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <Card className="text-center">
            <div className="text-3xl font-bold text-primary-600 mb-2">{scores.total.toFixed(1)}%</div>
            <div className="text-sm text-gray-600">Score Total</div>
          </Card>
          <Card className="text-center">
            <div className="text-3xl font-bold text-gray-700 mb-2">{scores.softSkills.toFixed(1)}%</div>
            <div className="text-sm text-gray-600">Soft Skills</div>
            <div className="text-xs text-gray-500 mt-1">{moyenneSoftSkills.toFixed(1)}/5</div>
          </Card>
          <Card className="text-center">
            <div className="text-3xl font-bold text-gray-700 mb-2">{scores.hardSkills.toFixed(1)}%</div>
            <div className="text-sm text-gray-600">Hard Skills</div>
            <div className="text-xs text-gray-500 mt-1">{(moyenneHardSkills * 2).toFixed(1)}/10</div>
          </Card>
          <Card className="text-center">
            <div className="text-3xl font-bold text-gray-700 mb-2">{scores.performanceProjet.toFixed(1)}%</div>
            <div className="text-sm text-gray-600">Performance Projet</div>
            <div className="text-xs text-gray-500 mt-1">{(moyennePerformanceProjet * 2).toFixed(1)}/10</div>
          </Card>
          <Card className="text-center">
            <div className="text-3xl font-bold text-ia-purple mb-2">{scores.competencesIA.toFixed(1)}%</div>
            <div className="text-sm text-gray-600 flex items-center justify-center gap-1">
              <Sparkles size={16} />
              Compétences IA
            </div>
            <div className="text-xs text-gray-500 mt-1">{(moyenneIA * 2).toFixed(1)}/10</div>
          </Card>
        </div>

        {/* Graphiques radar */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <RadarChartComponent
              data={radarData}
              title="Compétences principales"
              maxValue={100}
              color="#2563eb"
            />
          </Card>
          <Card>
            <RadarChartComponent
              data={iaRadarData}
              title="Compétences Intelligence Artificielle"
              maxValue={100}
              color="#8b5cf6"
            />
          </Card>
        </div>

        {/* Graphique en barres */}
        <Card className="mb-8">
          <BarChartComponent
            data={barData}
            title="Comparaison des scores"
            maxValue={100}
          />
        </Card>

        {/* Analyse et recommandations */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <CheckCircle className="text-green-600" size={20} />
              Points forts
            </h3>
            {isLoadingAnalyse ? (
              <div className="flex items-center gap-2 text-gray-500">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600" />
                <span>Analyse en cours...</span>
              </div>
            ) : analyseData.pointsForts.length > 0 ? (
              <ul className="space-y-2">
                {analyseData.pointsForts.map((point, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-green-600 mt-1">✓</span>
                    <span className="text-gray-700">{point}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500">Continuez à vous améliorer dans tous les domaines.</p>
            )}
          </Card>

          <Card>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <AlertCircle className="text-yellow-600" size={20} />
              Axes d'amélioration
            </h3>
            {isLoadingAnalyse ? (
              <div className="flex items-center gap-2 text-gray-500">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600" />
                <span>Analyse en cours...</span>
              </div>
            ) : analyseData.axesAmelioration.length > 0 ? (
              <ul className="space-y-2">
                {analyseData.axesAmelioration.map((axe, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-yellow-600 mt-1">→</span>
                    <span className="text-gray-700">{axe}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500">Excellent travail ! Continuez ainsi.</p>
            )}
          </Card>
        </div>

        {/* Section IA dédiée */}
        <Card className="mb-8 bg-gradient-to-r from-ia-purple/10 to-ia-cyan/10 border-2 border-ia-purple/20">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="text-ia-purple" size={24} />
            <h3 className="text-xl font-semibold text-gray-900">Compétences Intelligence Artificielle</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-gray-700 mb-2">Niveau actuel</h4>
              <Badge variant="ia" className="text-lg px-4 py-2">
                {NIVEAU_IA_LABELS[scores.niveauIA]}
              </Badge>
              <p className="text-sm text-gray-600 mt-2">
                Score IA : {scores.competencesIA.toFixed(1)}%
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-gray-700 mb-2">Outils IA recommandés</h4>
              <div className="flex flex-wrap gap-2">
                {recommandations.outils.slice(0, 4).map((outil, index) => (
                  <Badge key={index} variant="info">
                    {outil}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6">
            <h4 className="font-semibold text-gray-700 mb-3">Plan de progression (6-12 mois)</h4>
            {isLoadingAnalyse ? (
              <div className="flex items-center gap-2 text-gray-500 py-4">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600" />
                <span>Génération du plan en cours...</span>
              </div>
            ) : (
              <ol className="space-y-2">
                {(planProgression.length > 0 ? planProgression : recommandations.planProgression).map((etape, index) => (
                <li key={index} className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-ia-purple text-white rounded-full flex items-center justify-center text-sm font-medium">
                    {index + 1}
                  </span>
                  <span className="text-gray-700">{etape}</span>
                </li>
                ))}
              </ol>
            )}
          </div>
          
          {/* Analyse détaillée */}
          {analyseData.analyseDetaillee && (
            <div className="mt-6 p-4 bg-white rounded-lg border border-gray-200">
              <h4 className="font-semibold text-gray-700 mb-3">Analyse détaillée</h4>
              <p className="text-gray-600 whitespace-pre-line leading-relaxed">
                {analyseData.analyseDetaillee}
              </p>
            </div>
          )}
        </Card>

        {/* Recommandations prioritaires */}
        <Card className="mb-8">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="text-primary-600" size={20} />
            Recommandations prioritaires
          </h3>
          {isLoadingAnalyse ? (
            <div className="flex items-center gap-2 text-gray-500 py-4">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600" />
              <span>Analyse en cours...</span>
            </div>
          ) : (
            <ul className="space-y-3">
              {analyseData.recommandationsPrioritaires.map((rec, index) => (
              <li key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <span className="flex-shrink-0 w-6 h-6 bg-primary-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                  {index + 1}
                </span>
                <span className="text-gray-700">{rec}</span>
              </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Commentaire final */}
        {!isSubmitted && (
          <Card className="mb-8">
            <h3 className="text-lg font-semibold mb-4">Commentaire final (optionnel)</h3>
            <Textarea
              value={commentaireFinal}
              onChange={(e) => handleCommentaireChange(e.target.value)}
              maxLength={1000}
              showCharCount
              placeholder="Ajoutez un commentaire général sur votre évaluation..."
              rows={4}
            />
          </Card>
        )}

        {/* Actions */}
        <div className="flex justify-between items-center">
          <Button variant="ghost" onClick={() => navigate(`/questionnaire/${currentEvaluation.id}`)}>
            ← Retour au questionnaire
          </Button>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  // Passer l'analyse déjà chargée pour éviter de la régénérer
                  await exportEvaluationToPDF(currentEvaluation, analyse || undefined);
                } catch (error) {
                  console.error('Erreur lors de l\'export PDF:', error);
                  alert('Erreur lors de l\'export PDF. Veuillez réessayer.');
                }
              }}
            >
              <Download size={16} className="mr-2" />
              Exporter en PDF
            </Button>
            {!isSubmitted ? (
              <Button
                variant="primary"
                size="lg"
                onClick={() => setShowSubmitModal(true)}
                isLoading={isSubmitting}
              >
                Soumettre l'évaluation
              </Button>
            ) : (
              <Badge variant="success" className="text-lg px-4 py-2">
                Évaluation soumise le {currentEvaluation.timestamps.soumission ? formatDate(currentEvaluation.timestamps.soumission) : ''}
              </Badge>
            )}
          </div>
        </div>

        {/* Modal de confirmation de soumission */}
        <Modal
          isOpen={showSubmitModal}
          onClose={() => setShowSubmitModal(false)}
          title="Confirmer la soumission"
          footer={
            <>
              <Button variant="ghost" onClick={() => setShowSubmitModal(false)}>
                Annuler
              </Button>
              <Button variant="danger" onClick={handleSubmit} isLoading={isSubmitting}>
                Confirmer la soumission
              </Button>
            </>
          }
        >
          <p className="text-gray-700 mb-4">
            Une fois soumise, l'évaluation sera verrouillée et vous ne pourrez plus la modifier.
            Êtes-vous sûr de vouloir continuer ?
          </p>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              <strong>Note :</strong> Assurez-vous d'avoir répondu à toutes les questions et
              d'avoir vérifié vos réponses avant de soumettre.
            </p>
          </div>
        </Modal>
      </div>
    </div>
  );
}

