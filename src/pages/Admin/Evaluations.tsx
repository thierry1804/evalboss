import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { FormInput, FormSelect } from '../../components/forms';
import { Badge } from '../../components/ui/Badge';
import { PROFIL_LABELS, NIVEAU_IA_LABELS, StatutEvaluation } from '../../types';
import { formatDateShort } from '../../lib/utils';
import { Search, Eye } from 'lucide-react';

interface EvaluationListItem {
  id: string;
  matricule: string;
  nom: string;
  prenom: string;
  poste: string;
  statut: StatutEvaluation;
  created_at: string;
  scores: {
    autoEvaluation: {
      total: number;
      competencesIA: number;
      niveauIA: string;
    };
    manager?: {
      total: number;
      competencesIA: number;
      niveauIA: string;
    };
  };
}

export function Evaluations() {
  const navigate = useNavigate();
  const [evaluations, setEvaluations] = useState<EvaluationListItem[]>([]);
  const [filteredEvaluations, setFilteredEvaluations] = useState<EvaluationListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    poste: '',
    statut: '',
    niveauIA: '',
  });

  useEffect(() => {
    loadEvaluations();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [evaluations, searchTerm, filters]);

  const loadEvaluations = async () => {
    setIsLoading(true);
    try {
      // Charger les évaluations avec une jointure pour récupérer les scores manager
      const { data: evaluationsData, error: evaluationsError } = await supabase
        .from('evaluations')
        .select('*')
        .order('created_at', { ascending: false });

      if (evaluationsError) throw evaluationsError;

      // Charger les scores manager depuis evaluations_manager
      const { data: managerData, error: managerError } = await supabase
        .from('evaluations_manager')
        .select('evaluation_id, scores_manager')
        .not('scores_manager', 'is', null);

      if (managerError) {
        console.warn('Erreur lors du chargement des scores manager:', managerError);
      }

      // Créer un map des scores manager par evaluation_id
      const managerScoresMap = new Map<string, any>();
      if (managerData) {
        managerData.forEach((item) => {
          if (item.scores_manager && Object.keys(item.scores_manager as object).length > 0) {
            managerScoresMap.set(item.evaluation_id, item.scores_manager);
          }
        });
      }

      // Fusionner les données
      const evaluationsWithManagerScores = (evaluationsData || []).map((evaluation) => {
        const managerScores = managerScoresMap.get(evaluation.id);
        
        // Utiliser les scores manager depuis evaluations_manager s'ils existent,
        // sinon utiliser ceux de evaluations.scores.manager
        const scores = evaluation.scores || {};
        if (managerScores) {
          return {
            ...evaluation,
            scores: {
              ...scores,
              manager: managerScores,
            },
          };
        }
        return evaluation;
      });

      setEvaluations(evaluationsWithManagerScores);
    } catch (error: any) {
      console.error('Erreur lors du chargement:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...evaluations];

    // Recherche par nom/matricule
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (e) =>
          e.nom.toLowerCase().includes(term) ||
          e.prenom.toLowerCase().includes(term) ||
          e.matricule.toLowerCase().includes(term)
      );
    }

    // Filtre par poste
    if (filters.poste) {
      filtered = filtered.filter((e) => e.poste === filters.poste);
    }

    // Filtre par statut
    if (filters.statut) {
      filtered = filtered.filter((e) => e.statut === filters.statut);
    }

    // Filtre par niveau IA
    if (filters.niveauIA) {
      filtered = filtered.filter(
        (e) => e.scores?.autoEvaluation?.niveauIA === filters.niveauIA
      );
    }

    setFilteredEvaluations(filtered);
  };

  const getStatutBadgeVariant = (statut: StatutEvaluation) => {
    switch (statut) {
      case 'validee':
        return 'success';
      case 'soumise':
        return 'info';
      default:
        return 'default';
    }
  };

  const posteOptions = [
    { value: '', label: 'Tous les postes' },
    ...Object.entries(PROFIL_LABELS).map(([value, label]) => ({ value, label })),
  ];

  const statutOptions = [
    { value: '', label: 'Tous les statuts' },
    { value: 'brouillon', label: 'Brouillon' },
    { value: 'soumise', label: 'Soumise' },
    { value: 'validee', label: 'Validée' },
  ];

  const niveauIAOptions = [
    { value: '', label: 'Tous les niveaux' },
    ...Object.entries(NIVEAU_IA_LABELS).map(([value, label]) => ({ value, label })),
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Liste des évaluations</h1>
            <p className="text-gray-600">
              {filteredEvaluations.length} évaluation(s) trouvée(s)
            </p>
          </div>
          <Button variant="primary" onClick={() => navigate('/admin')}>
            ← Dashboard
          </Button>
        </div>

        {/* Filtres */}
        <Card className="mb-6 p-4">
          <div className="flex flex-col lg:flex-row gap-3 items-end">
            {/* Champ de recherche */}
            <div className="flex-1 w-full lg:w-auto min-w-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <FormInput
                  placeholder="Rechercher par nom ou matricule..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            {/* Filtres en ligne compacte */}
            <div className="flex flex-wrap lg:flex-nowrap gap-3 w-full lg:w-auto">
              <div className="flex-1 lg:flex-none lg:w-48">
                <FormSelect
                  label="Poste"
                  value={filters.poste}
                  onChange={(e) => setFilters({ ...filters, poste: e.target.value })}
                  options={posteOptions}
                />
              </div>
              <div className="flex-1 lg:flex-none lg:w-40">
                <FormSelect
                  label="Statut"
                  value={filters.statut}
                  onChange={(e) => setFilters({ ...filters, statut: e.target.value as StatutEvaluation })}
                  options={statutOptions}
                />
              </div>
              <div className="flex-1 lg:flex-none lg:w-40">
                <FormSelect
                  label="Niveau IA"
                  value={filters.niveauIA}
                  onChange={(e) => setFilters({ ...filters, niveauIA: e.target.value })}
                  options={niveauIAOptions}
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Tableau */}
        <Card>
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4" />
              <p className="text-gray-600">Chargement des évaluations...</p>
            </div>
          ) : filteredEvaluations.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600">Aucune évaluation trouvée</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Collaborateur
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Poste
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Statut
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Score
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Score IA
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Score Manager
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredEvaluations.map((evaluation) => (
                    <tr key={evaluation.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {evaluation.prenom} {evaluation.nom}
                        </div>
                        <div className="text-sm text-gray-500">{evaluation.matricule}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {PROFIL_LABELS[evaluation.poste as keyof typeof PROFIL_LABELS]}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDateShort(evaluation.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant={getStatutBadgeVariant(evaluation.statut)}>
                          {evaluation.statut}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {evaluation.scores?.autoEvaluation?.total?.toFixed(1) || 'N/A'}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {evaluation.scores?.autoEvaluation?.competencesIA?.toFixed(1) || 'N/A'}%
                        </div>
                        {evaluation.scores?.autoEvaluation?.niveauIA && (
                          <Badge variant="ia" className="mt-1">
                            {NIVEAU_IA_LABELS[evaluation.scores.autoEvaluation.niveauIA as keyof typeof NIVEAU_IA_LABELS]}
                          </Badge>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {evaluation.scores?.manager ? (
                          <>
                            <div className="text-sm text-gray-900 font-medium">
                              {evaluation.scores.manager.total?.toFixed(1) || 'N/A'}%
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              IA: {evaluation.scores.manager.competencesIA?.toFixed(1) || 'N/A'}%
                            </div>
                            {evaluation.scores.manager.niveauIA && (
                              <Badge variant="ia" className="mt-1">
                                {NIVEAU_IA_LABELS[evaluation.scores.manager.niveauIA as keyof typeof NIVEAU_IA_LABELS]}
                              </Badge>
                            )}
                          </>
                        ) : (
                          <span className="text-sm text-gray-400">Non revue</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/admin/evaluations/${evaluation.id}`)}
                        >
                          <Eye size={16} className="mr-1" />
                          Voir
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

