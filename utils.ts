// utils.ts - Utility Functions for PB Portal
import { UserRole } from './types';

/**
 * Format a number as GBP currency
 * @param amount - The numeric amount to format
 * @returns Formatted currency string (e.g., "£1,234.56")
 */
export const formatCurrency = (amount: number | undefined | null): string => {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return '£0.00';
  }
  
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

/**
 * Canonical routes for the application
 * Use these constants for all navigation to ensure consistency
 */
export const ROUTES = {
  // Public routes
  PUBLIC: {
    HOME: '/',
    PRIORITIES: '/priorities',
    VOTING_ZONE: '/vote',
    RESOURCES: '/documents',
    TIMELINE: '/timeline',
    LOGIN: '/login',
  },
  
  // Secure portal routes
  PORTAL: {
    ROOT: '/portal',
    DASHBOARD: '/portal/dashboard',

    // Applicant routes
    APPLICANT: '/portal/applicant',
    APPLICATIONS: '/portal/applications',
    APPLICATIONS_NEW: '/portal/applications/new',
    APPLICATION_DETAIL: (id: string) => `/portal/applications/${id}`,

    // Committee routes
    SCORING: '/portal/scoring',
    DOCUMENTS: '/portal/documents',

    // Admin routes
    ADMIN: '/portal/admin',

    // User settings
    SETTINGS: '/portal/settings',
  }
} as const;

export type StoredRole = 'admin' | 'committee' | 'applicant';

export const toStoredRole = (role: string | undefined | null): StoredRole => {
  const normalized = (role || '').toString().trim().toLowerCase();
  if (normalized === 'admin' || normalized === 'committee' || normalized === 'applicant') {
    return normalized;
  }
  if (normalized === 'community' || normalized === 'public') {
    return 'applicant';
  }
  return 'applicant';
};

export const toUserRole = (role: string | undefined | null): UserRole => {
  const normalized = (role || '').toString().trim().toUpperCase();
  switch (normalized) {
    case UserRole.ADMIN:
      return UserRole.ADMIN;
    case UserRole.COMMITTEE:
      return UserRole.COMMITTEE;
    case UserRole.APPLICANT:
      return UserRole.APPLICANT;
    case UserRole.COMMUNITY:
      return UserRole.COMMUNITY;
    default:
      return UserRole.PUBLIC;
  }
};

export const isStoredRole = (role: string | undefined | null, target: StoredRole): boolean => {
  return toStoredRole(role) === target;
};
