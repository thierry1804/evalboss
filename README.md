# Application d'Évaluation des Collaborateurs avec Compétences IA

Application web complète d'évaluation 360° des collaborateurs avec intégration innovante des compétences en Intelligence Artificielle.

## 🎯 Fonctionnalités principales

### Pour les collaborateurs (accès public)

- **Formulaire d'identification** avec validation stricte et vérification anti-doublon (10 mois)
- **Questionnaire d'auto-évaluation adaptatif** par profil métier :
  - Soft Skills (8 questions communes, coefficient 5)
  - Hard Skills (questions traditionnelles + 5-6 questions IA spécialisées, coefficient 10)
  - Performance Projet (questions adaptées avec section IA, coefficient 10)
- **Page de résultats** avec :
  - Calculs automatiques des scores
  - Graphiques radar et barres interactifs
  - Analyse automatique des points forts et axes d'amélioration
  - Section dédiée aux compétences IA avec recommandations personnalisées
- **Sauvegarde automatique** toutes les 30 secondes

### Pour les managers (accès authentifié)

- **Dashboard analytics** avec statistiques globales et baromètre IA
- **Liste des évaluations** avec filtres avancés (poste, statut, niveau IA)
- **Détail d'évaluation** avec :
  - Comparaison visuelle auto-évaluation vs manager
  - Saisie des notes manager avec commentaires
  - Analyse des écarts significatifs
  - Recommandations IA basées sur l'évaluation croisée

## 🛠️ Technologies utilisées

- **Frontend** : React 18+ avec TypeScript
- **Styling** : Tailwind CSS 3+
- **Graphiques** : Recharts
- **Validation** : Zod
- **État global** : Zustand
- **Routing** : React Router DOM
- **Backend** : Supabase (PostgreSQL, Auth)
- **Date** : date-fns

## 📋 Prérequis

- Node.js 18+ et npm
- Compte Supabase (gratuit)
- Accès à un projet Supabase

## 🚀 Installation

1. **Cloner le projet**
   ```bash
   git clone <repository-url>
   cd eval2
   ```

2. **Installer les dépendances**
   ```bash
   npm install
   ```

3. **Configurer Supabase**

   - Créer un projet sur [Supabase](https://supabase.com)
   - Dans Supabase Dashboard, aller dans SQL Editor
   - Exécuter le script de migration : `supabase/migrations/001_initial_schema.sql`
   - Récupérer l'URL du projet et la clé anonyme (Settings > API)

4. **Configurer les variables d'environnement**

   Créer un fichier `.env` à la racine du projet :
   ```env
   VITE_SUPABASE_URL=your-supabase-project-url
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

5. **Lancer l'application**
   ```bash
   npm run dev
   ```

   L'application sera accessible sur `http://localhost:5173`

## 📁 Structure du projet

```
src/
├── components/          # Composants réutilisables
│   ├── ui/             # Composants UI de base
│   ├── forms/          # Composants de formulaires
│   ├── charts/         # Composants de graphiques
│   └── layout/         # Layout components
├── pages/              # Pages principales
│   ├── Home.tsx        # Page d'accueil collaborateur
│   ├── Questionnaire.tsx
│   ├── Resultats.tsx
│   └── Admin/          # Pages admin
├── lib/                # Utilitaires
│   ├── supabase.ts     # Client Supabase
│   ├── validation.ts   # Schémas Zod
│   ├── utils.ts
│   ├── scoreCalculator.ts
│   └── recommendations.ts
├── store/              # État global Zustand
├── types/              # Types TypeScript
└── data/               # Données statiques (questions)
```

## 👥 Profils métier supportés

1. Intégrateur graphiste
2. Développeur
3. Tech Lead
4. Lead Dev
5. Référent technique
6. Business Analyst (BA)
7. Chef de Projet (CP)
8. PMO (Project Management Officer)

## 🔐 Authentification

- **Collaborateurs** : Pas d'authentification requise (accès public par matricule)
- **Managers** : Authentification Supabase Auth requise (email/mot de passe)

Pour créer un compte manager :
1. Dans Supabase Dashboard, aller dans Authentication > Users
2. Créer un nouvel utilisateur
3. Créer une entrée correspondante dans la table `managers`

## 📊 Calcul des scores

- **Score par groupe** = (Moyenne des notes × Coefficient) / 5 × 100
- **Score total** = Somme des scores par groupe (max 100)
- **Score IA** = Moyenne des questions IA sur 5, convertie sur 100
- **Niveau IA** :
  - Débutant : < 40
  - Intermédiaire : 40-59
  - Avancé : 60-79
  - Expert : ≥ 80

## 🎨 Design System

- **Couleurs principales** : Bleus (#2563eb, #1d4ed8)
- **Couleurs IA** : Violet (#8b5cf6), Cyan (#06b6d4)
- **Police** : Inter
- **Responsive** : Mobile-first

## 📝 Scripts disponibles

- `npm run dev` : Lancer le serveur de développement
- `npm run build` : Construire pour la production
- `npm run preview` : Prévisualiser le build de production
- `npm run lint` : Lancer le linter
- `npm run typecheck` : Vérifier les types TypeScript

## 🔒 Sécurité

- Row Level Security (RLS) activé sur toutes les tables Supabase
- Validation stricte des données côté client et serveur
- Protection des routes admin avec authentification
- Vérification anti-doublon (10 mois minimum entre évaluations)

## 📈 Fonctionnalités avancées

- Sauvegarde automatique toutes les 30 secondes
- Export Excel/PDF (à implémenter)
- Notifications toast
- Mode hors-ligne avec IndexedDB (à implémenter)
- Audit trail complet

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à ouvrir une issue ou une pull request.

## 📄 Licence

Ce projet est sous licence MIT.

## 📞 Support

Pour toute question ou problème, ouvrez une issue sur le repository.

