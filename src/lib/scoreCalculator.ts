import { Reponse, ScoreDetail, NiveauIA, GroupeQuestion } from '../types';

const COEFFICIENT_SOFT_SKILLS = 5;
const COEFFICIENT_HARD_SKILLS = 10;
const COEFFICIENT_PERFORMANCE_PROJET = 10;
const COEFFICIENT_COMPETENCES_IA = 10;

// Calculer le score moyen d'un groupe de réponses
function calculateGroupScore(
  reponses: Reponse[],
  groupe: GroupeQuestion,
  coefficient: number
): number {
  const groupeReponses = reponses.filter((r) => r.groupe === groupe);
  if (groupeReponses.length === 0) return 0;

  const sum = groupeReponses.reduce((acc, reponse) => {
    // Utiliser noteManager si disponible, sinon noteCollaborateur
    const note = reponse.noteManager ?? reponse.noteCollaborateur;
    return acc + note;
  }, 0);

  const moyenne = sum / groupeReponses.length;
  // Score = moyenne × 20 pour avoir un score sur 100 (moyenne sur 5 points)
  return Math.round((moyenne * 20 * 100)) / 100; // Arrondi à 2 décimales, max 100
}

// Calculer le score des compétences IA
function calculateIAScore(reponses: Reponse[]): number {
  const iaReponses = reponses.filter((r) => r.categorieIA);
  if (iaReponses.length === 0) return 0;

  const sum = iaReponses.reduce((acc, reponse) => {
    const note = reponse.noteManager ?? reponse.noteCollaborateur;
    return acc + note;
  }, 0);

  const moyenne = sum / iaReponses.length;
  // Score IA = moyenne × 20 pour avoir un score sur 100 (moyenne sur 5 points)
  return Math.round((moyenne * 20 * 100)) / 100;
}

// Déterminer le niveau IA basé sur le score
function determineNiveauIA(scoreIA: number): NiveauIA {
  if (scoreIA >= 80) return 'expert';
  if (scoreIA >= 60) return 'avance';
  if (scoreIA >= 40) return 'intermediaire';
  return 'debutant';
}

// Calculer tous les scores d'une évaluation
export function calculateScores(reponses: Reponse[]): ScoreDetail {
  const softSkills = calculateGroupScore(reponses, 'soft_skills', COEFFICIENT_SOFT_SKILLS);
  const hardSkills = calculateGroupScore(reponses, 'hard_skills', COEFFICIENT_HARD_SKILLS);
  const performanceProjet = calculateGroupScore(
    reponses,
    'performance_projet',
    COEFFICIENT_PERFORMANCE_PROJET
  );

  // Score total = moyenne simple des trois scores (tous sur 100)
  const total = Math.round(((softSkills + hardSkills + performanceProjet) / 3) * 100) / 100;

  // Score IA spécifique
  const competencesIA = calculateIAScore(reponses);

  // Niveau IA
  const niveauIA = determineNiveauIA(competencesIA);

  return {
    softSkills,
    hardSkills,
    performanceProjet,
    competencesIA,
    total,
    niveauIA,
  };
}

// Calculer le score moyen d'un groupe pour le manager (utilise uniquement noteManager)
function calculateManagerGroupScore(
  reponses: Reponse[],
  groupe: GroupeQuestion,
  coefficient: number
): number | null {
  const groupeReponses = reponses.filter((r) => r.groupe === groupe && r.noteManager !== undefined);
  if (groupeReponses.length === 0) return null;

  const sum = groupeReponses.reduce((acc, reponse) => {
    return acc + (reponse.noteManager || 0);
  }, 0);

  const moyenne = sum / groupeReponses.length;
  // Score = moyenne × 20 pour avoir un score sur 100 (moyenne sur 5 points)
  return Math.round((moyenne * 20 * 100)) / 100;
}

// Calculer le score IA pour le manager (utilise uniquement noteManager)
function calculateManagerIAScore(reponses: Reponse[]): number | null {
  const iaReponses = reponses.filter((r) => r.categorieIA && r.noteManager !== undefined);
  if (iaReponses.length === 0) return null;

  const sum = iaReponses.reduce((acc, reponse) => {
    return acc + (reponse.noteManager || 0);
  }, 0);

  const moyenne = sum / iaReponses.length;
  // Score IA = moyenne × 20 pour avoir un score sur 100 (moyenne sur 5 points)
  return Math.round((moyenne * 20 * 100)) / 100;
}

// Calculer les scores manager - retourne null si aucune note manager n'existe
export function calculateManagerScores(reponses: Reponse[]): ScoreDetail | null {
  // Vérifier s'il y a au moins une note manager
  const hasManagerNotes = reponses.some((r) => r.noteManager !== undefined);
  if (!hasManagerNotes) return null;

  const softSkills = calculateManagerGroupScore(reponses, 'soft_skills', COEFFICIENT_SOFT_SKILLS);
  const hardSkills = calculateManagerGroupScore(reponses, 'hard_skills', COEFFICIENT_HARD_SKILLS);
  const performanceProjet = calculateManagerGroupScore(
    reponses,
    'performance_projet',
    COEFFICIENT_PERFORMANCE_PROJET
  );

  // Si aucun groupe n'a de notes manager, retourner null
  if (softSkills === null && hardSkills === null && performanceProjet === null) {
    return null;
  }

  // Utiliser 0 pour les groupes sans notes manager
  const softSkillsValue = softSkills ?? 0;
  const hardSkillsValue = hardSkills ?? 0;
  const performanceProjetValue = performanceProjet ?? 0;

  // Score total = moyenne simple des trois scores (tous sur 100)
  const total = Math.round(((softSkillsValue + hardSkillsValue + performanceProjetValue) / 3) * 100) / 100;

  // Score IA spécifique
  const competencesIA = calculateManagerIAScore(reponses) ?? 0;

  // Niveau IA
  const niveauIA = determineNiveauIA(competencesIA);

  return {
    softSkills: softSkillsValue,
    hardSkills: hardSkillsValue,
    performanceProjet: performanceProjetValue,
    competencesIA,
    total,
    niveauIA,
  };
}

// Calculer le pourcentage de progression
export function calculateProgress(reponses: Reponse[]): number {
  const totalQuestions = reponses.length;
  if (totalQuestions === 0) return 0;

  const answeredQuestions = reponses.filter(
    (r) => r.noteCollaborateur >= 1 && r.noteCollaborateur <= 5
  ).length;

  return Math.round((answeredQuestions / totalQuestions) * 100);
}

// Vérifier si toutes les questions sont répondues
export function isEvaluationComplete(reponses: Reponse[]): boolean {
  return reponses.every((r) => r.noteCollaborateur >= 1 && r.noteCollaborateur <= 5);
}

// Vérifier si toutes les questions manager sont répondues
export function isManagerEvaluationComplete(reponses: Reponse[]): boolean {
  return reponses.every((r) => r.noteManager !== undefined && r.noteManager >= 1 && r.noteManager <= 5);
}

