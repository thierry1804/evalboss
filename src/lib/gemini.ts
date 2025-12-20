import { Evaluation, ScoreDetail, Reponse } from '../types';
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

/**
 * Génère une suggestion de commentaire manager en tenant compte de l'évaluation du collaborateur et du manager
 */
export async function generateManagerCommentSuggestion(
  evaluation: Evaluation,
  scoresAuto: ScoreDetail,
  managerReponses: Reponse[],
  scoresManager: ScoreDetail | null,
  commentaireManagerExistant?: string
): Promise<string | null> {
  if (!GEMINI_API_KEY) {
    console.warn('⚠️ Clé API Gemini non configurée (VITE_GEMINI_API_KEY).');
    return null;
  }

  console.log('🚀 Génération de la suggestion de commentaire manager...');
  
  // Liste des modèles à essayer dans l'ordre
  const modelsToTry = ['gemini-3-flash-preview', 'gemini-1.5-flash', 'gemini-1.5-flash-latest', 'gemini-pro', 'gemini-1.5-pro'];
  
  for (const model of modelsToTry) {
    try {
      const prompt = buildManagerCommentPrompt(evaluation, scoresAuto, managerReponses, scoresManager, commentaireManagerExistant);
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
          continue;
        }
        
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

      console.log(`✅ Réponse Gemini reçue avec le modèle ${model}`);
      // Nettoyer la réponse (enlever markdown si présent)
      const cleanedResponse = textResponse
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .replace(/^["']|["']$/g, '')
        .trim();
      
      return cleanedResponse;
    } catch (error) {
      console.error(`❌ Erreur avec le modèle ${model}:`, error);
      continue;
    }
  }
  
  console.error('❌ Aucun modèle Gemini disponible.');
  return null;
}

/**
 * Construit le prompt pour générer une suggestion de commentaire manager
 */
function buildManagerCommentPrompt(
  evaluation: Evaluation,
  scoresAuto: ScoreDetail,
  managerReponses: Reponse[],
  scoresManager: ScoreDetail | null,
  commentaireManagerExistant?: string
): string {
  const profil = PROFIL_LABELS[evaluation.collaborateur.poste];
  const niveauIA = NIVEAU_IA_LABELS[scoresAuto.niveauIA];
  const niveauSeniorite = evaluation.collaborateur.niveauSeniorite;

  // Récupérer les questions avec les notes et commentaires du collaborateur
  const questionsCollaborateur = evaluation.reponses.map((r) => ({
    groupe: r.groupe,
    question: r.question,
    note: r.noteCollaborateur,
    commentaire: r.commentaireCollaborateur || '',
    categorieIA: r.categorieIA,
  }));

  // Récupérer les notes et commentaires du manager
  const questionsManager = managerReponses.map((r) => ({
    groupe: r.groupe,
    question: r.question,
    noteManager: r.noteManager,
    commentaireManager: r.commentaireManager || '',
    noteCollaborateur: r.noteCollaborateur,
    commentaireCollaborateur: r.commentaireCollaborateur || '',
    categorieIA: r.categorieIA,
  }));

  // Identifier les écarts significatifs
  const ecarts = questionsManager
    .filter((q) => q.noteManager !== undefined)
    .map((q) => ({
      question: q.question,
      noteAuto: q.noteCollaborateur,
      noteManager: q.noteManager!,
      ecart: Math.abs(q.noteCollaborateur - q.noteManager!),
      commentaireAuto: q.commentaireCollaborateur,
      commentaireManager: q.commentaireManager,
    }))
    .filter((e) => e.ecart > 1)
    .sort((a, b) => b.ecart - a.ecart);

  // Commentaire final du collaborateur
  const commentaireFinalCollaborateur = evaluation.commentaires?.collaborateur || '';

  // Grouper les questions par catégorie pour le manager
  const questionsManagerSoftSkills = questionsManager.filter((q) => q.groupe === 'soft_skills' && q.noteManager !== undefined);
  const questionsManagerHardSkills = questionsManager.filter((q) => q.groupe === 'hard_skills' && q.noteManager !== undefined);
  const questionsManagerPerformance = questionsManager.filter((q) => q.groupe === 'performance_projet' && q.noteManager !== undefined);
  const questionsManagerIA = questionsManager.filter((q) => q.categorieIA && q.noteManager !== undefined);

  return `Tu es un expert en évaluation de performance et en management. 
Aide un manager à rédiger un commentaire constructif et professionnel pour son collaborateur, en tenant compte de l'auto-évaluation du collaborateur et de l'évaluation du manager.

**Contexte du collaborateur :**
- Profil : ${profil}
- Niveau de séniorité : ${niveauSeniorite}
- Nom : ${evaluation.collaborateur.prenom} ${evaluation.collaborateur.nom}

**Scores Auto-évaluation du collaborateur :**
- Score total : ${scoresAuto.total.toFixed(1)}%
- Soft Skills : ${scoresAuto.softSkills.toFixed(1)}%
- Hard Skills : ${scoresAuto.hardSkills.toFixed(1)}%
- Performance Projet : ${scoresAuto.performanceProjet.toFixed(1)}%
- Compétences IA : ${scoresAuto.competencesIA.toFixed(1)}%
- Niveau IA : ${niveauIA}

${scoresManager ? `**Scores Manager :**
- Score total : ${scoresManager.total.toFixed(1)}%
- Soft Skills : ${scoresManager.softSkills.toFixed(1)}%
- Hard Skills : ${scoresManager.hardSkills.toFixed(1)}%
- Performance Projet : ${scoresManager.performanceProjet.toFixed(1)}%
- Compétences IA : ${scoresManager.competencesIA.toFixed(1)}%
- Niveau IA : ${NIVEAU_IA_LABELS[scoresManager.niveauIA]}

` : '**Note :** Le manager n\'a pas encore complété toutes ses évaluations.\n\n'}

**Évaluation du collaborateur (Auto-évaluation) :**

**Soft Skills :**
${questionsCollaborateur.filter(q => q.groupe === 'soft_skills').map((q, i) => `${i + 1}. ${q.question} - Note: ${q.note}/5${q.commentaire ? ` - Commentaire: "${q.commentaire}"` : ''}`).join('\n')}

**Hard Skills :**
${questionsCollaborateur.filter(q => q.groupe === 'hard_skills').map((q, i) => `${i + 1}. ${q.question} - Note: ${q.note}/5${q.commentaire ? ` - Commentaire: "${q.commentaire}"` : ''}`).join('\n')}

**Performance Projet :**
${questionsCollaborateur.filter(q => q.groupe === 'performance_projet').map((q, i) => `${i + 1}. ${q.question} - Note: ${q.note}/5${q.commentaire ? ` - Commentaire: "${q.commentaire}"` : ''}`).join('\n')}

**Compétences IA :**
${questionsCollaborateur.filter(q => q.categorieIA).map((q, i) => `${i + 1}. ${q.question} - Note: ${q.note}/5${q.commentaire ? ` - Commentaire: "${q.commentaire}"` : ''}`).join('\n')}

${commentaireFinalCollaborateur ? `**Commentaire final du collaborateur :**\n"${commentaireFinalCollaborateur}"\n\n` : ''}

**Évaluation du manager :**

${questionsManagerSoftSkills.length > 0 ? `**Soft Skills (évaluées par le manager) :**
${questionsManagerSoftSkills.map((q, i) => `${i + 1}. ${q.question}
   - Note collaborateur: ${q.noteCollaborateur}/5${q.commentaireCollaborateur ? ` - Commentaire: "${q.commentaireCollaborateur}"` : ''}
   - Note manager: ${q.noteManager}/5${q.commentaireManager ? ` - Commentaire manager: "${q.commentaireManager}"` : ''}
`).join('\n')}

` : ''}${questionsManagerHardSkills.length > 0 ? `**Hard Skills (évaluées par le manager) :**
${questionsManagerHardSkills.map((q, i) => `${i + 1}. ${q.question}
   - Note collaborateur: ${q.noteCollaborateur}/5${q.commentaireCollaborateur ? ` - Commentaire: "${q.commentaireCollaborateur}"` : ''}
   - Note manager: ${q.noteManager}/5${q.commentaireManager ? ` - Commentaire manager: "${q.commentaireManager}"` : ''}
`).join('\n')}

` : ''}${questionsManagerPerformance.length > 0 ? `**Performance Projet (évaluées par le manager) :**
${questionsManagerPerformance.map((q, i) => `${i + 1}. ${q.question}
   - Note collaborateur: ${q.noteCollaborateur}/5${q.commentaireCollaborateur ? ` - Commentaire: "${q.commentaireCollaborateur}"` : ''}
   - Note manager: ${q.noteManager}/5${q.commentaireManager ? ` - Commentaire manager: "${q.commentaireManager}"` : ''}
`).join('\n')}

` : ''}${questionsManagerIA.length > 0 ? `**Compétences IA (évaluées par le manager) :**
${questionsManagerIA.map((q, i) => `${i + 1}. ${q.question}
   - Note collaborateur: ${q.noteCollaborateur}/5${q.commentaireCollaborateur ? ` - Commentaire: "${q.commentaireCollaborateur}"` : ''}
   - Note manager: ${q.noteManager}/5${q.commentaireManager ? ` - Commentaire manager: "${q.commentaireManager}"` : ''}
`).join('\n')}

` : ''}${ecarts.length > 0 ? `**Écarts significatifs entre auto-évaluation et évaluation manager (écart > 1 point) :**
${ecarts.map((e, i) => `${i + 1}. ${e.question}
   - Note auto: ${e.noteAuto}/5${e.commentaireAuto ? ` - Commentaire auto: "${e.commentaireAuto}"` : ''}
   - Note manager: ${e.noteManager}/5${e.commentaireManager ? ` - Commentaire manager: "${e.commentaireManager}"` : ''}
   - Écart: ${e.ecart} point(s)
`).join('\n')}

` : ''}${commentaireManagerExistant ? `**Commentaire manager existant (à améliorer/compléter) :**\n"${commentaireManagerExistant}"\n\n` : ''}

**Instructions :**
Génère un commentaire manager professionnel, constructif et bienveillant (maximum 1000 caractères) qui :
1. **Reconnaît les forces** : Mentionne les points forts identifiés dans l'évaluation (notes élevées, compétences remarquables)
2. **Souligne les écarts positifs** : Si le manager a noté plus haut que l'auto-évaluation, reconnais cette performance
3. **Adresse les écarts** : Si des écarts significatifs existent entre auto-évaluation et évaluation manager, explique-les de manière constructive
4. **Propose des axes d'amélioration** : Identifie 2-3 axes d'amélioration prioritaires basés sur les notes et commentaires du manager
5. **Reconnaît les efforts** : Si le collaborateur a mentionné des difficultés ou besoins dans ses commentaires, montre que tu les as entendus
6. **Ton professionnel** : Utilise un ton encourageant, constructif et professionnel, adapté à une évaluation formelle
7. **Personnalisé** : Référence des éléments spécifiques de l'évaluation (questions, commentaires) plutôt que des généralités
8. **Équilibré** : Balance entre reconnaissance des forces et identification des opportunités de développement

**Format :**
- Maximum 1000 caractères
- Paragraphes courts et structurés
- Utilise "tu" pour s'adresser au collaborateur
- Évite les répétitions
- Sois spécifique et concret

${commentaireManagerExistant ? '**Note :** Si un commentaire existe déjà, améliore-le en tenant compte de toutes les informations ci-dessus.\n\n' : ''}

Génère UNIQUEMENT le commentaire, sans préambule, sans formatage markdown, sans guillemets autour du texte.`;
}

