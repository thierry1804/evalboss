import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  
  // Actions
  signIn: (email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  checkSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: false,
  error: null,

  signIn: async (email: string, password: string) => {
    set({ loading: true, error: null });
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        set({ error: error.message, loading: false });
        return false;
      }

      set({ user: data.user, loading: false, error: null });
      return true;
    } catch (error: any) {
      set({ error: error.message || 'Erreur lors de la connexion', loading: false });
      return false;
    }
  },

  signOut: async () => {
    set({ loading: true });
    
    try {
      await supabase.auth.signOut();
      set({ user: null, loading: false, error: null });
    } catch (error: any) {
      set({ error: error.message || 'Erreur lors de la déconnexion', loading: false });
    }
  },

  checkSession: async () => {
    set({ loading: true });
    
    try {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        set({ error: error.message, loading: false });
        return;
      }

      set({ user: session?.user ?? null, loading: false, error: null });
    } catch (error: any) {
      set({ error: error.message || 'Erreur lors de la vérification de session', loading: false });
    }
  },
}));

