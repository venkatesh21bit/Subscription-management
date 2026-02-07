import { authStorage } from './localStorage';

export interface SessionData {
  access: string | null;
  refresh: string | null;
  company_id: string | null;
}

/**
 * Get session data from localStorage
 * Returns tokens and company_id for authenticated requests
 */
export function getSessionData(): SessionData {
  return {
    access: authStorage.getAccessToken(),
    refresh: authStorage.getRefreshToken(),
    company_id: authStorage.getCompanyId(),
  };
}

/**
 * Check if user has a valid session (has access token)
 */
export function hasValidSession(): boolean {
  return !!authStorage.getAccessToken();
}

/**
 * Clear session data
 */
export function clearSession(): void {
  authStorage.clearAll();
}
