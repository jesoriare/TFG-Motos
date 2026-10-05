import { setSession, clearSession, type AuthUser } from './auth';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

export async function login(username: string, password: string): Promise<{ error?: string }> {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const json = await res.json();
  if (!res.ok) return { error: json.error ?? 'Error al iniciar sesión' };
  await setSession(json.token, json.user as AuthUser);
  await setOnlineStatus(true, json.token);
  return {};
}

export async function registrar(data: {
  nombre: string; apellidos: string; email: string; username: string;
  password: string; marca_modelo?: string; cilindrada?: string;
}): Promise<{ error?: string }> {
  const res = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) return { error: json.error ?? 'Error al registrarse' };
  await setSession(json.token, json.user as AuthUser);
  return {};
}

export async function logout(token: string): Promise<void> {
  await setOnlineStatus(false, token).catch(() => {});
  await clearSession();
}

export async function setOnlineStatus(online: boolean, token: string): Promise<boolean> {
  const res = await fetch(`${API_URL}/usuarios/me/estado`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ online }),
  });
  return res.ok;
}

export async function getMe(token: string) {
  const res = await fetch(`${API_URL}/usuarios/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  return res.json();
}

export async function getPerfil(username: string) {
  const res = await fetch(`${API_URL}/usuarios/${encodeURIComponent(username)}`);
  if (!res.ok) return null;
  return res.json();
}

export async function actualizarPerfil(payload: {
  nombre: string; apellidos: string; username: string; zona?: string | null;
  avatar_url?: string | null; marca_modelo?: string; cilindrada?: string;
}, token: string): Promise<{ error?: string; data?: any }> {
  const res = await fetch(`${API_URL}/usuarios/me`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!res.ok) return { error: json.error ?? 'No se pudo actualizar el perfil' };
  return { data: json };
}

export async function subirAvatar(fileUri: string, token: string): Promise<{ error?: string; url?: string }> {
  const ext = fileUri.split('.').pop() ?? 'jpg';
  const form = new FormData();
  form.append('avatar', { uri: fileUri, name: `avatar.${ext}`, type: `image/${ext}` } as any);

  const res = await fetch(`${API_URL}/upload/avatar`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const json = await res.json();
  if (!res.ok) return { error: json.error ?? 'No se pudo subir la imagen' };
  return { url: json.url };
}

export async function crearRuta(payload: {
  nombre: string; region: string; distancia_km: number; duracion_min: number;
  dificultad: string; descripcion?: string | null; tags?: string[]; waypoints?: any[];
  puntos_interes?: any[]; avoid_highways?: boolean;
}, token: string): Promise<{ error?: string; data?: any }> {
  const res = await fetch(`${API_URL}/rutas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!res.ok) return { error: json.error ?? 'No se pudo crear la ruta' };
  return { data: json };
}

export async function actualizarRuta(id: string, payload: {
  nombre: string; region: string; distancia_km: number; duracion_min: number;
  dificultad: string; descripcion?: string | null; tags?: string[]; waypoints?: any[];
  puntos_interes?: any[]; avoid_highways?: boolean;
}, token: string): Promise<{ error?: string; data?: any }> {
  const res = await fetch(`${API_URL}/rutas/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!res.ok) return { error: json.error ?? 'No se pudo actualizar la ruta' };
  return { data: json };
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

export async function crearIncidencia(payload: {
  tipo: string; descripcion: string; via: string; severidad: string;
  lat: number; lng: number; expiry_hours: number;
}, token: string): Promise<{ error?: string; data?: any }> {
  const res = await fetch(`${API_URL}/incidencias`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!res.ok) return { error: json.error ?? 'No se pudo crear la incidencia' };
  return { data: json };
}

export async function getRiders(search = '', tipo = '', cilindradaMin = '', cilindradaMax = '') {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (tipo && tipo !== 'Todos') params.set('tipo', tipo.toLowerCase());
  if (cilindradaMin) params.set('cilindrada_min', cilindradaMin);
  if (cilindradaMax) params.set('cilindrada_max', cilindradaMax);
  const res = await fetch(`${API_URL}/usuarios?${params}`);
  if (!res.ok) return [];
  return res.json();
}

export async function getRutas(params: { region?: string; dificultad?: string; username?: string } = {}) {
  const p = new URLSearchParams();
  if (params.region) p.set('region', params.region);
  if (params.dificultad) p.set('dificultad', params.dificultad);
  if (params.username) p.set('username', params.username);
  const res = await fetch(`${API_URL}/rutas?${p}`);
  if (!res.ok) return [];
  return res.json();
}

export async function getUsuariosStats(): Promise<number | null> {
  try {
    const res = await fetch(`${API_URL}/usuarios/stats`);
    if (!res.ok) return null;
    return (await res.json()).total ?? null;
  } catch { return null; }
}

export async function getRutasStats(): Promise<number | null> {
  try {
    const res = await fetch(`${API_URL}/rutas/stats`);
    if (!res.ok) return null;
    return (await res.json()).total ?? null;
  } catch { return null; }
}

export async function getIncidencias() {
  const res = await fetch(`${API_URL}/incidencias`);
  if (!res.ok) return [];
  return res.json();
}

export async function confirmarIncidencia(id: string, token: string) {
  const res = await fetch(`${API_URL}/incidencias/${id}/confirmar`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  return res.json();
}

export async function eliminarIncidencia(id: string, token: string): Promise<boolean> {
  const res = await fetch(`${API_URL}/incidencias/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.ok;
}

export async function getEstadoAmistad(username: string, token: string) {
  const res = await fetch(`${API_URL}/amistad/estado/${username}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  return res.json();
}

export async function enviarSolicitudAmistad(username: string, token: string) {
  const res = await fetch(`${API_URL}/amistad/${username}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  return res.json();
}

export async function aceptarSolicitudAmistad(id: string, token: string): Promise<boolean> {
  const res = await fetch(`${API_URL}/amistad/${id}/aceptar`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.ok;
}

export async function rechazarSolicitudAmistad(id: string, token: string): Promise<boolean> {
  const res = await fetch(`${API_URL}/amistad/${id}/rechazar`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.ok;
}

export async function eliminarRelacionAmistad(id: string, token: string): Promise<boolean> {
  const res = await fetch(`${API_URL}/amistad/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.ok;
}

export async function getSolicitudesAmistad(token: string) {
  const res = await fetch(`${API_URL}/amistad/solicitudes`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];
  return res.json();
}

export async function getAmigosCount(username: string): Promise<number> {
  const res = await fetch(`${API_URL}/amistad/amigos/${username}/count`);
  if (!res.ok) return 0;
  return (await res.json()).count ?? 0;
}

export async function getAmigos(username: string, token: string) {
  const res = await fetch(`${API_URL}/amistad/amigos/${username}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return { status: res.status, data: res.ok ? await res.json() : null };
}

export async function crearOAbrirChat(username: string, token: string): Promise<string | null> {
  const res = await fetch(`${API_URL}/chat/${username}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  return (await res.json()).id ?? null;
}

export async function getConversaciones(token: string) {
  const res = await fetch(`${API_URL}/chat`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];
  return res.json();
}

export async function getMensajes(conversacionId: string, token: string) {
  const res = await fetch(`${API_URL}/chat/${conversacionId}/mensajes`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];
  return res.json();
}

export async function enviarMensaje(conversacionId: string, contenido: string, token: string) {
  const res = await fetch(`${API_URL}/chat/${conversacionId}/mensajes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ contenido }),
  });
  if (!res.ok) return null;
  return res.json();
}

export async function ocultarConversacion(conversacionId: string, token: string): Promise<boolean> {
  const res = await fetch(`${API_URL}/chat/${conversacionId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.ok;
}

export async function setChatAbierto(conversacionId: string | null, token: string): Promise<boolean> {
  const res = await fetch(`${API_URL}/chat/abierto`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ conversacionId }),
  });
  return res.ok;
}

export async function getNoLeidosCount(token: string): Promise<number> {
  const res = await fetch(`${API_URL}/chat/no-leidos`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return 0;
  return (await res.json()).count ?? 0;
}

export async function guardarPushToken(push_token: string | null, token: string): Promise<boolean> {
  const res = await fetch(`${API_URL}/usuarios/me/push-token`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ push_token }),
  });
  return res.ok;
}

export async function getMisGrupos(token: string) {
  const res = await fetch(`${API_URL}/grupos/mios`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) return [];
  return res.json();
}

export async function getInvitacionesGrupo(token: string) {
  const res = await fetch(`${API_URL}/grupos/invitaciones`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) return [];
  return res.json();
}

export async function getGrupo(id: string, token: string) {
  const res = await fetch(`${API_URL}/grupos/${id}`, { headers: { Authorization: `Bearer ${token}` } });
  return { status: res.status, data: res.ok ? await res.json() : null };
}

export interface GrupoPayload {
  nombre: string;
  ruta_id?: string | null;
  descripcion?: string | null;
  privacidad?: 'privado' | 'publico';
}

export async function crearGrupo(payload: GrupoPayload, token: string): Promise<{ error?: string; data?: any }> {
  const res = await fetch(`${API_URL}/grupos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!res.ok) return { error: json.error ?? 'No se pudo crear el grupo' };
  return { data: json };
}

export async function editarGrupo(id: string, payload: GrupoPayload, token: string): Promise<{ error?: string; data?: any }> {
  const res = await fetch(`${API_URL}/grupos/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!res.ok) return { error: json.error ?? 'No se pudo editar el grupo' };
  return { data: json };
}

export async function getGruposPublicos(q: string, token: string) {
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

export async function getMensajesGrupo(grupoId: string, token: string) {
  const res = await fetch(`${API_URL}/grupos/${grupoId}/mensajes`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) return [];
  return res.json();
}

export async function enviarMensajeGrupo(grupoId: string, contenido: string, token: string) {
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
