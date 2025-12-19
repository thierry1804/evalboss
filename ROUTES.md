# Routes de l'application

## Routes publiques (accessibles sans authentification)

| Route | Composant | Description |
|-------|-----------|-------------|
| `/` | `Home` | Page d'accueil pour créer une nouvelle évaluation |
| `/questionnaire/:evaluationId` | `Questionnaire` | Questionnaire d'évaluation pour un collaborateur |
| `/resultats/:evaluationId` | `Resultats` | Résultats de l'évaluation pour un collaborateur |
| `/evaluation/:id` | `EvaluationView` | Visualisation publique d'une évaluation (lecture seule) |

## Routes admin (non protégées)

| Route | Composant | Description |
|-------|-----------|-------------|
| `/admin/login` | `Login` | Page de connexion pour les administrateurs/managers |

## Routes admin (protégées - nécessitent une authentification)

| Route | Composant | Description |
|-------|-----------|-------------|
| `/admin` | `Dashboard` | Tableau de bord administrateur |
| `/admin/evaluations` | `Evaluations` | Liste de toutes les évaluations |
| `/admin/evaluations/:id` | `EvaluationDetail` | Détail d'une évaluation pour un manager/admin |

## Redirection par défaut

| Route | Action |
|-------|--------|
| `*` (toutes les autres routes) | Redirige vers `/` |

