import { z } from 'zod';
import {
  ProfilType,
  NiveauSeniorite,
  GroupeQuestion,
  StatutEvaluation,
} from '../types';

// Validation du matricule (lettres + chiffres)
const matriculeSchema = z
  .string()
  .min(1, 'Le matricule est requis')
  .regex(/^[A-Za-z0-9]+$/, 'Le matricule doit contenir uniquement des lettres et des chiffres');

// Validation nom/prénom (alphabétique, espaces, tirets, apostrophes)
const nomPrenomSchema = z
  .string()
  .min(1, 'Ce champ est requis')
  .regex(
    /^[A-Za-zÀ-ÿ\s'-]+$/,
    'Ce champ doit contenir uniquement des lettres, espaces, tirets et apostrophes'
  )
  .min(2, 'Ce champ doit contenir au moins 2 caractères');

// Validation date (doit être antérieure à aujourd'hui)
const datePasseeSchema = z.date().refine(
  (date) => date < new Date(),
  {
    message: 'La date doit être antérieure à aujourd\'hui',
  }
);

// Schéma de validation pour le formulaire collaborateur
export const collaborateurSchema = z.object({
  matricule: matriculeSchema,
  nom: nomPrenomSchema,
  prenom: nomPrenomSchema,
  poste: z.enum(
    [
      'integrateur_graphiste',
      'developpeur',
      'tech_lead',
      'lead_dev',
      'referent_technique',
      'business_analyst',
      'chef_projet',
      'pmo',
    ] as [ProfilType, ...ProfilType[]],
    { message: 'Veuillez sélectionner un poste' }
  ),
  niveauSeniorite: z.enum(['junior', 'confirme', 'senior'] as [NiveauSeniorite, ...NiveauSeniorite[]], {
    message: 'Veuillez sélectionner un niveau de séniorité',
  }),
  dateIntegration: z.date({ message: 'La date d\'intégration est requise' }).pipe(datePasseeSchema),
  dateDerniereEval: z.date().optional(),
});

export type CollaborateurFormData = z.infer<typeof collaborateurSchema>;

// Schéma pour une réponse individuelle
export const reponseSchema = z.object({
  id: z.string(),
  questionId: z.string(),
  groupe: z.enum(['soft_skills', 'hard_skills', 'performance_projet'] as [GroupeQuestion, ...GroupeQuestion[]]),
  question: z.string(),
  categorieIA: z.boolean(),
  noteCollaborateur: z.number().min(1).max(5),
  commentaireCollaborateur: z.string().max(500).optional(),
  noteManager: z.number().min(1).max(5).optional(),
  commentaireManager: z.string().max(500).optional(),
});

// Schéma pour l'évaluation complète
export const evaluationSchema = z.object({
  id: z.string(),
  collaborateur: collaborateurSchema,
  reponses: z.array(reponseSchema),
  scores: z.object({
    autoEvaluation: z.object({
      softSkills: z.number(),
      hardSkills: z.number(),
      performanceProjet: z.number(),
      competencesIA: z.number(),
      total: z.number(),
      niveauIA: z.enum(['debutant', 'intermediaire', 'avance', 'expert']),
    }),
    manager: z
      .object({
        softSkills: z.number(),
        hardSkills: z.number(),
        performanceProjet: z.number(),
        competencesIA: z.number(),
        total: z.number(),
        niveauIA: z.enum(['debutant', 'intermediaire', 'avance', 'expert']),
      })
      .optional(),
  }),
  commentaires: z.object({
    collaborateur: z.string().max(1000).optional(),
    manager: z.string().max(1000).optional(),
  }),
  statut: z.enum(['brouillon', 'soumise', 'validee'] as [StatutEvaluation, ...StatutEvaluation[]]),
  timestamps: z.object({
    creation: z.date(),
    soumission: z.date().optional(),
    validation: z.date().optional(),
  }),
});

// Fonction helper pour valider une date de formulaire (string) et la convertir
export const validateDateField = (value: string | undefined): Date => {
  if (!value) {
    throw new Error('La date est requise');
  }
  const date = new Date(value);
  if (isNaN(date.getTime())) {
    throw new Error('La date n\'est pas valide');
  }
  return date;
};

// Fonction pour vérifier qu'aucune évaluation n'existe dans les 10 derniers mois
export const validateNoRecentEvaluation = async (
  matricule: string,
  supabaseClient: any
): Promise<{ valid: boolean; message?: string }> => {
  try {
    const tenMonthsAgo = new Date();
    tenMonthsAgo.setMonth(tenMonthsAgo.getMonth() - 10);

    const { data, error } = await supabaseClient
      .from('evaluations')
      .select('created_at, statut')
      .eq('matricule', matricule)
      .gte('created_at', tenMonthsAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Erreur lors de la vérification:', error);
      return { valid: false, message: 'Erreur lors de la vérification des évaluations précédentes' };
    }

    if (data && data.length > 0) {
      const lastEval = data[0];
      const lastEvalDate = new Date(lastEval.created_at);
      const monthsDiff = Math.floor((Date.now() - lastEvalDate.getTime()) / (1000 * 60 * 60 * 24 * 30));
      
      return {
        valid: false,
        message: `Une évaluation existe déjà pour ce matricule (il y a ${monthsDiff} mois). Les évaluations doivent être espacées d'au moins 10 mois.`,
      };
    }

    return { valid: true };
  } catch (error) {
    console.error('Erreur lors de la validation:', error);
    return { valid: false, message: 'Erreur lors de la vérification des évaluations précédentes' };
  }
};

