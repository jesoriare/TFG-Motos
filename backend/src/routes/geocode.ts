import { Router } from 'express';

const router = Router();

// Caché en memoria: las mismas coordenadas/consultas no vuelven a pedirse a Nominatim
// (se pierde en cada redeploy/reinicio de Render, pero evita repetir trabajo mientras
// la instancia está viva, que es cuando más pega el límite de tasa de Nominatim).
const reverseCache = new Map<string, { name: string; road: string | null }>();
const searchCache = new Map<string, Array<{ label: string; lat: number; lng: number }>>();

// Redondeo a 5 decimales (~1 m de precisión): agrupa coordenadas casi idénticas
// (p. ej. el mismo waypoint pedido varias veces) bajo la misma clave de caché.
function roundCoord(n: number): number {
  return Math.round(n * 1e5) / 1e5;
}

// Si Nominatim devuelve 429, deja de insistir para TODAS las peticiones (no solo la
// actual) durante este tiempo: reintentar en caliente contra un servicio que ya está
// limitando por tasa solo empeora el bloqueo, en vez de ayudar a recuperarlo.
const COOLDOWN_MS = 30_000;
let cooldownUntil = 0;

// Reintenta con backoff exponencial ante fallos de red o 5xx de Nominatim.
// Un 4xx que no sea 429 (p. ej. parámetros mal formados) no se reintenta, no va a cambiar.
async function fetchWithRetry(url: string, headers: Record<string, string>, maxAttempts = 3): Promise<Response | null> {
  if (Date.now() < cooldownUntil) return null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(url, { headers });
      if (response.ok) return response;
      if (response.status === 429) { cooldownUntil = Date.now() + COOLDOWN_MS; return null; }
      if (response.status < 500) return response;
    } catch {
      // error de red: se trata igual que un fallo de servidor y se reintenta
    }
    if (attempt < maxAttempts) await new Promise(r => setTimeout(r, 800 * attempt));
  }
  return null;
}

// Cola serializada: cada petición espera a la anterior + 1100 ms
let tail: Promise<void> = Promise.resolve();

function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const job = tail.then(fn);
  tail = job.then(
    () => new Promise<void>(r => setTimeout(r, 1100)),
    () => new Promise<void>(r => setTimeout(r, 1100)),
  );
  return job;
}

// GET /geocode/reverse?lat=X&lng=Y
router.get('/reverse', (req, res) => {
  const { lat, lng } = req.query as { lat?: string; lng?: string };
  if (!lat || !lng) { res.status(400).json({ error: 'lat y lng requeridos' }); return; }

  const cacheKey = `${roundCoord(parseFloat(lat))},${roundCoord(parseFloat(lng))}`;
  const cached = reverseCache.get(cacheKey);
  if (cached) { res.json(cached); return; }

  enqueue(async () => {
    try {
      const response = await fetchWithRetry(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
        { 'Accept-Language': 'es', 'User-Agent': 'RodadaMoto/1.0' }
      );
      if (!response || !response.ok) { res.json({ name: `${lat}, ${lng}`, road: null }); return; }

      const data = await response.json() as { address?: Record<string, string>; display_name?: string };
      const a = data.address ?? {};
      const place = a.village ?? a.town ?? a.city_district ?? a.city ?? a.county ?? a.municipality;
      const state = a.state;
      const name = place
        ? (state ? `${place}, ${state}` : place)
        : (data.display_name?.split(',').slice(0, 2).join(',').trim() ?? `${lat}, ${lng}`);
      const road = a.road ?? a.pedestrian ?? null;

      const result = { name, road };
      reverseCache.set(cacheKey, result);
      res.json(result);
    } catch {
      res.json({ name: `${lat}, ${lng}`, road: null });
    }
  });
});

// Cola independiente para búsquedas (no bloquea el reverse)
let searchTail: Promise<void> = Promise.resolve();
function enqueueSearch<T>(fn: () => Promise<T>): Promise<T> {
  const job = searchTail.then(fn);
  searchTail = job.then(
    () => new Promise<void>(r => setTimeout(r, 500)),
    () => new Promise<void>(r => setTimeout(r, 500)),
  );
  return job;
}

// GET /geocode/search?q=Madrid
router.get('/search', (req, res) => {
  const { q } = req.query as { q?: string };
  if (!q || q.trim().length < 2) { res.json([]); return; }

  const cacheKey = q.trim().toLowerCase();
  const cached = searchCache.get(cacheKey);
  if (cached) { res.json(cached); return; }

  enqueueSearch(async () => {
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=6&accept-language=es&addressdetails=1`;
      const response = await fetchWithRetry(url, { 'User-Agent': 'RodadaMoto/1.0' });
      if (!response || !response.ok) { res.json([]); return; }

      const data = await response.json() as Array<{
        lat: string; lon: string; display_name: string;
        address?: Record<string, string>;
      }>;

      const results = data.map(item => {
        const a = item.address ?? {};
        const place = a.village ?? a.town ?? a.city_district ?? a.city ?? a.county ?? a.municipality ?? item.display_name.split(',')[0];
        const state = a.state ?? a.county;
        const label = place && state ? `${place}, ${state}` : item.display_name.split(',').slice(0, 2).join(',').trim();
        return { label, lat: parseFloat(item.lat), lng: parseFloat(item.lon) };
      });

      searchCache.set(cacheKey, results);
      res.json(results);
    } catch {
      res.json([]);
    }
  });
});

interface WaypointInput { lat: number; lon: number; }

function decodePolyline5(encoded: string): [number, number][] {
  const result: [number, number][] = [];
  let i = 0, lat = 0, lng = 0;
  while (i < encoded.length) {
    let b: number, shift = 0, n = 0;
    do { b = encoded.charCodeAt(i++) - 63; n |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lat += n & 1 ? ~(n >> 1) : n >> 1;
    shift = 0; n = 0;
    do { b = encoded.charCodeAt(i++) - 63; n |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lng += n & 1 ? ~(n >> 1) : n >> 1;
    result.push([lat / 1e5, lng / 1e5]);
  }
  return result;
}

async function routeOsrm(waypoints: WaypointInput[]) {
  const coordStr = waypoints.map(p => `${p.lon},${p.lat}`).join(';');
  const response = await fetch(
    `https://router.project-osrm.org/route/v1/driving/${coordStr}?overview=full&geometries=geojson`
  );
  if (!response.ok) return null;
  const data = await response.json() as { routes?: { geometry: { coordinates: number[][] }; distance: number; duration: number }[] };
  const route = data.routes?.[0];
  if (!route) return null;
  return {
    coords: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
    distanceKm: Math.round(route.distance / 1000),
    durationMin: Math.round(route.duration / 60),
  };
}

async function routeOrs(waypoints: WaypointInput[], orsKey: string) {
  // cycling-road evita motorway + trunk (autopistas y autovías) de forma nativa.
  // El tiempo lo calculamos nosotros a velocidad media de moto en carretera secundaria.
  const response = await fetch('https://api.heigit.org/openrouteservice/v2/directions/cycling-road', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': orsKey,
    },
    body: JSON.stringify({
      coordinates: waypoints.map(p => [p.lon, p.lat]),
    }),
  });
  if (!response.ok) {
    console.error('[ORS] falló (status', response.status, ')');
    return null;
  }
  const data = await response.json() as {
    routes?: Array<{ geometry: string; summary: { distance: number } }>;
  };
  const route = data.routes?.[0];
  if (!route) return null;
  const distanceKm = Math.round(route.summary.distance / 1000);
  // Velocidad media en carreteras secundarias (sin autopistas): ~75 km/h
  const durationMin = Math.round((distanceKm / 75) * 60);
  return { coords: decodePolyline5(route.geometry), distanceKm, durationMin };
}

// POST /geocode/route  { waypoints: [{lat,lon},...], avoidHighways?: boolean }
router.post('/route', async (req, res) => {
  const { waypoints, avoidHighways } = req.body as { waypoints: WaypointInput[]; avoidHighways?: boolean };
  if (!waypoints || waypoints.length < 2) { res.json(null); return; }

  try {
    if (avoidHighways) {
      const orsKey = process.env.ORS_API_KEY;
      if (orsKey) {
        // ORS/HeiGIT es a veces inestable (502/504 puntuales) — un par de reintentos
        // suele bastar para que la petición pase antes de rendirse y usar OSRM.
        const MAX_ATTEMPTS = 3;
        for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
          const route = await routeOrs(waypoints, orsKey).catch(() => null);
          if (route) { res.json(route); return; }
          if (attempt < MAX_ATTEMPTS) await new Promise(r => setTimeout(r, 1000 * attempt));
        }
        console.error('[ORS] sin éxito tras', MAX_ATTEMPTS, 'intentos, fallback a OSRM');
      }
    }
    res.json(await routeOsrm(waypoints));
  } catch (err) {
    console.error('[route] Error:', err);
    res.json(null);
  }
});

export default router;
