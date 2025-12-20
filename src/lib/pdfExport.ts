import jsPDF from 'jspdf';
import { Evaluation, ScoreDetail, AnalyseGemini } from '../types';
import { formatDate } from './utils';
import { PROFIL_LABELS, NIVEAU_IA_LABELS, GROUPE_LABELS, NOTE_LABELS } from '../types';
import { generateRecommendations, generateAnalyseCompetencesDefault, AnalyseCompetences } from './recommendations';

export async function exportEvaluationToPDF(evaluation: Evaluation, analyse?: AnalyseCompetences) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let yPosition = margin;

  // Couleurs
  const primaryColor = [37, 99, 235]; // blue-600
  const grayColor = [107, 114, 128]; // gray-500
  const purpleColor = [139, 92, 246]; // purple-500
  const managerColor = [147, 51, 234]; // purple-600 pour manager

  // Fonction pour ajouter une nouvelle page si nécessaire
  const checkPageBreak = (requiredHeight: number) => {
    if (yPosition + requiredHeight > pageHeight - margin) {
      doc.addPage();
      yPosition = margin;
      return true;
    }
    return false;
  };

  // Fonction pour afficher du texte avec gestion des retours à la ligne
  const addTextWithLineBreaks = (text: string, x: number, maxWidth: number, lineHeight: number = 7) => {
    // Diviser le texte par les retours à la ligne explicites
    const paragraphs = text.split('\n');
    
    paragraphs.forEach((paragraph, index) => {
      // Si le paragraphe est vide (double retour à la ligne), ajouter un espace
      if (paragraph.trim() === '' && index > 0) {
        yPosition += lineHeight * 0.5;
        return;
      }
      
      // Utiliser splitTextToSize pour gérer les lignes trop longues
      const lines = doc.splitTextToSize(paragraph.trim(), maxWidth);
      lines.forEach((line: string) => {
        checkPageBreak(lineHeight);
        doc.text(line, x, yPosition);
        yPosition += lineHeight;
      });
    });
  };

  // En-tête
  doc.setFontSize(20);
  doc.setTextColor(...primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.text('Résultats de l\'évaluation', margin, yPosition);
  yPosition += 10;

  // Informations collaborateur
  doc.setFontSize(12);
  doc.setTextColor(...grayColor);
  doc.setFont('helvetica', 'normal');
  const collaborateurInfo = `${evaluation.collaborateur.prenom} ${evaluation.collaborateur.nom} - ${PROFIL_LABELS[evaluation.collaborateur.poste]}`;
  doc.text(collaborateurInfo, margin, yPosition);
  yPosition += 6;
  const dateEval = evaluation.timestamps.soumission || evaluation.timestamps.creation;
  doc.text(`Date de l'évaluation : ${formatDate(dateEval)}`, margin, yPosition);
  yPosition += 15;

  const scores = evaluation.scores.autoEvaluation;
  const scoresMgr = evaluation.scores.manager;
  const hasManagerEvaluation = !!scoresMgr;

  // Générer les recommandations
  const recommandations = generateRecommendations(evaluation.collaborateur.poste, scores);
  
  // Utiliser l'analyse fournie en paramètre, ou celle sauvegardée, ou l'analyse par défaut
  let analyseData: AnalyseCompetences;
  if (analyse) {
    // Utiliser l'analyse passée en paramètre (depuis l'état de la page)
    analyseData = analyse;
  } else if (evaluation.analyseGemini) {
    // Utiliser l'analyse Gemini sauvegardée
    analyseData = {
      pointsForts: evaluation.analyseGemini.pointsForts,
      axesAmelioration: evaluation.analyseGemini.axesAmelioration,
      recommandationsPrioritaires: evaluation.analyseGemini.recommandationsPrioritaires,
      analyseDetaillee: evaluation.analyseGemini.analyseDetaillee,
    };
  } else {
    // Utiliser l'analyse par défaut (sans appeler Gemini)
    analyseData = generateAnalyseCompetencesDefault(scores);
  }

  // Calculer les moyennes originales
  const moyenneSoftSkills = scores.softSkills / 20;
  const moyenneHardSkills = scores.hardSkills / 20;
  const moyennePerformanceProjet = scores.performanceProjet / 20;
  const moyenneIA = scores.competencesIA / 20;
  
  const moyenneSoftSkillsMgr = scoresMgr ? scoresMgr.softSkills / 20 : 0;
  const moyenneHardSkillsMgr = scoresMgr ? scoresMgr.hardSkills / 20 : 0;
  const moyennePerformanceProjetMgr = scoresMgr ? scoresMgr.performanceProjet / 20 : 0;
  const moyenneIAMgr = scoresMgr ? scoresMgr.competencesIA / 20 : 0;

  // Scores principaux
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  if (hasManagerEvaluation) {
    doc.text('Scores de l\'évaluation', margin, yPosition);
  } else {
    doc.text('Scores principaux', margin, yPosition);
  }
  yPosition += 10;

  // Tableau des scores - avec comparaison si manager existe
  if (hasManagerEvaluation) {
    // Tableau comparatif avec deux colonnes
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const rowHeight = 8;
    const colWidths = [70, 50, 50];
    const colX = [margin, margin + colWidths[0], margin + colWidths[0] + colWidths[1]];

    // En-têtes du tableau
    doc.setFont('helvetica', 'bold');
    doc.text('Catégorie', colX[0], yPosition);
    doc.setTextColor(...primaryColor);
    doc.text('Auto-évaluation', colX[1], yPosition);
    doc.setTextColor(...managerColor);
    doc.text('Évaluation Manager', colX[2], yPosition);
    doc.setTextColor(0, 0, 0);
    yPosition += rowHeight;

    // Ligne de séparation
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, yPosition - 2, pageWidth - margin, yPosition - 2);
    yPosition += 3;

    // Données du tableau comparatif
    const scoreDataCompare = [
      ['Score Total', `${scores.total.toFixed(1)}%`, `${scoresMgr.total.toFixed(1)}%`],
      ['Soft Skills', `${scores.softSkills.toFixed(1)}%`, `${scoresMgr.softSkills.toFixed(1)}%`],
      ['Hard Skills', `${scores.hardSkills.toFixed(1)}%`, `${scoresMgr.hardSkills.toFixed(1)}%`],
      ['Performance Projet', `${scores.performanceProjet.toFixed(1)}%`, `${scoresMgr.performanceProjet.toFixed(1)}%`],
      ['Compétences IA', `${scores.competencesIA.toFixed(1)}%`, `${scoresMgr.competencesIA.toFixed(1)}%`],
    ];

    scoreDataCompare.forEach((row) => {
      checkPageBreak(rowHeight + 3);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      doc.text(row[0], colX[0], yPosition);
      doc.setTextColor(...primaryColor);
      doc.text(row[1], colX[1], yPosition);
      doc.setTextColor(...managerColor);
      doc.text(row[2], colX[2], yPosition);
      doc.setTextColor(0, 0, 0);
      yPosition += rowHeight;
    });
  } else {
    // Tableau simple sans comparaison
    const scoreData = [
      ['Score Total', `${scores.total.toFixed(1)}%`, ''],
      ['Soft Skills', `${scores.softSkills.toFixed(1)}%`, `${moyenneSoftSkills.toFixed(1)}/5`],
      ['Hard Skills', `${scores.hardSkills.toFixed(1)}%`, `${(moyenneHardSkills * 2).toFixed(1)}/10`],
      ['Performance Projet', `${scores.performanceProjet.toFixed(1)}%`, `${(moyennePerformanceProjet * 2).toFixed(1)}/10`],
      ['Compétences IA', `${scores.competencesIA.toFixed(1)}%`, `${(moyenneIA * 2).toFixed(1)}/10`],
    ];

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const rowHeight = 8;
    const colWidths = [70, 40, 30];
    const colX = [margin, margin + colWidths[0], margin + colWidths[0] + colWidths[1]];

    // En-têtes du tableau
    doc.setFont('helvetica', 'bold');
    doc.text('Catégorie', colX[0], yPosition);
    doc.text('Score', colX[1], yPosition);
    doc.text('Détail', colX[2], yPosition);
    yPosition += rowHeight;

    // Ligne de séparation
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, yPosition - 2, pageWidth - margin, yPosition - 2);
    yPosition += 3;

    // Données du tableau
    doc.setFont('helvetica', 'normal');
    scoreData.forEach((row, index) => {
      checkPageBreak(rowHeight + 3);
      if (index === 0) {
        doc.setTextColor(...primaryColor);
        doc.setFont('helvetica', 'bold');
      } else {
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'normal');
      }
      doc.text(row[0], colX[0], yPosition);
      doc.text(row[1], colX[1], yPosition);
      if (row[2]) {
        doc.setFontSize(9);
        doc.setTextColor(...grayColor);
        doc.text(row[2], colX[2], yPosition);
        doc.setFontSize(10);
      }
      yPosition += rowHeight;
    });
  }

  yPosition += 10;

  // Niveau IA
  checkPageBreak(15);
  doc.setFontSize(12);
  doc.setTextColor(...purpleColor);
  doc.setFont('helvetica', 'bold');
  doc.text('Niveau Intelligence Artificielle', margin, yPosition);
  yPosition += 8;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  if (hasManagerEvaluation && scoresMgr) {
    doc.setTextColor(...primaryColor);
    doc.text(`Auto-évaluation : ${NIVEAU_IA_LABELS[scores.niveauIA]}`, margin, yPosition);
    yPosition += 7;
    doc.setTextColor(...managerColor);
    doc.text(`Évaluation Manager : ${NIVEAU_IA_LABELS[scoresMgr.niveauIA]}`, margin, yPosition);
    doc.setTextColor(0, 0, 0);
  } else {
    doc.setTextColor(0, 0, 0);
    doc.text(`Niveau actuel : ${NIVEAU_IA_LABELS[scores.niveauIA]}`, margin, yPosition);
  }
  yPosition += 15;

  // Analyse des compétences
  checkPageBreak(30);
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text('Analyse des compétences', margin, yPosition);
  yPosition += 10;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  // Points forts
  if (analyseData.pointsForts.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.text('Points forts :', margin, yPosition);
    yPosition += 7;
    doc.setFont('helvetica', 'normal');
    analyseData.pointsForts.forEach((point) => {
      // Gérer les retours à la ligne dans chaque point
      const pointLines = doc.splitTextToSize(`• ${point}`, pageWidth - 2 * margin - 5);
      pointLines.forEach((line: string, lineIndex: number) => {
        checkPageBreak(7);
        doc.text(line, margin + 5, yPosition);
        yPosition += 7;
      });
    });
    yPosition += 3;
  }

  // Axes d'amélioration
  if (analyseData.axesAmelioration.length > 0) {
    checkPageBreak(15);
    doc.setFont('helvetica', 'bold');
    doc.text('Axes d\'amélioration :', margin, yPosition);
    yPosition += 7;
    doc.setFont('helvetica', 'normal');
    analyseData.axesAmelioration.forEach((axe) => {
      // Gérer les retours à la ligne dans chaque axe
      const axeLines = doc.splitTextToSize(`• ${axe}`, pageWidth - 2 * margin - 5);
      axeLines.forEach((line: string) => {
        checkPageBreak(7);
        doc.text(line, margin + 5, yPosition);
        yPosition += 7;
      });
    });
    yPosition += 3;
  }

  // Recommandations prioritaires
  if (analyseData.recommandationsPrioritaires.length > 0) {
    checkPageBreak(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Recommandations prioritaires :', margin, yPosition);
    yPosition += 7;
    doc.setFont('helvetica', 'normal');
    analyseData.recommandationsPrioritaires.forEach((rec, index) => {
      // Gérer les retours à la ligne dans chaque recommandation
      const recLines = doc.splitTextToSize(`${index + 1}. ${rec}`, pageWidth - 2 * margin - 5);
      recLines.forEach((line: string) => {
        checkPageBreak(7);
        doc.text(line, margin + 5, yPosition);
        yPosition += 7;
      });
    });
  }
  
  // Plan de progression de l'analyse Gemini si disponible
  if (evaluation.analyseGemini?.planProgression && evaluation.analyseGemini.planProgression.length > 0) {
    checkPageBreak(25);
    doc.setFontSize(12);
    doc.setTextColor(...purpleColor);
    doc.setFont('helvetica', 'bold');
    doc.text('Plan de progression (6-12 mois)', margin, yPosition);
    yPosition += 8;
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    evaluation.analyseGemini.planProgression.forEach((etape, index) => {
      checkPageBreak(7);
      doc.text(`${index + 1}. ${etape}`, margin + 5, yPosition);
      yPosition += 7;
    });
    yPosition += 5;
  }
  
  // Analyse détaillée si disponible
  if (analyseData.analyseDetaillee) {
    checkPageBreak(30);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Analyse détaillée', margin, yPosition);
    yPosition += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    addTextWithLineBreaks(analyseData.analyseDetaillee, margin, pageWidth - 2 * margin, 7);
    yPosition += 5;
  }

  yPosition += 10;

  // Section Compétences IA détaillée
  checkPageBreak(40);
  doc.setFontSize(12);
  doc.setTextColor(...purpleColor);
  doc.setFont('helvetica', 'bold');
  doc.text('Compétences Intelligence Artificielle', margin, yPosition);
  yPosition += 10;

  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  doc.text(`Recommandation : ${recommandations.titre}`, margin, yPosition);
  yPosition += 7;
  addTextWithLineBreaks(recommandations.description, margin, pageWidth - 2 * margin, 7);
  yPosition += 5;

  // Outils IA recommandés
  if (recommandations.outils.length > 0) {
    checkPageBreak(15);
    doc.setFont('helvetica', 'bold');
    doc.text('Outils IA recommandés :', margin, yPosition);
    yPosition += 7;
    doc.setFont('helvetica', 'normal');
    recommandations.outils.slice(0, 6).forEach((outil) => {
      checkPageBreak(7);
      doc.text(`• ${outil}`, margin + 5, yPosition);
      yPosition += 7;
    });
    yPosition += 3;
  }

  // Plan de progression
  if (recommandations.planProgression.length > 0) {
    checkPageBreak(25);
    doc.setFont('helvetica', 'bold');
    doc.text('Plan de progression (6-12 mois) :', margin, yPosition);
    yPosition += 7;
    doc.setFont('helvetica', 'normal');
    recommandations.planProgression.forEach((etape, index) => {
      checkPageBreak(7);
      doc.text(`${index + 1}. ${etape}`, margin + 5, yPosition);
      yPosition += 7;
    });
  }

  yPosition += 15;

  // Détails des questions et réponses par groupe
  const groupes: Array<{ key: 'soft_skills' | 'hard_skills' | 'performance_projet'; label: string }> = [
    { key: 'soft_skills', label: 'Soft Skills' },
    { key: 'hard_skills', label: 'Hard Skills' },
    { key: 'performance_projet', label: 'Performance Projet' },
  ];

  groupes.forEach((groupe) => {
    const reponsesGroupe = evaluation.reponses.filter((r) => r.groupe === groupe.key);
    if (reponsesGroupe.length === 0) return;

    checkPageBreak(30);
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.text(groupe.label, margin, yPosition);
    yPosition += 10;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    reponsesGroupe.forEach((reponse, index) => {
      // Calculer la hauteur nécessaire pour cette réponse
      const questionLines = doc.splitTextToSize(`${index + 1}. ${reponse.question}`, pageWidth - 2 * margin - 10);
      let requiredHeight = questionLines.length * 6 + 10; // Question + espace
      if (reponse.categorieIA) requiredHeight += 6; // Badge IA
      requiredHeight += 6; // Label Auto-évaluation
      requiredHeight += 6; // Note auto
      if (reponse.commentaireCollaborateur) {
        const commentLines = doc.splitTextToSize(`"${reponse.commentaireCollaborateur}"`, pageWidth - 2 * margin - 25);
        requiredHeight += commentLines.length * 5 + 2;
      }
      if (reponse.noteManager !== undefined) {
        requiredHeight += 10; // Label + Note manager
        if (reponse.commentaireManager) {
          const commentMgrLines = doc.splitTextToSize(`"${reponse.commentaireManager}"`, pageWidth - 2 * margin - 25);
          requiredHeight += commentMgrLines.length * 5;
        }
      }
      requiredHeight += 8; // Espace final
      
      checkPageBreak(requiredHeight);
      
      // Question
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      // Réutiliser questionLines déjà calculé pour le checkPageBreak
      questionLines.forEach((line: string) => {
        doc.text(line, margin + 5, yPosition);
        yPosition += 6;
      });

      // Badge IA si applicable
      if (reponse.categorieIA) {
        doc.setFontSize(8);
        doc.setTextColor(...purpleColor);
        doc.text('(Compétence IA)', margin + 5, yPosition);
        yPosition += 6;
        doc.setFontSize(9);
      }

      // Note auto-évaluation
      yPosition += 3;
      doc.setFontSize(9);
      doc.setTextColor(...primaryColor);
      doc.setFont('helvetica', 'normal');
      const noteAutoText = `AutNote ${reponse.noteCollaborateur}/5 ${NOTE_LABELS[reponse.noteCollaborateur]}`;
      doc.text(noteAutoText, margin + 10, yPosition);
      yPosition += 6;

      // Commentaire collaborateur si présent
      if (reponse.commentaireCollaborateur) {
        doc.setFontSize(8);
        doc.setTextColor(...grayColor);
        doc.setFont('helvetica', 'italic');
        const commentText = `"${reponse.commentaireCollaborateur}"`;
        const commentLines = doc.splitTextToSize(commentText, pageWidth - 2 * margin - 25);
        commentLines.forEach((line: string) => {
          checkPageBreak(5);
          doc.text(line, margin + 15, yPosition);
          yPosition += 5;
        });
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        yPosition += 2;
      }

      // Note manager si présente
      if (reponse.noteManager !== undefined) {
        yPosition += 3;
        doc.setFontSize(9);
        doc.setTextColor(...managerColor);
        doc.setFont('helvetica', 'normal');
        const noteMgrText = `ÉvaNote ${reponse.noteManager}/5 ${NOTE_LABELS[reponse.noteManager]}`;
        doc.text(noteMgrText, margin + 10, yPosition);
        yPosition += 6;

        // Commentaire manager si présent
        if (reponse.commentaireManager) {
          doc.setFontSize(8);
          doc.setTextColor(...managerColor);
          doc.setFont('helvetica', 'italic');
          const commentMgrText = `"${reponse.commentaireManager}"`;
          const commentMgrLines = doc.splitTextToSize(commentMgrText, pageWidth - 2 * margin - 25);
          commentMgrLines.forEach((line: string) => {
            checkPageBreak(5);
            doc.text(line, margin + 15, yPosition);
            yPosition += 5;
          });
          doc.setFontSize(9);
          doc.setFont('helvetica', 'normal');
        }
      }

      yPosition += 8;
    });

    yPosition += 5;
  });

  // Commentaire collaborateur si présent
  if (evaluation.commentaires?.collaborateur) {
    checkPageBreak(25);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Commentaire collaborateur', margin, yPosition);
    yPosition += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const commentaire = evaluation.commentaires.collaborateur;
    const splitCommentaire = doc.splitTextToSize(commentaire, pageWidth - 2 * margin);
    splitCommentaire.forEach((line: string) => {
      checkPageBreak(7);
      doc.text(line, margin, yPosition);
      yPosition += 7;
    });
    yPosition += 5;
  }

  // Commentaire manager si présent
  if (hasManagerEvaluation && evaluation.commentaires?.manager) {
    checkPageBreak(25);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...managerColor);
    doc.text('Commentaires Manager', margin, yPosition);
    yPosition += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    const commentaireMgr = evaluation.commentaires.manager;
    const splitCommentaireMgr = doc.splitTextToSize(commentaireMgr, pageWidth - 2 * margin);
    splitCommentaireMgr.forEach((line: string) => {
      checkPageBreak(7);
      doc.text(line, margin, yPosition);
      yPosition += 7;
    });
  }

  // Pied de page
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...grayColor);
    doc.text(
      `Page ${i} sur ${totalPages}`,
      pageWidth - margin - 30,
      pageHeight - 10
    );
  }

  // Nom du fichier
  const fileName = `evaluation_${evaluation.collaborateur.matricule}_${formatDate(evaluation.timestamps.creation).replace(/\s/g, '_')}.pdf`;
  doc.save(fileName);
}


