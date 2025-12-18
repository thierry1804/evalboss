// Types pour les profils métier
export type ProfilType =
  | 'integrateur_graphiste'
  | 'developpeur'
  | 'tech_lead'
  | 'lead_dev'
  | 'referent_technique'
  | 'business_analyst'
  | 'chef_projet'
  | 'pmo';

// Types pour le niveau de séniorité
export type NiveauSeniorite = 'junior' | 'confirme' | 'senior';

// Types pour les groupes de questions
export type GroupeQuestion = 'soft_skills' | 'hard_skills' | 'performance_projet';

// Types pour le statut d'évaluation
export type StatutEvaluation = 'brouillon' | 'soumise' | 'validee';

// Types pour le niveau IA
export type NiveauIA = 'debutant' | 'intermediaire' | 'avance' | 'expert';

// Interface pour une réponse à une question
export interface Reponse {
  id: string;
  questionId: string;
  groupe: GroupeQuestion;
  question: string;
  categorieIA: boolean;
  noteCollaborateur: number;
  commentaireCollaborateur?: string;
  noteManager?: number;
  commentaireManager?: string;
}

// Interface pour les scores détaillés
export interface ScoreDetail {
  softSkills: number;
  hardSkills: number;
  performanceProjet: number;
  competencesIA: number;
  total: number;
  niveauIA: NiveauIA;
}

// Interface pour les informations collaborateur
export interface Collaborateur {
  matricule: string;
  nom: string;
  prenom: string;
  poste: ProfilType;
  niveauSeniorite: NiveauSeniorite;
  dateIntegration: Date;
  dateDerniereEval?: Date;
}

// Interface pour une évaluation complète
export interface Evaluation {
  id: string;
  collaborateur: Collaborateur;
  reponses: Reponse[];
  scores: {
    autoEvaluation: ScoreDetail;
    manager?: ScoreDetail;
  };
  commentaires: {
    collaborateur?: string;
    manager?: string;
  };
  statut: StatutEvaluation;
  timestamps: {
    creation: Date;
    soumission?: Date;
    validation?: Date;
  };
}

// Interface pour une question dans le catalogue
export interface Question {
  id: string;
  profil: ProfilType;
  groupe: GroupeQuestion;
  question: string;
  categorieIA: boolean;
  coefficient: number;
  ordre: number;
}

// Interface pour les données d'une question dans le formulaire
export interface QuestionForm {
  id: string;
  groupe: GroupeQuestion;
  question: string;
  categorieIA: boolean;
  coefficient: number;
  ordre: number;
}

// Mappage des profils pour l'affichage
export const PROFIL_LABELS: Record<ProfilType, string> = {
  integrateur_graphiste: 'Intégrateur graphiste',
  developpeur: 'Développeur',
  tech_lead: 'Tech Lead',
  lead_dev: 'Lead Dev',
  referent_technique: 'Référent technique',
  business_analyst: 'Business Analyst (BA)',
  chef_projet: 'Chef de Projet (CP)',
  pmo: 'PMO (Project Management Officer)',
};

// Mappage des niveaux de séniorité pour l'affichage
export const NIVEAU_SENIORITE_LABELS: Record<NiveauSeniorite, string> = {
  junior: 'Junior',
  confirme: 'Confirmé',
  senior: 'Senior',
};

// Mappage des niveaux IA pour l'affichage
export const NIVEAU_IA_LABELS: Record<NiveauIA, string> = {
  debutant: 'Débutant',
  intermediaire: 'Intermédiaire',
  avance: 'Avancé',
  expert: 'Expert',
};

// Labels pour les groupes de questions
export const GROUPE_LABELS: Record<GroupeQuestion, string> = {
  soft_skills: 'Soft Skills',
  hard_skills: 'Hard Skills',
  performance_projet: 'Performance Projet',
};

// Labels pour les notes
export const NOTE_LABELS: Record<number, string> = {
  1: 'Insuffisant',
  2: 'À améliorer',
  3: 'Satisfaisant',
  4: 'Bon',
  5: 'Excellent',
};

