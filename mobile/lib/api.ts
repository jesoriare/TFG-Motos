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
