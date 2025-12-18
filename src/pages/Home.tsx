import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { FormInput, FormSelect, FormDatePicker } from '../components/forms';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { useEvaluationStore } from '../store/evaluationStore';
import { collaborateurSchema, validateNoRecentEvaluation } from '../lib/validation';
import { supabase } from '../lib/supabase';
import { PROFIL_LABELS, NIVEAU_SENIORITE_LABELS, ProfilType, NiveauSeniorite } from '../types';
import { validateDateField } from '../lib/validation';

export function Home() {
  const navigate = useNavigate();
  const initializeEvaluation = useEvaluationStore((state) => state.initializeEvaluation);
  const evaluationError = useEvaluationStore((state) => state.error);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    matricule: '',
    nom: '',
    prenom: '',
    poste: '' as ProfilType | '',
    niveauSeniorite: '' as NiveauSeniorite | '',
    dateIntegration: '',
    dateDerniereEval: '',
  });

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Effacer l'erreur pour ce champ
    if (validationErrors[field]) {
      setValidationErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
    setError(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setValidationErrors({});

    try {
      // Validation des dates
      let dateIntegration: Date;
      let dateDerniereEval: Date | undefined;

      try {
        dateIntegration = validateDateField(formData.dateIntegration);
      } catch (err: any) {
        setValidationErrors({ dateIntegration: err.message });
        return;
      }

      if (formData.dateDerniereEval) {
        try {
          dateDerniereEval = validateDateField(formData.dateDerniereEval);
        } catch (err: any) {
          setValidationErrors({ dateDerniereEval: err.message });
          return;
        }
      }

      // Validation avec Zod
      const validatedData = collaborateurSchema.parse({
        ...formData,
        poste: formData.poste as ProfilType,
        niveauSeniorite: formData.niveauSeniorite as NiveauSeniorite,
        dateIntegration,
        dateDerniereEval: dateDerniereEval || undefined,
      });

      // Vérification anti-doublon (10 derniers mois)
      setIsLoading(true);
      const validationResult = await validateNoRecentEvaluation(
        validatedData.matricule,
        supabase
      );

      if (!validationResult.valid) {
        setError(validationResult.message || 'Une évaluation existe déjà pour ce matricule');
        setIsLoading(false);
        return;
      }

      // Initialiser l'évaluation
      await initializeEvaluation(validatedData);
      
      // Récupérer l'ID de l'évaluation depuis le store
      // Attendre un peu pour que le store soit mis à jour
      await new Promise(resolve => setTimeout(resolve, 100));
      const currentEval = useEvaluationStore.getState().currentEvaluation;
      if (currentEval) {
        navigate(`/questionnaire/${currentEval.id}`);
      } else {
        setError('Erreur lors de la création de l\'évaluation');
        setIsLoading(false);
      }
    } catch (err: any) {
      console.error('Erreur de validation:', err);
      
      if (err.errors) {
        // Erreurs Zod
        const errors: Record<string, string> = {};
        err.errors.forEach((error: any) => {
          const field = error.path[0];
          errors[field] = error.message;
        });
        setValidationErrors(errors);
      } else {
        setError(err.message || 'Une erreur est survenue lors de la validation');
      }
      setIsLoading(false);
    }
  };

  const profilOptions = Object.entries(PROFIL_LABELS).map(([value, label]) => ({
    value,
    label,
  }));

  const niveauOptions = Object.entries(NIVEAU_SENIORITE_LABELS).map(([value, label]) => ({
    value,
    label,
  }));

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Évaluation des compétences
          </h1>
          <p className="text-gray-600">
            Évaluez vos compétences professionnelles et vos compétences en Intelligence Artificielle
          </p>
        </div>

        <Card>
          <form onSubmit={handleSubmit} className="space-y-6">
            {(error || evaluationError) && (
              <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
                {error || evaluationError}
              </div>
            )}

            <div className="space-y-6">
              {/* Matricule, Nom, Prénom sur la même ligne */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormInput
                  label="Matricule"
                  value={formData.matricule}
                  onChange={(e) => handleChange('matricule', e.target.value)}
                  error={validationErrors.matricule}
                  required
                  placeholder="ABC123"
                />

                <FormInput
                  label="Nom"
                  value={formData.nom}
                  onChange={(e) => handleChange('nom', e.target.value)}
                  error={validationErrors.nom}
                  required
                />

                <FormInput
                  label="Prénom"
                  value={formData.prenom}
                  onChange={(e) => handleChange('prenom', e.target.value)}
                  error={validationErrors.prenom}
                  required
                />
              </div>

              {/* Poste et Niveau de séniorité sur la même ligne */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormSelect
                  label="Poste"
                  value={formData.poste}
                  onChange={(e) => handleChange('poste', e.target.value)}
                  error={validationErrors.poste}
                  options={profilOptions}
                  required
                />

                <FormSelect
                  label="Niveau de séniorité"
                  value={formData.niveauSeniorite}
                  onChange={(e) => handleChange('niveauSeniorite', e.target.value)}
                  error={validationErrors.niveauSeniorite}
                  options={niveauOptions}
                  required
                />
              </div>

              {/* Les dates sur la même ligne */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormDatePicker
                  label="Date d'intégration"
                  value={formData.dateIntegration}
                  onChange={(e) => handleChange('dateIntegration', e.target.value)}
                  error={validationErrors.dateIntegration}
                  required
                />

                <FormDatePicker
                  label="Date de la dernière évaluation (optionnel)"
                  value={formData.dateDerniereEval}
                  onChange={(e) => handleChange('dateDerniereEval', e.target.value)}
                  error={validationErrors.dateDerniereEval}
                />
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button type="submit" isLoading={isLoading} size="lg">
                Commencer l'évaluation
              </Button>
            </div>
          </form>
        </Card>

        <div className="mt-6 text-center text-sm text-gray-600">
          <p>
            Les informations saisies seront sauvegardées automatiquement en brouillon.
            <br />
            Vous pourrez reprendre votre évaluation à tout moment.
          </p>
        </div>
      </div>
    </div>
  );
}

