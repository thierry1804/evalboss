import { Reponse, ScoreDetail, NiveauIA, GroupeQuestion } from '../types';

const COEFFICIENT_SOFT_SKILLS = 5;
const COEFFICIENT_HARD_SKILLS = 10;
const COEFFICIENT_PERFORMANCE_PROJET = 10;

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
  // Score = moyenne × coefficient
  return Math.round((moyenne * coefficient * 100) / 5) / 100; // Arrondi à 2 décimales, max 5 points
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
  // Score IA sur 100
  return Math.round((moyenne * 100) / 5 * 100) / 100;
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

  // Score total = somme des scores par groupe (max 100)
  const total = Math.min(100, softSkills + hardSkills + performanceProjet);

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

