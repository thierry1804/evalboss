import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabase';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { BarChartComponent } from '../../components/charts/BarChart';
import { PROFIL_LABELS, NIVEAU_IA_LABELS } from '../../types';
import { LogOut, Users, FileText, CheckCircle, Clock } from 'lucide-react';

interface Stats {
  totalEvaluations: number;
  brouillons: number;
  soumises: number;
  validees: number;
  scoresMoyens: {
    total: number;
    softSkills: number;
    hardSkills: number;
    performanceProjet: number;
    competencesIA: number;
  };
  scoresParProfil: Record<string, number>;
  scoresIAParProfil: Record<string, number>;
  niveauxIA: Record<string, number>;
}

export function Dashboard() {
  const navigate = useNavigate();
  const signOut = useAuthStore((state) => state.signOut);
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.from('evaluations').select('*');

      if (error) throw error;

      if (data) {
        const evaluations = data as any[];

        const totalEvaluations = evaluations.length;
        const brouillons = evaluations.filter((e) => e.statut === 'brouillon').length;
        const soumises = evaluations.filter((e) => e.statut === 'soumise').length;
        const validees = evaluations.filter((e) => e.statut === 'validee').length;

        // Calculer les scores moyens
        const scoresMoyens = {
          total: 0,
          softSkills: 0,
          hardSkills: 0,
          performanceProjet: 0,
          competencesIA: 0,
        };

        const scoresParProfil: Record<string, { total: number; count: number }> = {};
        const scoresIAParProfil: Record<string, { total: number; count: number }> = {};
        const niveauxIA: Record<string, number> = {};

        evaluations.forEach((e) => {
          const scores = e.scores?.autoEvaluation;
          if (scores) {
            scoresMoyens.total += scores.total || 0;
            scoresMoyens.softSkills += scores.softSkills || 0;
            scoresMoyens.hardSkills += scores.hardSkills || 0;
            scoresMoyens.performanceProjet += scores.performanceProjet || 0;
            scoresMoyens.competencesIA += scores.competencesIA || 0;

            const poste = e.poste;
            if (!scoresParProfil[poste]) {
              scoresParProfil[poste] = { total: 0, count: 0 };
            }
            scoresParProfil[poste].total += scores.total || 0;
            scoresParProfil[poste].count += 1;

            if (!scoresIAParProfil[poste]) {
              scoresIAParProfil[poste] = { total: 0, count: 0 };
            }
            scoresIAParProfil[poste].total += scores.competencesIA || 0;
            scoresIAParProfil[poste].count += 1;

            const niveauIA = scores.niveauIA;
            niveauxIA[niveauIA] = (niveauxIA[niveauIA] || 0) + 1;
          }
        });

        const count = evaluations.filter((e) => e.scores?.autoEvaluation).length;
        if (count > 0) {
          scoresMoyens.total = scoresMoyens.total / count;
          scoresMoyens.softSkills = scoresMoyens.softSkills / count;
          scoresMoyens.hardSkills = scoresMoyens.hardSkills / count;
          scoresMoyens.performanceProjet = scoresMoyens.performanceProjet / count;
          scoresMoyens.competencesIA = scoresMoyens.competencesIA / count;
        }

        // Calculer les moyennes par profil
        const scoresParProfilMoyens: Record<string, number> = {};
        Object.entries(scoresParProfil).forEach(([profil, data]) => {
          scoresParProfilMoyens[profil] = data.count > 0 ? data.total / data.count : 0;
        });

        const scoresIAParProfilMoyens: Record<string, number> = {};
        Object.entries(scoresIAParProfil).forEach(([profil, data]) => {
          scoresIAParProfilMoyens[profil] = data.count > 0 ? data.total / data.count : 0;
        });

        setStats({
          totalEvaluations,
          brouillons,
          soumises,
          validees,
          scoresMoyens,
          scoresParProfil: scoresParProfilMoyens,
          scoresIAParProfil: scoresIAParProfilMoyens,
          niveauxIA,
        });
      }
    } catch (error: any) {
      console.error('Erreur:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/admin/login');
  };

  if (isLoading || !stats) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4" />
          <p className="text-gray-600">Chargement du dashboard...</p>
        </div>
      </div>
    );
  }

  // Données pour le graphique des scores moyens
  const barDataScores = [
    { name: 'Soft Skills', value: stats.scoresMoyens.softSkills },
    { name: 'Hard Skills', value: stats.scoresMoyens.hardSkills },
    { name: 'Performance Projet', value: stats.scoresMoyens.performanceProjet },
    { name: 'Compétences IA', value: stats.scoresMoyens.competencesIA },
  ];

  // Données pour le graphique des scores par profil
  const barDataProfil = Object.entries(stats.scoresParProfil).map(([profil, score]) => ({
    name: PROFIL_LABELS[profil as keyof typeof PROFIL_LABELS] || profil,
    value: score,
  }));

  // Données pour le graphique des scores IA par profil
  const barDataIAProfil = Object.entries(stats.scoresIAParProfil).map(([profil, score]) => ({
    name: PROFIL_LABELS[profil as keyof typeof PROFIL_LABELS] || profil,
    value: score,
  }));

  // Données pour la répartition des niveaux IA
  const barDataNiveauxIA = Object.entries(stats.niveauxIA).map(([niveau, count]) => ({
    name: NIVEAU_IA_LABELS[niveau as keyof typeof NIVEAU_IA_LABELS] || niveau,
    value: count,
  }));

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard Analytics</h1>
            <p className="text-gray-600">Vue d'ensemble des évaluations</p>
          </div>
          <div className="flex gap-3">
            <Button variant="primary" onClick={() => navigate('/admin/evaluations')}>
              Liste des évaluations
            </Button>
            <Button variant="ghost" onClick={handleSignOut}>
              <LogOut size={16} className="mr-2" />
              Déconnexion
            </Button>
          </div>
        </div>

        {/* Statistiques globales */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="text-center">
            <Users className="mx-auto text-primary-600 mb-2" size={32} />
            <div className="text-3xl font-bold text-gray-900 mb-1">{stats.totalEvaluations}</div>
            <div className="text-sm text-gray-600">Total évaluations</div>
          </Card>
          <Card className="text-center">
            <Clock className="mx-auto text-yellow-600 mb-2" size={32} />
            <div className="text-3xl font-bold text-gray-900 mb-1">{stats.brouillons}</div>
            <div className="text-sm text-gray-600">Brouillons</div>
          </Card>
          <Card className="text-center">
            <FileText className="mx-auto text-blue-600 mb-2" size={32} />
            <div className="text-3xl font-bold text-gray-900 mb-1">{stats.soumises}</div>
            <div className="text-sm text-gray-600">Soumises</div>
          </Card>
          <Card className="text-center">
            <CheckCircle className="mx-auto text-green-600 mb-2" size={32} />
            <div className="text-3xl font-bold text-gray-900 mb-1">{stats.validees}</div>
            <div className="text-sm text-gray-600">Validées</div>
          </Card>
        </div>

        {/* Scores moyens globaux */}
        <Card className="mb-8">
          <h3 className="text-lg font-semibold mb-4">Scores moyens globaux</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary-600">{stats.scoresMoyens.total.toFixed(1)}</div>
              <div className="text-sm text-gray-600">Score Total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{stats.scoresMoyens.softSkills.toFixed(1)}</div>
              <div className="text-sm text-gray-600">Soft Skills</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{stats.scoresMoyens.hardSkills.toFixed(1)}</div>
              <div className="text-sm text-gray-600">Hard Skills</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{stats.scoresMoyens.performanceProjet.toFixed(1)}</div>
              <div className="text-sm text-gray-600">Performance Projet</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-ia-purple">{stats.scoresMoyens.competencesIA.toFixed(1)}</div>
              <div className="text-sm text-gray-600">Compétences IA</div>
            </div>
          </div>
          <BarChartComponent data={barDataScores} title="Répartition des scores moyens" />
        </Card>

        {/* Graphiques par profil */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <BarChartComponent data={barDataProfil} title="Scores moyens par profil" />
          </Card>
          <Card>
            <BarChartComponent data={barDataIAProfil} title="Scores IA moyens par profil" color="#8b5cf6" />
          </Card>
        </div>

        {/* Baromètre IA */}
        <Card className="mb-8 bg-gradient-to-r from-ia-purple/10 to-ia-cyan/10 border-2 border-ia-purple/20">
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span className="text-ia-purple">📊</span>
            Baromètre Intelligence Artificielle
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-gray-700 mb-4">Répartition des niveaux IA</h4>
              <BarChartComponent data={barDataNiveauxIA} title="" color="#8b5cf6" />
            </div>
            
            <div>
              <h4 className="font-semibold text-gray-700 mb-4">Scores IA par profil</h4>
              <div className="space-y-3">
                {Object.entries(stats.scoresIAParProfil)
                  .sort(([, a], [, b]) => b - a)
                  .map(([profil, score]) => (
                    <div key={profil}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium text-gray-700">
                          {PROFIL_LABELS[profil as keyof typeof PROFIL_LABELS] || profil}
                        </span>
                        <span className="text-sm font-bold text-ia-purple">{score.toFixed(1)} / 100</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-ia-purple to-ia-cyan h-2 rounded-full"
                          style={{ width: `${score}%` }}
                        />
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </Card>

        {/* Résumé */}
        <Card>
          <h3 className="text-lg font-semibold mb-4">Analyse globale</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-gray-700 mb-2">Tendances</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Score moyen global : <strong>{stats.scoresMoyens.total.toFixed(1)} / 100</strong></li>
                <li>• Score IA moyen : <strong>{stats.scoresMoyens.competencesIA.toFixed(1)} / 100</strong></li>
                <li>• Taux de soumission : <strong>{((stats.soumises / stats.totalEvaluations) * 100).toFixed(1)}%</strong></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-700 mb-2">Actions recommandées</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                {stats.brouillons > 0 && (
                  <li>• {stats.brouillons} évaluation(s) en brouillon à finaliser</li>
                )}
                {stats.scoresMoyens.competencesIA < 50 && (
                  <li>• Renforcer la formation IA (score moyen: {stats.scoresMoyens.competencesIA.toFixed(1)})</li>
                )}
                <li>• Analyser les écarts entre auto-évaluations et évaluations manager</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

