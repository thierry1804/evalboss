import { create } from 'zustand';
import { Evaluation, Collaborateur, Reponse, QuestionForm, ScoreDetail } from '../types';
import { calculateScores } from '../lib/scoreCalculator';
import { generateId } from '../lib/utils';
import { supabase } from '../lib/supabase';
import { getAllQuestionsForProfil } from '../data/questions';

interface EvaluationState {
  currentEvaluation: Evaluation | null;
  questions: QuestionForm[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  initializeEvaluation: (collaborateur: Collaborateur) => Promise<void>;
  loadEvaluation: (evaluationId: string) => Promise<void>;
  saveReponse: (questionId: string, note: number, commentaire?: string, reponseId?: string) => void;
  saveCommentaireFinal: (commentaire: string) => void;
  calculateAndUpdateScores: () => void;
  submitEvaluation: () => Promise<boolean>;
  saveDraft: () => Promise<boolean>;
  resetEvaluation: () => void;
}

export const useEvaluationStore = create<EvaluationState>((set, get) => ({
  currentEvaluation: null,
  questions: [],
  isLoading: false,
  error: null,

  initializeEvaluation: async (collaborateur: Collaborateur) => {
    set({ isLoading: true, error: null });
    
    try {
      // Charger les questions pour ce profil
      const questions = getAllQuestionsForProfil(collaborateur.poste);
      
      // Créer les réponses initiales (sans notes)
      const reponses: Reponse[] = questions.map((q) => ({
        id: generateId(),
        questionId: q.id,
        groupe: q.groupe,
        question: q.question,
        categorieIA: q.categorieIA,
        noteCollaborateur: 0,
      }));

      // Créer l'évaluation initiale
      const evaluation: Evaluation = {
        id: generateId(),
        collaborateur,
        reponses,
        scores: {
          autoEvaluation: {
            softSkills: 0,
            hardSkills: 0,
            performanceProjet: 0,
            competencesIA: 0,
            total: 0,
            niveauIA: 'debutant',
          },
        },
        commentaires: {},
        statut: 'brouillon',
        timestamps: {
          creation: new Date(),
        },
      };

      // Nettoyer les réponses (enlever les propriétés undefined)
      const reponsesCleaned = reponses.map((r) => {
        const cleaned: any = {
          id: r.id,
          questionId: r.questionId,
          groupe: r.groupe,
          question: r.question,
          categorieIA: r.categorieIA,
          noteCollaborateur: r.noteCollaborateur,
        };
        if (r.commentaireCollaborateur) {
          cleaned.commentaireCollaborateur = r.commentaireCollaborateur;
        }
        return cleaned;
      });

      // Sauvegarder en brouillon dans Supabase
      const { error: insertError } = await supabase.from('evaluations').insert({
        id: evaluation.id,
        matricule: collaborateur.matricule,
        nom: collaborateur.nom,
        prenom: collaborateur.prenom,
        poste: collaborateur.poste,
        niveau_seniorite: collaborateur.niveauSeniorite,
        date_integration: collaborateur.dateIntegration.toISOString().split('T')[0],
        date_derniere_eval: collaborateur.dateDerniereEval?.toISOString().split('T')[0] || null,
        reponses: reponsesCleaned,
        scores: evaluation.scores,
        commentaires: evaluation.commentaires || {},
        statut: evaluation.statut,
        timestamps: {
          creation: evaluation.timestamps.creation.toISOString(),
        },
      });

      if (insertError) {
        throw insertError;
      }

      set({
        currentEvaluation: evaluation,
        questions,
        isLoading: false,
      });
    } catch (error: any) {
      console.error('Erreur lors de l\'initialisation:', error);
      const errorMessage = error.message || error.details || error.hint || 'Erreur lors de l\'initialisation de l\'évaluation';
      set({
        error: errorMessage,
        isLoading: false,
      });
    }
  },

  loadEvaluation: async (evaluationId: string) => {
    set({ isLoading: true, error: null });
    
    try {
      const { data, error } = await supabase
        .from('evaluations')
        .select('*')
        .eq('id', evaluationId)
        .single();

      if (error) throw error;

      if (data) {
        // Charger les questions pour ce profil
        const questions = getAllQuestionsForProfil(data.poste as any);
        
        // Convertir les données Supabase en Evaluation
        const evaluation: Evaluation = {
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

        set({
          currentEvaluation: evaluation,
          questions,
          isLoading: false,
        });
      }
    } catch (error: any) {
      console.error('Erreur lors du chargement:', error);
      set({
        error: error.message || 'Erreur lors du chargement de l\'évaluation',
        isLoading: false,
      });
    }
  },

  saveReponse: (questionId: string, note: number, commentaire?: string, reponseId?: string) => {
    const state = get();
    if (!state.currentEvaluation) return;

    // Utiliser reponseId si fourni (plus sûr), sinon trouver par questionId
    let reponseToUpdate;
    if (reponseId) {
      reponseToUpdate = state.currentEvaluation.reponses.find((r) => r.id === reponseId);
    } else {
      reponseToUpdate = state.currentEvaluation.reponses.find((r) => r.questionId === questionId);
    }

    if (!reponseToUpdate) return;

    const reponses = state.currentEvaluation.reponses.map((r) =>
      r.id === reponseToUpdate.id
        ? {
            ...r,
            noteCollaborateur: note,
            commentaireCollaborateur: commentaire !== undefined ? commentaire : r.commentaireCollaborateur,
          }
        : r
    );

    const updatedEvaluation: Evaluation = {
      ...state.currentEvaluation,
      reponses,
    };

    // Recalculer les scores
    const scores = calculateScores(reponses);
    updatedEvaluation.scores.autoEvaluation = scores;

    set({ currentEvaluation: updatedEvaluation });
  },

  saveCommentaireFinal: (commentaire: string) => {
    const state = get();
    if (!state.currentEvaluation) return;

    set({
      currentEvaluation: {
        ...state.currentEvaluation,
        commentaires: {
          ...state.currentEvaluation.commentaires,
          collaborateur: commentaire,
        },
      },
    });
  },

  calculateAndUpdateScores: () => {
    const state = get();
    if (!state.currentEvaluation) return;

    const scores = calculateScores(state.currentEvaluation.reponses);
    set({
      currentEvaluation: {
        ...state.currentEvaluation,
        scores: {
          ...state.currentEvaluation.scores,
          autoEvaluation: scores,
        },
      },
    });
  },

  saveDraft: async () => {
    const state = get();
    if (!state.currentEvaluation) return false;

    try {
      const evaluation = state.currentEvaluation;
      
      const { error } = await supabase
        .from('evaluations')
        .update({
          reponses: evaluation.reponses,
          scores: evaluation.scores,
          commentaires: evaluation.commentaires,
          statut: evaluation.statut,
          timestamps: {
            creation: evaluation.timestamps.creation.toISOString(),
            soumission: evaluation.timestamps.soumission?.toISOString(),
            validation: evaluation.timestamps.validation?.toISOString(),
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', evaluation.id);

      if (error) throw error;
      return true;
    } catch (error: any) {
      console.error('Erreur lors de la sauvegarde:', error);
      set({ error: error.message || 'Erreur lors de la sauvegarde' });
      return false;
    }
  },

  submitEvaluation: async () => {
    const state = get();
    if (!state.currentEvaluation) return false;

    try {
      const evaluation = state.currentEvaluation;
      
      // Vérifier que toutes les questions sont répondues
      const allAnswered = evaluation.reponses.every(
        (r) => r.noteCollaborateur >= 1 && r.noteCollaborateur <= 5
      );

      if (!allAnswered) {
        set({ error: 'Veuillez répondre à toutes les questions avant de soumettre' });
        return false;
      }

      // Recalculer les scores
      const scores = calculateScores(evaluation.reponses);
      const updatedEvaluation: Evaluation = {
        ...evaluation,
        scores: {
          ...evaluation.scores,
          autoEvaluation: scores,
        },
        statut: 'soumise',
        timestamps: {
          ...evaluation.timestamps,
          soumission: new Date(),
        },
      };

      // Sauvegarder dans Supabase
      const { error } = await supabase
        .from('evaluations')
        .update({
          reponses: updatedEvaluation.reponses,
          scores: updatedEvaluation.scores,
          commentaires: updatedEvaluation.commentaires,
          statut: updatedEvaluation.statut,
          timestamps: {
            creation: updatedEvaluation.timestamps.creation.toISOString(),
            soumission: updatedEvaluation.timestamps.soumission?.toISOString(),
            validation: updatedEvaluation.timestamps.validation?.toISOString(),
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', updatedEvaluation.id);

      if (error) throw error;

      set({ currentEvaluation: updatedEvaluation });
      return true;
    } catch (error: any) {
      console.error('Erreur lors de la soumission:', error);
      set({ error: error.message || 'Erreur lors de la soumission' });
      return false;
    }
  },

  resetEvaluation: () => {
    set({
      currentEvaluation: null,
      questions: [],
      error: null,
    });
  },
}));

