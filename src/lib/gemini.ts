import { Evaluation, ScoreDetail } from '../types';
import { PROFIL_LABELS, NIVEAU_IA_LABELS } from '../types';

// Interface pour les réponses de Gemini (sans dateGeneration)
export interface GeminiAnalyse {
  pointsForts: string[];
  axesAmelioration: string[];
  recommandationsPrioritaires: string[];
  planProgression: string[];
  analyseDetaillee: string;
}

// Configuration de l'API Gemini
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const GEMINI_API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

// Log au chargement du module pour vérifier la configuration
if (import.meta.env.DEV) {
  if (GEMINI_API_KEY) {
    console.log('✅ Clé API Gemini configurée');
  } else {
    console.warn('⚠️ Clé API Gemini non configurée. Ajoutez VITE_GEMINI_API_KEY dans votre fichier .env');
  }
}

/**
 * Appelle l'API Gemini pour générer une analyse personnalisée
 */
export async function generateGeminiAnalyse(
  evaluation: Evaluation,
  scores: ScoreDetail
): Promise<GeminiAnalyse | null> {
  if (!GEMINI_API_KEY) {
    console.warn('⚠️ Clé API Gemini non configurée (VITE_GEMINI_API_KEY). Utilisation des recommandations par défaut.');
    return null;
  }

  console.log('🚀 Génération de l\'analyse Gemini...');
  
  // Liste des modèles à essayer dans l'ordre
  const modelsToTry = ['gemini-3-flash-preview', 'gemini-1.5-flash', 'gemini-1.5-flash-latest', 'gemini-pro', 'gemini-1.5-pro'];
  
  for (const model of modelsToTry) {
    try {
      const prompt = buildPrompt(evaluation, scores);
      const apiUrl = `${GEMINI_API_BASE_URL}/${model}:generateContent?key=${GEMINI_API_KEY}`;
      console.log(`📤 Essai avec le modèle ${model}...`);
      
      const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
      }),
    });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // Si 404, essayer le modèle suivant
        if (response.status === 404) {
          console.warn(`⚠️ Modèle ${model} non disponible (404), essai du modèle suivant...`);
          continue; // Essayer le modèle suivant
        }
        
        // Pour les autres erreurs, arrêter et retourner null
        console.error('❌ Erreur API Gemini:', {
          status: response.status,
          statusText: response.statusText,
          model: model,
          error: errorData,
        });
        return null;
      }

      const data = await response.json();
      const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!textResponse) {
        console.error('❌ Réponse Gemini invalide (pas de texte):', data);
        return null;
      }

      console.log(`✅ Réponse Gemini reçue avec le modèle ${model}, parsing...`);
      // Parser la réponse JSON de Gemini
      const parsed = parseGeminiResponse(textResponse);
      console.log('✅ Analyse Gemini parsée avec succès');
      return parsed;
    } catch (error) {
      console.error(`❌ Erreur avec le modèle ${model}:`, error);
      // Continuer avec le modèle suivant
      continue;
    }
  }
  
  // Si aucun modèle n'a fonctionné
  console.error('❌ Aucun modèle Gemini disponible. Vérifiez votre clé API et la disponibilité des modèles.');
  return null;
}

/**
 * Construit le prompt pour Gemini
 */
function buildPrompt(evaluation: Evaluation, scores: ScoreDetail): string {
  const profil = PROFIL_LABELS[evaluation.collaborateur.poste];
  const niveauIA = NIVEAU_IA_LABELS[scores.niveauIA];
  const niveauSeniorite = evaluation.collaborateur.niveauSeniorite;

  // Récupérer toutes les questions avec leurs réponses et commentaires
  const toutesQuestions = evaluation.reponses.map((r) => ({
    groupe: r.groupe,
    question: r.question,
    note: r.noteCollaborateur,
    commentaire: r.commentaireCollaborateur || '',
    categorieIA: r.categorieIA,
  }));

  // Grouper par catégorie
  const questionsSoftSkills = toutesQuestions.filter((q) => q.groupe === 'soft_skills');
  const questionsHardSkills = toutesQuestions.filter((q) => q.groupe === 'hard_skills');
  const questionsPerformanceProjet = toutesQuestions.filter((q) => q.groupe === 'performance_projet');
  const questionsIA = toutesQuestions.filter((q) => q.categorieIA);

  // Commentaire final du collaborateur
  const commentaireFinal = evaluation.commentaires?.collaborateur || '';

  return `Tu es un expert en évaluation de compétences et en développement professionnel. 
Analyse cette évaluation 360° et génère une analyse détaillée au format JSON strict.

**Contexte du collaborateur :**
- Profil : ${profil}
- Niveau de séniorité : ${niveauSeniorite}
- Score total : ${scores.total.toFixed(1)}%
- Soft Skills : ${scores.softSkills.toFixed(1)}%
- Hard Skills : ${scores.hardSkills.toFixed(1)}%
- Performance Projet : ${scores.performanceProjet.toFixed(1)}%
- Compétences IA : ${scores.competencesIA.toFixed(1)}%
- Niveau IA : ${niveauIA}

**Toutes les questions avec réponses et commentaires :**

**Soft Skills :**
${questionsSoftSkills.map((q, i) => `${i + 1}. ${q.question} - Note: ${q.note}/5${q.commentaire ? ` - Commentaire: ${q.commentaire}` : ''}`).join('\n')}

**Hard Skills :**
${questionsHardSkills.map((q, i) => `${i + 1}. ${q.question} - Note: ${q.note}/5${q.commentaire ? ` - Commentaire: ${q.commentaire}` : ''}`).join('\n')}

**Performance Projet :**
${questionsPerformanceProjet.map((q, i) => `${i + 1}. ${q.question} - Note: ${q.note}/5${q.commentaire ? ` - Commentaire: ${q.commentaire}` : ''}`).join('\n')}

**Compétences IA :**
${questionsIA.map((q, i) => `${i + 1}. ${q.question} - Note: ${q.note}/5${q.commentaire ? ` - Commentaire: ${q.commentaire}` : ''}`).join('\n')}

${commentaireFinal ? `**Commentaire final du collaborateur :**\n${commentaireFinal}\n` : ''}

**Instructions :**
Génère une analyse complète au format JSON avec les champs suivants :
{
  "pointsForts": ["point fort 1", "point fort 2", ...], // 3-5 points forts spécifiques et concrets
  "axesAmelioration": ["axe 1", "axe 2", ...], // 3-5 axes d'amélioration prioritaires et actionnables
  "recommandationsPrioritaires": ["recommandation 1", "recommandation 2", ...], // 3-5 recommandations concrètes et prioritaires
  "planProgression": ["étape 1", "étape 2", ...], // Plan de progression sur 6-12 mois, adapté au niveau IA
  "analyseDetaillee": "Analyse détaillée de 2-3 paragraphes expliquant les forces, faiblesses et opportunités de développement"
}

**Critères d'analyse :**
- Sois spécifique et concret, évite les généralités
- Adapte les recommandations au profil métier (${profil})
- Prends en compte le niveau de séniorité (${niveauSeniorite})
- Priorise les axes d'amélioration selon l'impact potentiel
- Propose un plan de progression réaliste et actionnable
- Pour les compétences IA, adapte au niveau actuel (${niveauIA})
- Utilise un ton professionnel et constructif
- Adresse-toi au collaborateur en français et en 2ème personne du singulier
- **IMPORTANT : Prends en compte TOUS les commentaires du collaborateur** sur les questions pour identifier les points forts, les difficultés exprimées, les besoins de formation, et les préoccupations spécifiques mentionnées
- Si un commentaire final existe, intègre-le dans ton analyse pour comprendre le contexte global et les attentes du collaborateur
- Utilise les commentaires pour personnaliser les recommandations et identifier des axes d'amélioration précis basés sur ce que le collaborateur a exprimé

Réponds UNIQUEMENT avec le JSON, sans texte avant ou après.`;
}

/**
 * Parse la réponse de Gemini (peut contenir du markdown ou du texte autour du JSON)
 */
function parseGeminiResponse(text: string): GeminiAnalyse {
  // Essayer d'extraire le JSON de la réponse
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Aucun JSON trouvé dans la réponse Gemini');
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    
    // Valider et normaliser la structure
    return {
      pointsForts: Array.isArray(parsed.pointsForts) ? parsed.pointsForts : [],
      axesAmelioration: Array.isArray(parsed.axesAmelioration) ? parsed.axesAmelioration : [],
      recommandationsPrioritaires: Array.isArray(parsed.recommandationsPrioritaires) 
        ? parsed.recommandationsPrioritaires 
        : [],
      planProgression: Array.isArray(parsed.planProgression) ? parsed.planProgression : [],
      analyseDetaillee: typeof parsed.analyseDetaillee === 'string' 
        ? parsed.analyseDetaillee 
        : '',
    };
  } catch (error) {
    console.error('Erreur lors du parsing de la réponse Gemini:', error);
    throw new Error('Format de réponse Gemini invalide');
  }
}

