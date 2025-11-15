export interface User {
  id: number;
  email: string;
  full_name: string;
}

export interface AuthToken {
  access_token: string;
  token_type: string;
}

export function setAuthToken(token: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('token', token);
  }
}

export function getAuthToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('token');
  }
  return null;
}

export function removeAuthToken(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }
}

export function setUser(user: User): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('user', JSON.stringify(user));
  }
}

export function getUser(): User | null {
  if (typeof window !== 'undefined') {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch {
        return null;
      }
    }
  }
  return null;
}

export function isAuthenticated(): boolean {
  return getAuthToken() !== null;
}

/**
 * Decode a JWT (without verification) and return the payload as an object.
 * Useful to extract basic user info (email, sub/user_id, name) from access tokens
 * when the API doesn't return a separate /me endpoint.
 */
export function decodeJwt(token: string | null): any | null {
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const payload = parts[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    try {
      return JSON.parse(decodeURIComponent(
        decoded.split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join('')
      ));
    } catch {
      return JSON.parse(decoded);
    }
  } catch (e) {
    return null;
  }
}
