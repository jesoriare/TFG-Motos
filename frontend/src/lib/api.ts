const API_URL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:3001';

const TOKEN_KEY = 'rm_token';
const USER_KEY  = 'rm_user';

export interface AuthUser {
  id: string;
  email: string;
  username: string;
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getMe(): AuthUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function setAuth(token: string, user: AuthUser) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  window.dispatchEvent(new Event('auth-change'));
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  window.dispatchEvent(new Event('auth-change'));
}

export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = getToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (init.headers) Object.assign(headers, init.headers);
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return fetch(`${API_URL}${path}`, { ...init, headers });
}

export async function register(data: {
  nombre: string; apellidos: string; email: string; username: string;
  password: string; marca_modelo?: string; cilindrada?: string;
}): Promise<void> {
  const res = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? 'Error al registrarse');
  setAuth(json.token, json.user);
}

export async function login(username: string, password: string): Promise<void> {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? 'Error al iniciar sesión');
  setAuth(json.token, json.user);
}

export function logout(): void {
  clearAuth();
}
