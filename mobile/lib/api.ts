const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

export async function getEmailByUsername(username: string): Promise<string | null> {
  try {
    const res = await fetch(`${API_URL}/auth/email/${encodeURIComponent(username)}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.email ?? null;
  } catch {
    return null;
  }
}

export async function getRiders(search = '', tipo = '') {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (tipo && tipo !== 'Todos') params.set('tipo', tipo.toLowerCase());
  const res = await fetch(`${API_URL}/usuarios?${params}`);
  if (!res.ok) return [];
  return res.json();
}

export async function getRutas(params: { region?: string; dificultad?: string } = {}) {
  const p = new URLSearchParams();
  if (params.region) p.set('region', params.region);
  if (params.dificultad) p.set('dificultad', params.dificultad);
  const res = await fetch(`${API_URL}/rutas?${p}`);
  if (!res.ok) return [];
  return res.json();
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
