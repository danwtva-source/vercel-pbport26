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
 * Format a date in UK format (DD/MM/YYYY)
 * @param date - Date object, timestamp, or ISO string
 * @returns Formatted date string (e.g., "25/12/2025")
 */
export const formatDateUK = (date: Date | number | string | undefined | null): string => {
  if (date === undefined || date === null) {
    return '';
  }

  const dateObj = date instanceof Date ? date : new Date(date);

  if (isNaN(dateObj.getTime())) {
    return '';
  }

  return dateObj.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

/**
 * Format a date and time in UK format (DD/MM/YYYY HH:mm)
 * @param date - Date object, timestamp, or ISO string
 * @returns Formatted date-time string (e.g., "25/12/2025 14:30")
 */
export const formatDateTimeUK = (date: Date | number | string | undefined | null): string => {
  if (date === undefined || date === null) {
    return '';
  }

  const dateObj = date instanceof Date ? date : new Date(date);

  if (isNaN(dateObj.getTime())) {
    return '';
  }

  return dateObj.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
};

/**
 * Format a relative time (e.g., "2 days ago", "in 3 hours")
 * @param date - Date object, timestamp, or ISO string
 * @returns Relative time string
 */
export const formatRelativeTime = (date: Date | number | string | undefined | null): string => {
  if (date === undefined || date === null) {
    return '';
  }

  const dateObj = date instanceof Date ? date : new Date(date);

  if (isNaN(dateObj.getTime())) {
    return '';
  }

  const now = new Date();
  const diffMs = dateObj.getTime() - now.getTime();
  const diffSecs = Math.round(diffMs / 1000);
  const diffMins = Math.round(diffSecs / 60);
  const diffHours = Math.round(diffMins / 60);
  const diffDays = Math.round(diffHours / 24);

  const rtf = new Intl.RelativeTimeFormat('en-GB', { numeric: 'auto' });

  if (Math.abs(diffDays) >= 1) {
    return rtf.format(diffDays, 'day');
  } else if (Math.abs(diffHours) >= 1) {
    return rtf.format(diffHours, 'hour');
  } else if (Math.abs(diffMins) >= 1) {
    return rtf.format(diffMins, 'minute');
  } else {
    return 'just now';
  }
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
    VOTING_ZONE: '/voting',
    VOTING_LIVE: '/voting/live',
    RESOURCES: '/resources',
    TIMELINE: '/timeline',
    LOGIN: '/login',
    ALIASES: {
      VOTING_ZONE: '/vote',
      VOTING_LIVE: '/public-voting',
      RESOURCES: '/documents',
    },
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
