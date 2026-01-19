import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { RadarChartComponent } from '../components/charts/RadarChart';
import { BarChartComponent } from '../components/charts/BarChart';
import { generateRecommendations, AnalyseCompetences } from '../lib/recommendations';
import { Evaluation, AnalyseGemini, Reponse, ScoreDetail } from '../types';
import { NIVEAU_IA_LABELS, PROFIL_LABELS, GROUPE_LABELS, GroupeQuestion, NOTE_LABELS } from '../types';
import { formatDate } from '../lib/utils';
import { calculateAutoEvaluationScores } from '../lib/scoreCalculator';
import { exportEvaluationToPDF } from '../lib/pdfExport';
import { CheckCircle, AlertCircle, TrendingUp, Sparkles, Download } from 'lucide-react';

export function EvaluationView() {
  const { id } = useParams<{ id: string }>();
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analyse, setAnalyse] = useState<AnalyseGemini | null>(null);
  const [managerReponses, setManagerReponses] = useState<Reponse[]>([]);
  const [scoresManager, setScoresManager] = useState<ScoreDetail | null>(null);
  const [commentaireManager, setCommentaireManager] = useState<string>('');
  const [managerName, setManagerName] = useState<string>('');

  useEffect(() => {
    if (id) {
      loadEvaluation();
    }
  }, [id]);

  const loadEvaluation = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('evaluations')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      if (data) {
        // Charger l'analyse IA si elle existe
        let analyseGemini: AnalyseGemini | undefined;
        if (data.analyse_ia) {
          try {
            const analyseData = data.analyse_ia as any;
            analyseGemini = {
              pointsForts: analyseData.pointsForts || [],
              axesAmelioration: analyseData.axesAmelioration || [],
              recommandationsPrioritaires: analyseData.recommandationsPrioritaires || [],
              planProgression: analyseData.planProgression || [],
              analyseDetaillee: analyseData.analyseDetaillee || '',
              dateGeneration: analyseData.dateGeneration ? new Date(analyseData.dateGeneration) : new Date(),
            };
          } catch (parseError) {
            console.error('Erreur lors du parsing de l\'analyse IA:', parseError);
          }
        }

        const evalData: Evaluation = {
          id: data.id,
          collaborateur: {
            matricule: data.matricule,
            nom: data.nom,
            prenom: data.prenom,
            poste: data.poste as any,
            niveauSeniorite: data.niveau_seniorite as any,
            dateIntegration: new Date(data.date_integration),
            dateDerniereEval: data.date_derniere_eval ? new Date(data.date_derniere_eval) : undefined,
          },
          reponses: (data.reponses as any[]) || [],
          scores: {
            autoEvaluation: calculateAutoEvaluationScores((data.reponses as any[]) || []),
            manager: (data.scores as any)?.manager,
          },
          commentaires: (data.commentaires as any) || {},
          analyseGemini,
          statut: data.statut as any,
          timestamps: {
            creation: new Date(data.created_at),
            soumission: data.timestamps?.soumission ? new Date(data.timestamps.soumission) : undefined,
            validation: data.timestamps?.validation ? new Date(data.timestamps.validation) : undefined,
          },
        };

        setEvaluation(evalData);
        setAnalyse(analyseGemini || null);

        // Charger les données manager depuis evaluations_manager (peut échouer si RLS bloque)
        // On essaie d'abord depuis evaluations_manager, sinon on utilise les données dans evaluations
        try {
          // Charger toutes les évaluations manager pour cette évaluation
          const { data: managerEvalDataList, error: managerEvalError } = await supabase
            .from('evaluations_manager')
            .select('*')
            .eq('evaluation_id', id)
            .order('updated_at', { ascending: false });

          console.log('Requête evaluations_manager:', {
            evaluation_id: id,
            data: managerEvalDataList,
            error: managerEvalError,
            count: managerEvalDataList?.length || 0,
          });

          if (managerEvalError) {
            console.error('Erreur lors du chargement des évaluations manager:', managerEvalError);
          }

          if (managerEvalDataList && managerEvalDataList.length > 0 && !managerEvalError) {
            // Utiliser la première évaluation manager (la plus récente)
            const managerEvalData = managerEvalDataList[0];
            
            // Charger les informations du manager séparément
            if (managerEvalData.manager_id) {
              const { data: managerInfo, error: managerInfoError } = await supabase
                .from('managers')
                .select('nom, email')
                .eq('id', managerEvalData.manager_id)
                .maybeSingle();
              
              if (managerInfo && !managerInfoError) {
                if (managerInfo.nom) {
                  setManagerName(managerInfo.nom);
                } else if (managerInfo.email) {
                  setManagerName(managerInfo.email);
                } else {
                  setManagerName('Manager');
                }
              } else {
                setManagerName('Manager');
              }
            } else {
              setManagerName('Manager');
            }

            // Utiliser les réponses manager depuis evaluations_manager
            const managerReponsesData = (managerEvalData.reponses_manager as any[]) || [];
            console.log('Données manager chargées:', {
              managerEvalData,
              managerReponsesData,
              nombreReponses: managerReponsesData.length,
              commentaireManager: managerEvalData.commentaire_manager,
            });
            
            // Fusionner avec les réponses collaborateur pour avoir toutes les informations
            const mergedReponses = evalData.reponses.map((r) => {
              // Essayer plusieurs façons de faire correspondre les réponses
              const managerRep = managerReponsesData.find((mr: any) => {
                // Correspondance par ID de réponse
                if (mr.id && r.id && mr.id === r.id) return true;
                // Correspondance par questionId
                if (mr.questionId && r.questionId && mr.questionId === r.questionId) return true;
                // Correspondance par question (texte)
                if (mr.question && r.question && mr.question === r.question) return true;
                return false;
              });
              
              return {
                ...r,
                noteManager: managerRep?.noteManager !== undefined ? managerRep.noteManager : undefined,
                commentaireManager: managerRep?.commentaireManager || undefined,
              };
            });
            
            console.log('Réponses fusionnées:', {
              total: mergedReponses.length,
              avecNotesManager: mergedReponses.filter(r => r.noteManager !== undefined).length,
              avecCommentairesManager: mergedReponses.filter(r => r.commentaireManager).length,
            });
            
            // Vérifier si on a vraiment des notes manager après fusion
            const hasAnyManagerNotes = mergedReponses.some(r => r.noteManager !== undefined);
            
            if (hasAnyManagerNotes || managerEvalData.commentaire_manager) {
              // On a des données manager valides
              setManagerReponses(mergedReponses);
              setCommentaireManager(managerEvalData.commentaire_manager || '');
              if (managerEvalData.scores_manager) {
                setScoresManager(managerEvalData.scores_manager as ScoreDetail);
              }
            } else {
              // Pas de données manager dans evaluations_manager, essayer evaluations.reponses
              console.log('Pas de notes manager trouvées après fusion, vérification dans evaluations.reponses');
              const reponsesWithManager = evalData.reponses.filter(r => r.noteManager !== undefined);
              if (reponsesWithManager.length > 0) {
                setManagerReponses(evalData.reponses);
                console.log('Utilisation des données manager depuis evaluations.reponses');
              }
              if (evalData.scores.manager) {
                setScoresManager(evalData.scores.manager as ScoreDetail);
              }
              setCommentaireManager(evalData.commentaires?.manager || '');
              setManagerName('');
            }
          } else {
            // Pas de données manager dans evaluations_manager, utiliser les données dans evaluations
            // Les réponses peuvent avoir des notes manager si elles ont été fusionnées
            console.log('Aucune évaluation manager trouvée dans evaluations_manager, vérification dans evaluations');
            console.log('Structure des réponses dans evaluations:', evalData.reponses.map(r => ({
              id: r.id,
              questionId: r.questionId,
              question: r.question?.substring(0, 50),
              noteCollaborateur: r.noteCollaborateur,
              noteManager: r.noteManager,
              hasCommentaireManager: !!r.commentaireManager,
            })));
            
            const reponsesWithManager = evalData.reponses.filter(r => r.noteManager !== undefined);
            console.log('Réponses avec notes manager dans evaluations:', reponsesWithManager.length);
            
            // Toujours initialiser managerReponses avec les réponses, même si elles n'ont pas de notes manager
            // Cela permet d'afficher correctement les données
            setManagerReponses(evalData.reponses);
            
            if (reponsesWithManager.length > 0) {
              console.log('Utilisation des données manager depuis evaluations.reponses');
            } else {
              console.log('Aucune note manager trouvée dans evaluations.reponses');
            }
            if (evalData.scores.manager) {
              setScoresManager(evalData.scores.manager);
            }
            setCommentaireManager(evalData.commentaires?.manager || '');
            setManagerName('');
          }
        } catch (managerError: any) {
          // Si l'accès à evaluations_manager est bloqué par RLS, utiliser les données dans evaluations
          console.error('Erreur lors du chargement des évaluations manager:', managerError);
          console.log('Tentative d\'utilisation des données dans evaluations');
          console.log('Structure des réponses dans evaluations:', evalData.reponses.map(r => ({
            id: r.id,
            questionId: r.questionId,
            question: r.question?.substring(0, 50),
            noteCollaborateur: r.noteCollaborateur,
            noteManager: r.noteManager,
            hasCommentaireManager: !!r.commentaireManager,
          })));
          
          const reponsesWithManager = evalData.reponses.filter(r => r.noteManager !== undefined);
          console.log('Réponses avec notes manager dans evaluations:', reponsesWithManager.length);
          
          // Toujours initialiser managerReponses avec les réponses, même si elles n'ont pas de notes manager
          setManagerReponses(evalData.reponses);
          
          if (reponsesWithManager.length > 0) {
            console.log('Utilisation des données manager depuis evaluations.reponses (fallback)');
          } else {
            console.log('Aucune note manager trouvée dans evaluations.reponses (fallback)');
          }
          
          if (evalData.scores.manager) {
            setScoresManager(evalData.scores.manager);
          }
          setCommentaireManager(evalData.commentaires?.manager || '');
          setManagerName('');
        }
      }
    } catch (err: any) {
      console.error('Erreur lors du chargement:', err);
      setError(err.message || 'Erreur lors du chargement de l\'évaluation');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4" />
          <p className="text-gray-600">Chargement de l'évaluation...</p>
        </div>
      </div>
    );
  }

  if (error || !evaluation) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-4">
            <AlertCircle size={48} className="mx-auto" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Erreur</h2>
          <p className="text-gray-600 mb-4">
            {error || 'Évaluation non trouvée'}
          </p>
          <Button variant="primary" onClick={() => window.location.href = '/'}>
            Retour à l'accueil
          </Button>
        </div>
      </div>
    );
  }

  const scores = evaluation.scores.autoEvaluation;
  const scoresMgr = scoresManager || evaluation.scores.manager;
  const recommandations = generateRecommendations(
    evaluation.collaborateur.poste,
    scores
  );

  // Calculer les moyennes originales (sur 5) pour affichage avec coefficient
  const moyenneSoftSkills = scores.softSkills / 20;
  const moyenneHardSkills = scores.hardSkills / 20;
  const moyennePerformanceProjet = scores.performanceProjet / 20;
  const moyenneIA = scores.competencesIA / 20;
  
  // Calculer les moyennes manager si disponibles
  const moyenneSoftSkillsMgr = scoresMgr ? scoresMgr.softSkills / 20 : 0;
  const moyenneHardSkillsMgr = scoresMgr ? scoresMgr.hardSkills / 20 : 0;
  const moyennePerformanceProjetMgr = scoresMgr ? scoresMgr.performanceProjet / 20 : 0;
  const moyenneIAMgr = scoresMgr ? scoresMgr.competencesIA / 20 : 0;

  // Données pour le graphique radar principal
  const radarData = [
    { subject: 'Soft Skills', value: scores.softSkills },
    { subject: 'Hard Skills', value: scores.hardSkills },
    { subject: 'Performance Projet', value: scores.performanceProjet },
  ];

  // Données pour le graphique radar IA (compétences IA par catégorie)
  const iaQuestions = evaluation.reponses.filter((r) => r.categorieIA);
  const iaReponses = iaQuestions.map((r) => r.noteCollaborateur);
  const iaMoyenne = iaReponses.length > 0
    ? iaReponses.reduce((a, b) => a + b, 0) / iaReponses.length * 20
    : 0;

  const iaRadarData = [
    { subject: 'Compétences IA', value: iaMoyenne },
    { subject: 'Utilisation outils', value: iaMoyenne * 0.9 },
    { subject: 'Intégration projets', value: iaMoyenne * 0.85 },
  ];

  // Données pour le graphique radar IA manager si disponible
  const iaRadarDataManager = scoresMgr ? (() => {
    const iaMoyenneMgr = scoresMgr.competencesIA;
    return [
      { subject: 'Compétences IA', value: iaMoyenneMgr },
      { subject: 'Utilisation outils', value: iaMoyenneMgr * 0.9 },
      { subject: 'Intégration projets', value: iaMoyenneMgr * 0.85 },
    ];
  })() : [];

  // Données pour les graphiques en barres
  const barData = [
    { name: 'Soft Skills', value: scores.softSkills, value2: scoresMgr?.softSkills },
    { name: 'Hard Skills', value: scores.hardSkills, value2: scoresMgr?.hardSkills },
    { name: 'Performance Projet', value: scores.performanceProjet, value2: scoresMgr?.performanceProjet },
    { name: 'Compétences IA', value: scores.competencesIA, value2: scoresMgr?.competencesIA },
  ];

  // Données pour comparaison radar
  const radarDataAuto = [
    { subject: 'Soft Skills', value: scores.softSkills },
    { subject: 'Hard Skills', value: scores.hardSkills },
    { subject: 'Performance Projet', value: scores.performanceProjet },
  ];

  const radarDataManager = scoresMgr
    ? [
        { subject: 'Soft Skills', value: scoresMgr.softSkills },
        { subject: 'Hard Skills', value: scoresMgr.hardSkills },
        { subject: 'Performance Projet', value: scoresMgr.performanceProjet },
      ]
    : [];

  // Calculer les écarts significatifs
  const ecarts = evaluation.reponses
    .map((r) => {
      const noteAuto = r.noteCollaborateur;
      const noteMgr = managerReponses.find((mr) => mr.id === r.id || mr.questionId === r.questionId)?.noteManager;
      if (noteMgr === undefined) return null;
      const ecart = Math.abs(noteAuto - noteMgr);
      return { reponse: r, ecart, noteAuto, noteMgr };
    })
    .filter((e) => e !== null && (e?.ecart || 0) > 1)
    .sort((a, b) => (b?.ecart || 0) - (a?.ecart || 0));

  // Utiliser l'analyse chargée ou une analyse par défaut
  const analyseData = analyse || {
    pointsForts: [],
    axesAmelioration: [],
    recommandationsPrioritaires: [],
    planProgression: [],
    analyseDetaillee: '',
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Résultats de l'évaluation</h1>
          <p className="text-gray-600">
            {evaluation.collaborateur.prenom} {evaluation.collaborateur.nom} -{' '}
            {PROFIL_LABELS[evaluation.collaborateur.poste]}
          </p>
          <div className="flex items-center gap-4 mt-2">
            <p className="text-sm text-gray-500">
              Date de création : {formatDate(evaluation.timestamps.creation)}
            </p>
            <Badge variant={evaluation.statut === 'validee' ? 'success' : evaluation.statut === 'soumise' ? 'info' : 'warning'}>
              {evaluation.statut}
            </Badge>
          </div>
        </div>

        {/* Scores - Auto-évaluation et Manager côte à côte */}
        <Card className="mb-8">
          <h3 className="text-lg font-semibold mb-6">Scores de l'évaluation</h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Total */}
            <div className="text-center border-r md:border-r md:border-b-0 border-b border-gray-200 pb-4 md:pb-0 pr-4">
              <div className="text-sm text-gray-600 mb-2">Score Total</div>
              <div className="space-y-2">
                <div>
                  <div className="text-2xl font-bold text-blue-600">{scores.total.toFixed(1)}%</div>
                  <div className="text-xs text-gray-500">Auto-évaluation</div>
                </div>
                {scoresMgr && (
                  <div>
                    <div className="text-2xl font-bold text-purple-600">{scoresMgr.total.toFixed(1)}%</div>
                    <div className="text-xs text-gray-500">Manager</div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Soft Skills */}
            <div className="text-center border-r md:border-r md:border-b-0 border-b border-gray-200 pb-4 md:pb-0 pr-4">
              <div className="text-sm text-gray-600 mb-2">Soft Skills</div>
              <div className="space-y-2">
                <div>
                  <div className="text-2xl font-bold text-blue-600">{scores.softSkills.toFixed(1)}%</div>
                  <div className="text-xs text-gray-500">{moyenneSoftSkills.toFixed(1)}/5</div>
                </div>
                {scoresMgr && (
                  <div>
                    <div className="text-2xl font-bold text-purple-600">{scoresMgr.softSkills.toFixed(1)}%</div>
                    <div className="text-xs text-gray-500">{moyenneSoftSkillsMgr.toFixed(1)}/5</div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Hard Skills */}
            <div className="text-center border-r md:border-r md:border-b-0 border-b border-gray-200 pb-4 md:pb-0 pr-4">
              <div className="text-sm text-gray-600 mb-2">Hard Skills</div>
              <div className="space-y-2">
                <div>
                  <div className="text-2xl font-bold text-blue-600">{scores.hardSkills.toFixed(1)}%</div>
                  <div className="text-xs text-gray-500">{(moyenneHardSkills * 2).toFixed(1)}/10</div>
                </div>
                {scoresMgr && (
                  <div>
                    <div className="text-2xl font-bold text-purple-600">{scoresMgr.hardSkills.toFixed(1)}%</div>
                    <div className="text-xs text-gray-500">{(moyenneHardSkillsMgr * 2).toFixed(1)}/10</div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Performance Projet */}
            <div className="text-center border-r md:border-r md:border-b-0 border-b border-gray-200 pb-4 md:pb-0 pr-4">
              <div className="text-sm text-gray-600 mb-2">Performance Projet</div>
              <div className="space-y-2">
                <div>
                  <div className="text-2xl font-bold text-blue-600">{scores.performanceProjet.toFixed(1)}%</div>
                  <div className="text-xs text-gray-500">{(moyennePerformanceProjet * 2).toFixed(1)}/10</div>
                </div>
                {scoresMgr && (
                  <div>
                    <div className="text-2xl font-bold text-purple-600">{scoresMgr.performanceProjet.toFixed(1)}%</div>
                    <div className="text-xs text-gray-500">{(moyennePerformanceProjetMgr * 2).toFixed(1)}/10</div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Compétences IA */}
            <div className="text-center">
              <div className="text-sm text-gray-600 mb-2 flex items-center justify-center gap-1">
                <Sparkles size={14} />
                Compétences IA
              </div>
              <div className="space-y-2">
                <div>
                  <div className="text-2xl font-bold text-ia-purple">{scores.competencesIA.toFixed(1)}%</div>
                  <div className="text-xs text-gray-500">{(moyenneIA * 2).toFixed(1)}/10</div>
                  <Badge variant="ia" className="mt-1 text-xs">
                    {NIVEAU_IA_LABELS[scores.niveauIA]}
                  </Badge>
                </div>
                {scoresMgr && (
                  <div>
                    <div className="text-2xl font-bold text-ia-purple">{scoresMgr.competencesIA.toFixed(1)}%</div>
                    <div className="text-xs text-gray-500">{(moyenneIAMgr * 2).toFixed(1)}/10</div>
                    <Badge variant="ia" className="mt-1 text-xs">
                      {NIVEAU_IA_LABELS[scoresMgr.niveauIA]}
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Légende */}
          <div className="flex items-center justify-center gap-6 mt-6 pt-4 border-t border-gray-200">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-blue-600"></div>
              <span className="text-sm font-medium text-gray-700">Auto-évaluation</span>
            </div>
            {scoresMgr ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-purple-600"></div>
                <span className="text-sm font-medium text-gray-700">
                  Évaluation Manager{managerName ? ` - ${managerName}` : ''}
                </span>
              </div>
            ) : (
              <div className="text-sm text-gray-400 italic">
                Évaluation manager en attente
              </div>
            )}
          </div>
        </Card>

        {/* Graphiques radar */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {scoresMgr ? (
            <Card>
              <RadarChartComponent
                data={radarDataAuto}
                secondData={radarDataManager}
                title="Comparaison Auto-évaluation vs Manager"
                secondDataKey="value2"
                color="#3b82f6"
                secondColor="#8b5cf6"
              />
            </Card>
          ) : (
            <Card>
              <RadarChartComponent
                data={radarDataAuto}
                title="Compétences principales"
                maxValue={100}
                color="#2563eb"
              />
            </Card>
          )}
          {scoresMgr ? (
            <Card>
              <RadarChartComponent
                data={iaRadarData}
                secondData={iaRadarDataManager}
                title="Compétences Intelligence Artificielle"
                secondDataKey="value2"
                maxValue={100}
                color="#3b82f6"
                secondColor="#8b5cf6"
              />
            </Card>
          ) : (
            <Card>
              <RadarChartComponent
                data={iaRadarData}
                title="Compétences Intelligence Artificielle"
                maxValue={100}
                color="#8b5cf6"
              />
            </Card>
          )}
        </div>

        {/* Graphique en barres */}
        <Card className="mb-8">
          <BarChartComponent
            data={barData}
            title={scoresMgr ? "Comparaison Auto-évaluation vs Manager" : "Comparaison des scores"}
            maxValue={100}
            dataKey="value"
            secondDataKey={scoresMgr ? "value2" : undefined}
            color="#2563eb"
            secondColor="#8b5cf6"
          />
        </Card>

        {/* Analyse et recommandations */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <CheckCircle className="text-green-600" size={20} />
              Points forts
            </h3>
            {analyseData.pointsForts.length > 0 ? (
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
            {analyseData.axesAmelioration.length > 0 ? (
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
            <ol className="space-y-2">
              {(analyseData.planProgression.length > 0 ? analyseData.planProgression : recommandations.planProgression).map((etape, index) => (
                <li key={index} className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-ia-purple text-white rounded-full flex items-center justify-center text-sm font-medium">
                    {index + 1}
                  </span>
                  <span className="text-gray-700">{etape}</span>
                </li>
              ))}
            </ol>
          </div>
          
          {/* Analyse détaillée */}
          {analyseData.analyseDetaillee && (
            <div className="mt-6 p-4 bg-white rounded-lg border border-gray-200">
              <h4 className="font-semibold text-gray-700 mb-3">Analyse détaillée</h4>
              <p className="text-gray-600 whitespace-pre-line leading-relaxed">
                {analyseData.analyseDetaillee}
              </p>
              {analyse?.dateGeneration && (
                <p className="text-xs text-gray-500 mt-3">
                  Analyse générée le {formatDate(analyse.dateGeneration)}
                </p>
              )}
            </div>
          )}
        </Card>

        {/* Recommandations prioritaires */}
        {analyseData.recommandationsPrioritaires.length > 0 && (
          <Card className="mb-8">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="text-primary-600" size={20} />
              Recommandations prioritaires
            </h3>
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
          </Card>
        )}

        {/* Écarts significatifs */}
        {ecarts.length > 0 && (
          <Card className="mb-8">
            <h3 className="text-lg font-semibold mb-4">Écarts significatifs entre auto-évaluation et évaluation manager (&gt; 1 point)</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Groupe
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Question
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Note Auto
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Note Manager
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Écart
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {ecarts.slice(0, 10).map((ecart, index) => (
                    <tr key={index}>
                      <td className="px-4 py-3 text-sm text-gray-700 font-medium">
                        {ecart?.reponse.groupe ? GROUPE_LABELS[ecart.reponse.groupe] : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {ecart?.reponse.question}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">{ecart?.noteAuto}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{ecart?.noteMgr}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className="font-medium text-red-600">{ecart?.ecart}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Détail des évaluations - Collaborateur et Manager côte à côte */}
        <Card className="mb-8">
          <h3 className="text-lg font-semibold mb-6">Détail des évaluations</h3>
          
          {/* Onglets pour les rubriques */}
          <div className="flex gap-2 mb-6">
            {(['soft_skills', 'hard_skills', 'performance_projet'] as GroupeQuestion[]).map((groupe) => {
              const reponsesGroupe = evaluation.reponses.filter((r) => r.groupe === groupe);
              const hasManagerEval = reponsesGroupe.some(r => {
                const managerRep = managerReponses.find(mr => mr.id === r.id || mr.questionId === r.questionId);
                return managerRep?.noteManager !== undefined;
              });
              
              return (
                <div key={groupe} className="flex-1 py-2 px-4 rounded-lg font-medium bg-gray-200 text-gray-700">
                  {GROUPE_LABELS[groupe]}
                  {hasManagerEval && (
                    <Badge variant="success" className="ml-2 text-xs">
                      Évalué
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>

          {/* Questions par groupe */}
          <div className="space-y-8">
            {(['soft_skills', 'hard_skills', 'performance_projet'] as GroupeQuestion[]).map((groupe) => {
              const reponsesGroupe = evaluation.reponses.filter((r) => r.groupe === groupe);
              if (reponsesGroupe.length === 0) return null;
              
              return (
                <div key={groupe} className="border-b pb-8 last:border-b-0">
                  <h4 className="text-xl font-semibold text-gray-900 mb-6">{GROUPE_LABELS[groupe]}</h4>
                  <div className="space-y-6">
                    {reponsesGroupe.map((reponse) => {
                      // Essayer plusieurs façons de trouver la réponse manager correspondante
                      const managerRep = managerReponses.find((mr) => {
                        // Correspondance par ID de réponse
                        if (mr.id && reponse.id && mr.id === reponse.id) return true;
                        // Correspondance par questionId
                        if (mr.questionId && reponse.questionId && mr.questionId === reponse.questionId) return true;
                        // Correspondance par question (texte) - fallback
                        if (mr.question && reponse.question && mr.question === reponse.question) return true;
                        return false;
                      });
                      const hasManagerNote = managerRep?.noteManager !== undefined;
                      
                      // Log de débogage si on ne trouve pas de correspondance mais qu'il y a des données manager
                      if (!hasManagerNote && managerReponses.length > 0 && managerReponses.some(mr => mr.noteManager !== undefined)) {
                        console.log('Pas de correspondance trouvée pour:', {
                          reponseId: reponse.id,
                          reponseQuestionId: reponse.questionId,
                          reponseQuestion: reponse.question?.substring(0, 50),
                          managerReponsesIds: managerReponses.map(mr => ({ id: mr.id, questionId: mr.questionId })),
                        });
                      }
                      
                      return (
                        <div key={reponse.id} className="border border-gray-200 rounded-lg p-4 bg-white">
                          <div className="flex items-start justify-between mb-4">
                            <h5 className="font-medium text-gray-900 text-lg flex-1">{reponse.question}</h5>
                            {reponse.categorieIA && (
                              <Badge variant="ia" className="ml-2">
                                <Sparkles size={14} className="mr-1" />
                                IA
                              </Badge>
                            )}
                          </div>
                          
                          {/* Grille avec les deux évaluations côte à côte */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Évaluation Collaborateur */}
                            <div className="border-r md:border-r md:border-b-0 border-b border-gray-200 pr-4 pb-4 md:pb-0">
                              <div className="flex items-center gap-2 mb-3">
                                <div className="w-3 h-3 rounded-full bg-blue-600"></div>
                                <h6 className="font-semibold text-gray-900">Auto-évaluation</h6>
                              </div>
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-2xl font-bold text-blue-600">{reponse.noteCollaborateur}</span>
                                  <span className="text-sm text-gray-600">/ 5</span>
                                  <Badge variant="info" className="ml-2">
                                    {NOTE_LABELS[reponse.noteCollaborateur]}
                                  </Badge>
                                </div>
                                {reponse.commentaireCollaborateur && (
                                  <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                    <p className="text-sm text-gray-700 italic">
                                      "{reponse.commentaireCollaborateur}"
                                    </p>
                                  </div>
                                )}
                                {!reponse.commentaireCollaborateur && (
                                  <p className="text-sm text-gray-400 italic">Aucun commentaire</p>
                                )}
                              </div>
                            </div>
                            
                            {/* Évaluation Manager */}
                            <div className="pl-4">
                              {hasManagerNote ? (
                                <>
                                  <div className="flex items-center gap-2 mb-3">
                                    <div className="w-3 h-3 rounded-full bg-purple-600"></div>
                                    <h6 className="font-semibold text-gray-900">
                                      Évaluation Manager{managerName ? ` - ${managerName}` : ''}
                                    </h6>
                                  </div>
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                      <span className="text-2xl font-bold text-purple-600">{managerRep?.noteManager}</span>
                                      <span className="text-sm text-gray-600">/ 5</span>
                                      <Badge variant="ia" className="ml-2">
                                        {NOTE_LABELS[managerRep?.noteManager || 0]}
                                      </Badge>
                                    </div>
                                    {managerRep?.commentaireManager && (
                                      <div className="mt-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                                        <p className="text-sm text-gray-700 italic">
                                          "{managerRep.commentaireManager}"
                                        </p>
                                      </div>
                                    )}
                                    {!managerRep?.commentaireManager && (
                                      <p className="text-sm text-gray-400 italic">Aucun commentaire</p>
                                    )}
                                    {/* Afficher l'écart si significatif */}
                                    {Math.abs(reponse.noteCollaborateur - (managerRep?.noteManager || 0)) > 1 && (
                                      <div className="mt-2">
                                        <Badge variant="warning" className="text-xs">
                                          Écart: {Math.abs(reponse.noteCollaborateur - (managerRep?.noteManager || 0))} point(s)
                                        </Badge>
                                      </div>
                                    )}
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div className="flex items-center gap-2 mb-3">
                                    <div className="w-3 h-3 rounded-full bg-gray-300"></div>
                                    <h6 className="font-semibold text-gray-500">Évaluation Manager</h6>
                                  </div>
                                  <p className="text-sm text-gray-400 italic">En attente d'évaluation</p>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Commentaires */}
        {(evaluation.commentaires?.collaborateur || commentaireManager || evaluation.commentaires?.manager) && (
          <Card className="mb-8">
            <h3 className="text-lg font-semibold mb-4">Commentaires</h3>
            {evaluation.commentaires?.collaborateur && (
              <div className="mb-4">
                <h4 className="font-medium text-gray-700 mb-2">Commentaire collaborateur</h4>
                <p className="text-gray-600 whitespace-pre-line bg-gray-50 p-4 rounded-lg">
                  {evaluation.commentaires.collaborateur}
                </p>
              </div>
            )}
            {(commentaireManager || evaluation.commentaires?.manager) && (
              <div>
                <h4 className="font-medium text-gray-700 mb-2">
                  Commentaire manager{managerName ? ` - ${managerName}` : ''}
                </h4>
                <p className="text-gray-600 whitespace-pre-line bg-gray-50 p-4 rounded-lg">
                  {commentaireManager || evaluation.commentaires?.manager}
                </p>
              </div>
            )}
          </Card>
        )}

        {/* Actions */}
        <div className="flex justify-end">
          <Button
            variant="outline"
            onClick={async () => {
              try {
                // Convertir AnalyseGemini en AnalyseCompetences pour l'export PDF
                const analyseForPDF: AnalyseCompetences | undefined = analyse
                  ? {
                      pointsForts: analyse.pointsForts,
                      axesAmelioration: analyse.axesAmelioration,
                      recommandationsPrioritaires: analyse.recommandationsPrioritaires,
                      analyseDetaillee: analyse.analyseDetaillee,
                    }
                  : undefined;
                await exportEvaluationToPDF(evaluation, analyseForPDF);
              } catch (error) {
                console.error('Erreur lors de l\'export PDF:', error);
                alert('Erreur lors de l\'export PDF. Veuillez réessayer.');
              }
            }}
          >
            <Download size={16} className="mr-2" />
            Exporter en PDF
          </Button>
        </div>
      </div>
    </div>
  );
}

