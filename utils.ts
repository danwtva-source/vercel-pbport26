// utils.ts - Utility Functions for PB Portal

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
  }
} as const;

/**
 * Build the eligibility helper copy for voting surfaces.
 */
export const getEligibilityCopy = (requiresAccount: boolean): string => {
  return requiresAccount
    ? 'An account is required to vote.'
    : 'No account required to vote.';
};
