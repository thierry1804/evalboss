import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Textarea } from '../../components/ui/Textarea';
import { RadarChartComponent } from '../../components/charts/RadarChart';
import { BarChartComponent } from '../../components/charts/BarChart';
import { Evaluation, Reponse, ScoreDetail } from '../../types';
import { PROFIL_LABELS, NIVEAU_IA_LABELS, NOTE_LABELS, GROUPE_LABELS, GroupeQuestion } from '../../types';
import { formatDate, calculateAnciennete } from '../../lib/utils';
import { calculateManagerScores, isManagerEvaluationComplete } from '../../lib/scoreCalculator';
import { Sparkles, ArrowLeft, Save } from 'lucide-react';

export function EvaluationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [managerReponses, setManagerReponses] = useState<Reponse[]>([]);
  const [commentaireManager, setCommentaireManager] = useState('');
  const [scoresManager, setScoresManager] = useState<ScoreDetail | null>(null);
  const [currentGroupe, setCurrentGroupe] = useState<GroupeQuestion>('soft_skills');

  useEffect(() => {
    if (id) {
      loadEvaluation();
    }
  }, [id]);

  useEffect(() => {
    if (managerReponses.length > 0) {
      const scores = calculateManagerScores(managerReponses);
      setScoresManager(scores);
    } else {
      setScoresManager(null);
    }
  }, [managerReponses]);

  const loadEvaluation = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('evaluations')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      if (data) {
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
          scores: data.scores as { autoEvaluation: ScoreDetail; manager?: ScoreDetail },
          commentaires: (data.commentaires as any) || {},
          statut: data.statut as any,
          timestamps: {
            creation: new Date(data.created_at),
            soumission: data.timestamps?.soumission ? new Date(data.timestamps.soumission) : undefined,
            validation: data.timestamps?.validation ? new Date(data.timestamps.validation) : undefined,
          },
        };

        setEvaluation(evalData);
        
        // Charger les données manager depuis evaluations_manager
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: managerEvalData, error: managerEvalError } = await supabase
            .from('evaluations_manager')
            .select('*')
            .eq('evaluation_id', id)
            .eq('manager_id', user.id)
            .maybeSingle();

          // Avec maybeSingle(), data sera null si aucune ligne trouvée (pas d'erreur)
          if (managerEvalData && !managerEvalError) {
            // Utiliser les réponses manager depuis evaluations_manager
            const managerReponses = (managerEvalData.reponses_manager as any[]) || [];
            // Fusionner avec les réponses collaborateur pour avoir toutes les informations
            const mergedReponses = evalData.reponses.map((r) => {
              const managerRep = managerReponses.find((mr: any) => mr.id === r.id);
              return {
                ...r,
                noteManager: managerRep?.noteManager !== undefined ? managerRep.noteManager : undefined,
                commentaireManager: managerRep?.commentaireManager || undefined,
              };
            });
            setManagerReponses(mergedReponses);
            setCommentaireManager(managerEvalData.commentaire_manager || '');
            if (managerEvalData.scores_manager) {
              setScoresManager(managerEvalData.scores_manager as ScoreDetail);
            }
          } else {
            // Sinon, initialiser avec les réponses collaborateur seulement
            setManagerReponses(evalData.reponses.map(r => ({
              ...r,
              noteManager: undefined,
              commentaireManager: undefined,
            })));
            setCommentaireManager(evalData.commentaires?.manager || '');
          }
        } else {
          // Pas de manager connecté, initialiser avec les réponses collaborateur
          setManagerReponses(evalData.reponses.map(r => ({
            ...r,
            noteManager: undefined,
            commentaireManager: undefined,
          })));
          setCommentaireManager(evalData.commentaires?.manager || '');
        }
      }
    } catch (error: any) {
      console.error('Erreur:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleManagerNoteChange = (reponseId: string, note: number) => {
    setManagerReponses((prev) =>
      prev.map((r) => (r.id === reponseId ? { ...r, noteManager: note } : r))
    );
  };

  const handleManagerCommentaireChange = (reponseId: string, commentaire: string) => {
    setManagerReponses((prev) =>
      prev.map((r) => (r.id === reponseId ? { ...r, commentaireManager: commentaire } : r))
    );
  };

  const saveManagerEvaluation = async () => {
    if (!evaluation || !id) return;

    setIsSaving(true);
    try {
      // Récupérer l'ID du manager connecté
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Manager non authentifié');
      }

      // Recalculer les scores manager avant de sauvegarder
      const calculatedScores = calculateManagerScores(managerReponses);

      // Préparer les réponses manager pour la sauvegarde (nettoyer les propriétés undefined)
      const cleanedManagerReponses = managerReponses.map((r) => {
        const cleaned: any = {
          id: r.id,
          questionId: r.questionId,
          groupe: r.groupe,
          question: r.question,
          categorieIA: r.categorieIA,
          noteCollaborateur: r.noteCollaborateur,
        };
        if (r.commentaireCollaborateur) cleaned.commentaireCollaborateur = r.commentaireCollaborateur;
        if (r.noteManager !== undefined) cleaned.noteManager = r.noteManager;
        if (r.commentaireManager) cleaned.commentaireManager = r.commentaireManager;
        return cleaned;
      });

      // Sauvegarder dans evaluations_manager
      const { error: managerError } = await supabase
        .from('evaluations_manager')
        .upsert(
          {
            evaluation_id: id,
            manager_id: user.id,
            reponses_manager: cleanedManagerReponses,
            scores_manager: calculatedScores || {},
            commentaire_manager: commentaireManager || null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'evaluation_id,manager_id' }
        );

      if (managerError) throw managerError;

      // Mettre à jour aussi la table evaluations avec les scores manager et commentaires
      const updatedScores = {
        ...evaluation.scores,
        manager: calculatedScores || undefined,
      };

      const updatedCommentaires = {
        ...evaluation.commentaires,
        manager: commentaireManager || undefined,
      };

      // Mettre à jour les réponses dans evaluations avec les notes manager
      const updatedReponses = evaluation.reponses.map((r) => {
        const managerRep = managerReponses.find((mr) => mr.id === r.id);
        return {
          ...r,
          noteManager: managerRep?.noteManager,
          commentaireManager: managerRep?.commentaireManager,
        };
      });

      const { error: evalError } = await supabase
        .from('evaluations')
        .update({
          reponses: updatedReponses,
          scores: updatedScores,
          commentaires: updatedCommentaires,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (evalError) {
        // Si l'erreur vient des politiques RLS, on continue quand même car evaluations_manager est sauvegardé
        console.warn('Erreur lors de la mise à jour de evaluations (peut être normal si RLS bloque):', evalError);
      }

      // Mettre à jour les scores manager dans le state
      setScoresManager(calculatedScores);

      // Recharger l'évaluation
      await loadEvaluation();
      
      alert('Évaluation manager sauvegardée avec succès !');
    } catch (error: any) {
      console.error('Erreur lors de la sauvegarde:', error);
      alert('Erreur lors de la sauvegarde: ' + (error.message || 'Erreur inconnue'));
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || !evaluation) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4" />
          <p className="text-gray-600">Chargement de l'évaluation...</p>
        </div>
      </div>
    );
  }

  const scoresAuto = evaluation.scores.autoEvaluation;
  const scoresMgr = scoresManager || evaluation.scores.manager;

  // Calculer les moyennes originales (sur 5) pour affichage avec coefficient
  const moyenneSoftSkillsAuto = scoresAuto.softSkills / 20;
  const moyenneHardSkillsAuto = scoresAuto.hardSkills / 20;
  const moyennePerformanceProjetAuto = scoresAuto.performanceProjet / 20;
  const moyenneIAAuto = scoresAuto.competencesIA / 20;
  
  const moyenneSoftSkillsMgr = scoresMgr ? scoresMgr.softSkills / 20 : 0;
  const moyenneHardSkillsMgr = scoresMgr ? scoresMgr.hardSkills / 20 : 0;
  const moyennePerformanceProjetMgr = scoresMgr ? scoresMgr.performanceProjet / 20 : 0;
  const moyenneIAMgr = scoresMgr ? scoresMgr.competencesIA / 20 : 0;

  // Données pour comparaison radar
  const radarDataAuto = [
    { subject: 'Soft Skills', value: scoresAuto.softSkills },
    { subject: 'Hard Skills', value: scoresAuto.hardSkills },
    { subject: 'Performance Projet', value: scoresAuto.performanceProjet },
  ];

  const radarDataManager = scoresMgr
    ? [
        { subject: 'Soft Skills', value: scoresMgr.softSkills },
        { subject: 'Hard Skills', value: scoresMgr.hardSkills },
        { subject: 'Performance Projet', value: scoresMgr.performanceProjet },
      ]
    : [];

  // Données pour comparaison barres
  const barData = [
    {
      name: 'Soft Skills',
      value: scoresAuto.softSkills,
      value2: scoresMgr?.softSkills,
    },
    {
      name: 'Hard Skills',
      value: scoresAuto.hardSkills,
      value2: scoresMgr?.hardSkills,
    },
    {
      name: 'Performance Projet',
      value: scoresAuto.performanceProjet,
      value2: scoresMgr?.performanceProjet,
    },
    {
      name: 'Compétences IA',
      value: scoresAuto.competencesIA,
      value2: scoresMgr?.competencesIA,
    },
  ];

  // Calculer les écarts significatifs
  const ecarts = evaluation.reponses
    .map((r) => {
      const noteAuto = r.noteCollaborateur;
      const noteMgr = managerReponses.find((mr) => mr.id === r.id)?.noteManager;
      if (noteMgr === undefined) return null;
      const ecart = Math.abs(noteAuto - noteMgr);
      return { reponse: r, ecart, noteAuto, noteMgr };
    })
    .filter((e) => e !== null && (e?.ecart || 0) > 1)
    .sort((a, b) => (b?.ecart || 0) - (a?.ecart || 0));

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <Button variant="ghost" onClick={() => navigate('/admin/evaluations')}>
              <ArrowLeft size={16} className="mr-2" />
              Retour à la liste
            </Button>
            <h1 className="text-3xl font-bold text-gray-900 mt-4 mb-2">
              Détail de l'évaluation
            </h1>
            <p className="text-gray-600">
              {evaluation.collaborateur.prenom} {evaluation.collaborateur.nom} -{' '}
              {PROFIL_LABELS[evaluation.collaborateur.poste]}
            </p>
          </div>
          <Button 
            variant="primary" 
            onClick={saveManagerEvaluation} 
            isLoading={isSaving}
            disabled={!isManagerEvaluationComplete(managerReponses)}
          >
            <Save size={16} className="mr-2" />
            Sauvegarder
          </Button>
        </div>

        {/* Informations collaborateur */}
        <Card className="mb-6">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div>
              <p className="text-sm text-gray-500">Matricule</p>
              <p className="font-medium">{evaluation.collaborateur.matricule}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Niveau</p>
              <p className="font-medium">{evaluation.collaborateur.niveauSeniorite}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Date d'intégration</p>
              <p className="font-medium">{formatDate(evaluation.collaborateur.dateIntegration)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Ancienneté</p>
              <p className="font-medium">{calculateAnciennete(evaluation.collaborateur.dateIntegration)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Date de soumission</p>
              <p className="font-medium">
                {evaluation.timestamps.soumission 
                  ? formatDate(evaluation.timestamps.soumission)
                  : 'Non soumise'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Statut</p>
              <Badge variant={evaluation.statut === 'validee' ? 'success' : 'info'}>
                {evaluation.statut}
              </Badge>
            </div>
          </div>
        </Card>

        {/* Scores collaborateur - toujours affichés */}
        <Card className="mb-6">
          <h3 className="text-lg font-semibold mb-4">Scores Auto-évaluation</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary-600">{scoresAuto.total.toFixed(1)}%</div>
              <div className="text-sm text-gray-600">Total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{scoresAuto.softSkills.toFixed(1)}%</div>
              <div className="text-sm text-gray-600">Soft Skills</div>
              <div className="text-xs text-gray-500 mt-1">{moyenneSoftSkillsAuto.toFixed(1)}/5</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{scoresAuto.hardSkills.toFixed(1)}%</div>
              <div className="text-sm text-gray-600">Hard Skills</div>
              <div className="text-xs text-gray-500 mt-1">{(moyenneHardSkillsAuto * 2).toFixed(1)}/10</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{scoresAuto.performanceProjet.toFixed(1)}%</div>
              <div className="text-sm text-gray-600">Performance</div>
              <div className="text-xs text-gray-500 mt-1">{(moyennePerformanceProjetAuto * 2).toFixed(1)}/10</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-ia-purple">{scoresAuto.competencesIA.toFixed(1)}%</div>
              <div className="text-sm text-gray-600">Compétences IA</div>
              <div className="text-xs text-gray-500 mt-1">{(moyenneIAAuto * 2).toFixed(1)}/10</div>
              <Badge variant="ia" className="mt-1">
                {NIVEAU_IA_LABELS[scoresAuto.niveauIA]}
              </Badge>
            </div>
          </div>
        </Card>

        {/* Scores manager - affichés seulement si le manager a donné des notes */}
        {scoresMgr && (
          <Card className="mb-6">
            <h3 className="text-lg font-semibold mb-4">Scores Manager</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary-600">{scoresMgr.total.toFixed(1)}%</div>
                <div className="text-sm text-gray-600">Total</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{scoresMgr.softSkills.toFixed(1)}%</div>
                <div className="text-sm text-gray-600">Soft Skills</div>
                <div className="text-xs text-gray-500 mt-1">{moyenneSoftSkillsMgr.toFixed(1)}/5</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{scoresMgr.hardSkills.toFixed(1)}%</div>
                <div className="text-sm text-gray-600">Hard Skills</div>
                <div className="text-xs text-gray-500 mt-1">{(moyenneHardSkillsMgr * 2).toFixed(1)}/10</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{scoresMgr.performanceProjet.toFixed(1)}%</div>
                <div className="text-sm text-gray-600">Performance</div>
                <div className="text-xs text-gray-500 mt-1">{(moyennePerformanceProjetMgr * 2).toFixed(1)}/10</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-ia-purple">{scoresMgr.competencesIA.toFixed(1)}%</div>
                <div className="text-sm text-gray-600">Compétences IA</div>
                <div className="text-xs text-gray-500 mt-1">{(moyenneIAMgr * 2).toFixed(1)}/10</div>
                <Badge variant="ia" className="mt-1">
                  {NIVEAU_IA_LABELS[scoresMgr.niveauIA]}
                </Badge>
              </div>
            </div>
          </Card>
        )}

        {/* Comparaison graphique - affichée seulement si le manager a donné des notes */}
        {scoresMgr && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <Card>
              <RadarChartComponent
                data={radarDataAuto}
                secondData={radarDataManager}
                title="Comparaison Auto-évaluation vs Manager"
                secondDataKey="value2"
              />
            </Card>
            <Card>
              <BarChartComponent
                data={barData}
                title="Comparaison détaillée"
                dataKey="value"
                secondDataKey="value2"
              />
            </Card>
          </div>
        )}

        {/* Écarts significatifs */}
        {ecarts.length > 0 && (
          <Card className="mb-6">
            <h3 className="text-lg font-semibold mb-4">Écarts significatifs (&gt; 1 point)</h3>
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

        {/* Questions avec saisie manager - Par onglets */}
        <Card className="mb-6">
          <h3 className="text-lg font-semibold mb-6">Évaluation Manager</h3>
          
          {/* Onglets pour les rubriques */}
          <div className="flex gap-2 mb-6">
            {(['soft_skills', 'hard_skills', 'performance_projet'] as GroupeQuestion[]).map((groupe) => (
              <button
                key={groupe}
                onClick={() => {
                  setCurrentGroupe(groupe);
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

          {/* Questions du groupe actif */}
          <div className="space-y-6">
            {managerReponses
              .filter((r) => r.groupe === currentGroupe)
              .map((reponse) => (
                <div key={reponse.id} className="border-b pb-6 last:border-b-0">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 mb-2">{reponse.question}</h4>
                      {reponse.categorieIA && (
                        <Badge variant="ia" className="mb-2">
                          <Sparkles size={14} className="mr-1" />
                          IA
                        </Badge>
                      )}
                      <div className="mt-2 text-sm text-gray-600">
                        <strong>Auto-évaluation:</strong> Note {reponse.noteCollaborateur} -{' '}
                        {NOTE_LABELS[reponse.noteCollaborateur]}
                        {reponse.commentaireCollaborateur && (
                          <div className="mt-1 italic">"{reponse.commentaireCollaborateur}"</div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="ml-6 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Votre note (1-5)
                      </label>
                      <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((note) => (
                          <button
                            key={note}
                            type="button"
                            onClick={() => handleManagerNoteChange(reponse.id, note)}
                            className={`
                              px-4 py-2 rounded-lg font-medium transition-colors
                              ${
                                reponse.noteManager === note
                                  ? 'bg-primary-600 text-white'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }
                            `}
                          >
                            {note}
                          </button>
                        ))}
                      </div>
                    </div>

                    <Textarea
                      label="Votre commentaire (optionnel)"
                      value={reponse.commentaireManager || ''}
                      onChange={(e) =>
                        handleManagerCommentaireChange(reponse.id, e.target.value)
                      }
                      maxLength={500}
                      rows={2}
                    />
                  </div>
                </div>
              ))}
          </div>
        </Card>

        {/* Commentaire manager global */}
        <Card className="mb-6">
          <h3 className="text-lg font-semibold mb-4">Commentaire Manager</h3>
          <Textarea
            value={commentaireManager}
            onChange={(e) => setCommentaireManager(e.target.value)}
            maxLength={1000}
            showCharCount
            rows={5}
            placeholder="Ajoutez un commentaire général sur l'évaluation..."
          />
        </Card>

      </div>
    </div>
  );
}

