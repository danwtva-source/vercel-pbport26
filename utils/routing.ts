import { Role } from '../types';

export const getDashboardPageForRole = (role: Role): 'admin' | 'committee' | 'applicant' => {
  switch (role) {
    case 'admin':
      return 'admin';
    case 'committee':
      return 'committee';
    case 'applicant':
    default:
      return 'applicant';
  }
};
