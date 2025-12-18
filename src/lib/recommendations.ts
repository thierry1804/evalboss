import { ProfilType, NiveauIA, ScoreDetail, Evaluation } from '../types';
import { generateGeminiAnalyse, GeminiAnalyse } from './gemini';

export interface RecommandationIA {
  titre: string;
  description: string;
  outils: string[];
  planProgression: string[];
}

// Outils IA recommandés par profil
const OUTILS_IA_PAR_PROFIL: Record<ProfilType, string[]> = {
  integrateur_graphiste: [
    'Midjourney',
    'DALL-E',
    'Stable Diffusion',
    'GitHub Copilot',
    'Cursor',
    'Figma AI plugins',
  ],
  developpeur: [
    'GitHub Copilot',
    'Cursor',
    'Tabnine',
    'Amazon CodeWhisperer',
    'ChatGPT',
    'Claude',
  ],
  tech_lead: [
    'GitHub Copilot',
    'ChatGPT',
    'Claude',
    'Hugging Face',
    'CodeReview AI tools',
    'Documentation AI tools',
  ],
  lead_dev: [
    'GitHub Copilot',
    'ChatGPT',
    'Claude',
    'Project management AI',
    'Code analysis AI',
    'Team productivity AI',
  ],
  referent_technique: [
    'ChatGPT',
    'Claude',
    'Specialized domain AI tools',
    'Documentation AI',
    'Knowledge base AI',
  ],
  business_analyst: [
    'ChatGPT',
    'Claude',
    'Data analysis AI tools',
    'Documentation AI',
    'UML generation AI',
    'Process optimization AI',
  ],
  chef_projet: [
    'ChatGPT',
    'Claude',
    'Project planning AI',
    'Risk analysis AI',
    'Reporting AI',
    'Communication AI tools',
  ],
  pmo: [
    'ChatGPT',
    'Claude',
    'Portfolio management AI',
    'KPI analysis AI',
    'Reporting automation AI',
    'Process optimization AI',
  ],
};

// Plans de progression par niveau IA
const PLANS_PROGRESSION: Record<NiveauIA, string[]> = {
  debutant: [
    'Découvrir les outils IA de base pour votre profil (1-2 mois)',
    'Suivre des formations d\'initiation aux assistants IA (2-3 mois)',
    'Expérimenter sur des projets personnels ou de faible enjeu (3-4 mois)',
    'Intégrer progressivement dans votre workflow quotidien (4-6 mois)',
    'Partager vos apprentissages avec l\'équipe (6 mois)',
  ],
  intermediaire: [
    'Approfondir la maîtrise des outils IA existants (1-2 mois)',
    'Explorer des fonctionnalités avancées et techniques avancées (2-3 mois)',
    'Optimiser vos prompts et workflows (3-4 mois)',
    'Contribuer à la définition de bonnes pratiques IA dans l\'équipe (4-5 mois)',
    'Former d\'autres membres de l\'équipe (5-6 mois)',
  ],
  avance: [
    'Explorer les derniers outils IA émergents dans votre domaine (1-2 mois)',
    'Expérimenter avec des intégrations IA avancées (2-3 mois)',
    'Définir des standards et guidelines d\'utilisation IA (3-4 mois)',
    'Piloter des initiatives d\'adoption IA dans l\'organisation (4-6 mois)',
    'Contribuer à la stratégie IA de l\'entreprise (6-12 mois)',
  ],
  expert: [
    'Veille continue sur les évolutions IA (continu)',
    'Évaluation et sélection de nouveaux outils IA (1-2 mois)',
    'Formation et mentorat des équipes sur l\'IA (continu)',
    'Innovation et expérimentation de nouvelles applications IA (continu)',
    'Contribution à la roadmap stratégique IA de l\'entreprise (continu)',
  ],
};

// Générer des recommandations personnalisées
export function generateRecommendations(
  profil: ProfilType,
  scores: ScoreDetail
): RecommandationIA {
  const niveauIA = scores.niveauIA;
  const scoreIA = scores.competencesIA;

  let titre = '';
  let description = '';

  if (niveauIA === 'debutant') {
    titre = 'Découverte des outils IA';
    description =
      'Vous commencez votre parcours avec l\'IA. Nous vous recommandons de découvrir les outils de base et de vous familiariser avec leurs fonctionnalités principales.';
  } else if (niveauIA === 'intermediaire') {
    titre = 'Développement des compétences IA';
    description =
      'Vous avez une bonne base en IA. Il est temps d\'approfondir vos compétences et d\'optimiser votre utilisation des outils IA dans votre travail quotidien.';
  } else if (niveauIA === 'avance') {
    titre = 'Maîtrise avancée de l\'IA';
    description =
      'Vous maîtrisez bien l\'IA. Vous pouvez maintenant contribuer à la stratégie IA de l\'entreprise et former d\'autres membres de l\'équipe.';
  } else {
    titre = 'Expertise IA reconnue';
    description =
      'Vous êtes un expert reconnu en IA. Vous pouvez piloter des initiatives stratégiques et contribuer à l\'innovation IA dans l\'organisation.';
  }

  // Adapter les recommandations selon les points faibles
  const pointsForts: string[] = [];
  const axesAmelioration: string[] = [];

  if (scores.softSkills >= 70) {
    pointsForts.push('Soft skills solides');
  } else {
    axesAmelioration.push('Renforcer les soft skills');
  }

  if (scores.hardSkills >= 70) {
    pointsForts.push('Compétences techniques bien maîtrisées');
  } else {
    axesAmelioration.push('Développer les compétences techniques');
  }

  if (scores.performanceProjet >= 70) {
    pointsForts.push('Performance projet excellente');
  } else {
    axesAmelioration.push('Améliorer la performance projet');
  }

  if (scoreIA >= 70) {
    pointsForts.push('Bonne maîtrise des compétences IA');
  } else {
    axesAmelioration.push('Prioriser le développement des compétences IA');
  }

  return {
    titre,
    description,
    outils: OUTILS_IA_PAR_PROFIL[profil],
    planProgression: PLANS_PROGRESSION[niveauIA],
  };
}

/**
 * Génère des recommandations avec plan de progression, en utilisant Gemini si disponible
 */
export async function generateRecommendationsWithGemini(
  evaluation: Evaluation,
  scores: ScoreDetail
): Promise<{ recommandations: RecommandationIA; planProgression: string[] }> {
  // Essayer d'utiliser Gemini pour le plan de progression
  const geminiAnalyse = await generateGeminiAnalyse(evaluation, scores);
  
  const recommandations = generateRecommendations(evaluation.collaborateur.poste, scores);
  
  // Utiliser le plan de progression de Gemini s'il est disponible, sinon utiliser le plan par défaut
  const planProgression = geminiAnalyse?.planProgression || recommandations.planProgression;

  return {
    recommandations,
    planProgression,
  };
}

// Générer une analyse des points forts et axes d'amélioration
export interface AnalyseCompetences {
  pointsForts: string[];
  axesAmelioration: string[];
  recommandationsPrioritaires: string[];
  analyseDetaillee?: string; // Analyse détaillée générée par Gemini
}

/**
 * Génère une analyse des compétences, en utilisant Gemini si disponible
 */
export async function generateAnalyseCompetences(
  evaluation: Evaluation,
  scores: ScoreDetail
): Promise<AnalyseCompetences> {
  // Essayer d'utiliser Gemini en premier
  const geminiAnalyse = await generateGeminiAnalyse(evaluation, scores);
  
  if (geminiAnalyse) {
    return {
      pointsForts: geminiAnalyse.pointsForts,
      axesAmelioration: geminiAnalyse.axesAmelioration,
      recommandationsPrioritaires: geminiAnalyse.recommandationsPrioritaires,
      analyseDetaillee: geminiAnalyse.analyseDetaillee,
    };
  }

  // Fallback vers l'analyse par défaut
  return generateAnalyseCompetencesDefault(scores);
}

/**
 * Génère une analyse par défaut (sans IA)
 */
export function generateAnalyseCompetencesDefault(scores: ScoreDetail): AnalyseCompetences {
  const pointsForts: string[] = [];
  const axesAmelioration: string[] = [];
  const recommandationsPrioritaires: string[] = [];

  // Points forts (>= 80%)
  if (scores.softSkills >= 80) {
    pointsForts.push('Soft skills exceptionnelles');
  }
  if (scores.hardSkills >= 80) {
    pointsForts.push('Compétences techniques de niveau expert');
  }
  if (scores.performanceProjet >= 80) {
    pointsForts.push('Performance projet remarquable');
  }
  if (scores.competencesIA >= 80) {
    pointsForts.push('Maîtrise avancée des compétences IA');
  }

  // Axes d'amélioration (< 60%)
  if (scores.softSkills < 60) {
    axesAmelioration.push('Soft skills');
    recommandationsPrioritaires.push(
      'Travailler sur la communication, l\'autonomie et la collaboration'
    );
  }
  if (scores.hardSkills < 60) {
    axesAmelioration.push('Compétences techniques');
    recommandationsPrioritaires.push('Renforcer les compétences techniques du poste');
  }
  if (scores.performanceProjet < 60) {
    axesAmelioration.push('Performance projet');
    recommandationsPrioritaires.push('Améliorer la gestion du temps et la qualité des livrables');
  }
  if (scores.competencesIA < 60) {
    axesAmelioration.push('Compétences IA');
    recommandationsPrioritaires.push(
      'Découvrir et maîtriser les outils IA pertinents pour votre profil'
    );
  }

  // Si aucun point faible, félicitations
  if (axesAmelioration.length === 0) {
    recommandationsPrioritaires.push(
      'Continuer à maintenir votre niveau d\'excellence et partager votre expertise'
    );
  }

  return {
    pointsForts,
    axesAmelioration,
    recommandationsPrioritaires,
  };
}

