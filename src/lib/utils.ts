import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Fonction pour combiner les classes Tailwind
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Fonction pour formater une date en format français
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(d);
}

// Fonction pour formater une date courte
export function formatDateShort(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('fr-FR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

// Fonction pour calculer la différence en mois entre deux dates
export function monthsDiff(date1: Date, date2: Date): number {
  const months = (date2.getFullYear() - date1.getFullYear()) * 12;
  return months - date1.getMonth() + date2.getMonth();
}

// Fonction pour générer un UUID v4
export function generateId(): string {
  // Utiliser crypto.randomUUID() si disponible (navigateurs modernes)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback pour générer un UUID v4 manuellement
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Fonction pour arrondir à 2 décimales
export function roundToTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100;
}

// Fonction pour calculer le pourcentage
export function calculatePercentage(value: number, max: number): number {
  if (max === 0) return 0;
  return roundToTwoDecimals((value / max) * 100);
}

