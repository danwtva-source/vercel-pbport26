import { describe, expect, it } from 'vitest';
import { getDashboardPageForRole } from '../utils/routing';

describe('getDashboardPageForRole', () => {
  it('routes admins to admin dashboard', () => {
    expect(getDashboardPageForRole('admin')).toBe('admin');
  });

  it('routes committee to committee dashboard', () => {
    expect(getDashboardPageForRole('committee')).toBe('committee');
  });

  it('routes applicants to applicant dashboard', () => {
    expect(getDashboardPageForRole('applicant')).toBe('applicant');
  });
});
