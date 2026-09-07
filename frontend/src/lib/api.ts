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

export interface Grupo {
  id: string;
  nombre: string;
  descripcion: string | null;
  privacidad: 'privado' | 'publico';
  lider_id: string;
  ruta_id: string | null;
  activo: boolean;
  created_at: string;
  ruta: { id: string; nombre: string; region: string } | null;
  rol?: 'lider' | 'miembro';
}

export interface GrupoPublico extends Grupo {
  lider_username: string;
}

export interface MiembroGrupo {
  id: string;
  username: string;
  nombre: string;
  apellidos: string;
  avatar_url: string | null;
  verified: boolean;
  joined_at: string;
}

export interface GrupoDetalle extends Grupo {
  miembros: MiembroGrupo[];
}

export interface InvitacionGrupo {
  id: string;
  created_at: string;
  grupo: { id: string; nombre: string };
  emisor: { username: string; nombre: string; avatar_url: string | null };
}

export async function getMisGrupos(token: string): Promise<Grupo[]> {
  const res = await fetch(`${API_URL}/grupos/mios`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) return [];
  return res.json();
}

export async function getInvitacionesGrupo(token: string): Promise<InvitacionGrupo[]> {
  const res = await fetch(`${API_URL}/grupos/invitaciones`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) return [];
  return res.json();
}

export async function getGrupo(id: string, token: string): Promise<{ status: number; data: GrupoDetalle | null }> {
  const res = await fetch(`${API_URL}/grupos/${id}`, { headers: { Authorization: `Bearer ${token}` } });
  return { status: res.status, data: res.ok ? await res.json() : null };
}

export interface GrupoPayload {
  nombre: string;
  ruta_id?: string | null;
  descripcion?: string | null;
  privacidad?: 'privado' | 'publico';
}

export async function crearGrupo(payload: GrupoPayload, token: string): Promise<{ error?: string; data?: Grupo }> {
  const res = await fetch(`${API_URL}/grupos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!res.ok) return { error: json.error ?? 'No se pudo crear el grupo' };
  return { data: json };
}

export async function editarGrupo(id: string, payload: GrupoPayload, token: string): Promise<{ error?: string; data?: Grupo }> {
  const res = await fetch(`${API_URL}/grupos/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!res.ok) return { error: json.error ?? 'No se pudo editar el grupo' };
  return { data: json };
}

export async function getGruposPublicos(q: string, token: string): Promise<GrupoPublico[]> {
  const res = await fetch(`${API_URL}/grupos/publicos?q=${encodeURIComponent(q)}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) return [];
  return res.json();
}

export async function unirseAGrupo(id: string, token: string): Promise<{ error?: string }> {
  const res = await fetch(`${API_URL}/grupos/${id}/unirse`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
  if (res.ok) return {};
  const json = await res.json().catch(() => ({}));
  return { error: json.error ?? 'No se pudo unir al grupo' };
}

export async function eliminarGrupo(id: string, token: string): Promise<boolean> {
  const res = await fetch(`${API_URL}/grupos/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
  return res.ok;
}

export async function salirDeGrupo(id: string, token: string): Promise<boolean> {
  const res = await fetch(`${API_URL}/grupos/${id}/salir`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
  return res.ok;
}

export async function expulsarMiembroGrupo(grupoId: string, userId: string, token: string): Promise<boolean> {
  const res = await fetch(`${API_URL}/grupos/${grupoId}/miembros/${userId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
  return res.ok;
}

export async function invitarAGrupo(grupoId: string, username: string, token: string): Promise<{ error?: string }> {
  const res = await fetch(`${API_URL}/grupos/${grupoId}/invitar/${username}`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
  if (res.ok) return {};
  const json = await res.json().catch(() => ({}));
  return { error: json.error ?? 'No se pudo invitar' };
}

export async function aceptarInvitacionGrupo(id: string, token: string): Promise<boolean> {
  const res = await fetch(`${API_URL}/grupos/invitaciones/${id}/aceptar`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
  return res.ok;
}

export async function rechazarInvitacionGrupo(id: string, token: string): Promise<boolean> {
  const res = await fetch(`${API_URL}/grupos/invitaciones/${id}/rechazar`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
  return res.ok;
}

export interface MensajeGrupo {
  id: string;
  grupo_id: string;
  emisor_id: string;
  contenido: string;
  created_at: string;
  emisor: { username: string; nombre: string; apellidos: string; avatar_url: string | null };
}

export async function getMensajesGrupo(grupoId: string, token: string): Promise<MensajeGrupo[]> {
  const res = await fetch(`${API_URL}/grupos/${grupoId}/mensajes`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) return [];
  return res.json();
}

export async function enviarMensajeGrupo(grupoId: string, contenido: string, token: string): Promise<MensajeGrupo | null> {
  const res = await fetch(`${API_URL}/grupos/${grupoId}/mensajes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ contenido }),
  });
  if (!res.ok) return null;
  return res.json();
}

export async function getNoLeidosGrupo(token: string): Promise<number> {
  const res = await fetch(`${API_URL}/grupos/no-leidos`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) return 0;
  return (await res.json()).count ?? 0;
}

export async function valorarRuta(id: string, puntuacion: number, comentario: string | null, token: string): Promise<{ error?: string }> {
  const res = await fetch(`${API_URL}/rutas/${id}/valorar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ puntuacion, comentario }),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    return { error: json.error ?? 'No se pudo enviar la valoración' };
  }
  return {};
}
