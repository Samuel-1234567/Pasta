import { CURRENT_USER_ID } from './current-user'

/**
 * Temporary auth stub.
 * Treats a fixed UUID as the currently logged-in user until real auth is built.
 */
export function getCurrentUserId(): string {
  return CURRENT_USER_ID
}

