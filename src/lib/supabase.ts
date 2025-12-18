import { createClient } from '@supabase/supabase-js';

// Variables d'environnement pour Supabase
// À remplacer par vos vraies valeurs dans un fichier .env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase URL and Anon Key must be set in environment variables. ' +
    'Create a .env file with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types pour les tables Supabase
export interface Database {
  public: {
    Tables: {
      evaluations: {
        Row: {
          id: string;
          matricule: string;
          nom: string;
          prenom: string;
          poste: string;
          niveau_seniorite: string;
          date_integration: string;
          date_derniere_eval: string | null;
          reponses: unknown;
          scores: unknown;
          commentaires: unknown;
          statut: string;
          timestamps: unknown;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          matricule: string;
          nom: string;
          prenom: string;
          poste: string;
          niveau_seniorite: string;
          date_integration: string;
          date_derniere_eval?: string | null;
          reponses: unknown;
          scores: unknown;
          commentaires?: unknown;
          statut: string;
          timestamps: unknown;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          matricule?: string;
          nom?: string;
          prenom?: string;
          poste?: string;
          niveau_seniorite?: string;
          date_integration?: string;
          date_derniere_eval?: string | null;
          reponses?: unknown;
          scores?: unknown;
          commentaires?: unknown;
          statut?: string;
          timestamps?: unknown;
          updated_at?: string;
        };
      };
      questions: {
        Row: {
          id: string;
          profil: string;
          groupe: string;
          question: string;
          categorie_ia: boolean;
          coefficient: number;
          ordre: number;
          created_at: string;
        };
      };
      managers: {
        Row: {
          id: string;
          email: string;
          nom: string;
          created_at: string;
        };
      };
      evaluations_manager: {
        Row: {
          id: string;
          evaluation_id: string;
          manager_id: string;
          reponses_manager: unknown;
          scores_manager: unknown;
          commentaire_manager: string | null;
          created_at: string;
          updated_at: string;
        };
      };
    };
  };
}

