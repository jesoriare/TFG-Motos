import { Router } from 'express';

const router = Router();

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

  enqueue(async () => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
        { headers: { 'Accept-Language': 'es', 'User-Agent': 'RodadaMoto/1.0' } }
      );
      if (!response.ok) { res.json({ name: `${lat}, ${lng}` }); return; }

      const data = await response.json() as { address?: Record<string, string>; display_name?: string };
      const a = data.address ?? {};
      const place = a.village ?? a.town ?? a.city_district ?? a.city ?? a.county ?? a.municipality;
      const state = a.state;
      const name = place
        ? (state ? `${place}, ${state}` : place)
        : (data.display_name?.split(',').slice(0, 2).join(',').trim() ?? `${lat}, ${lng}`);

      res.json({ name });
    } catch {
      res.json({ name: `${lat}, ${lng}` });
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

  enqueueSearch(async () => {
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=6&accept-language=es&addressdetails=1`;
      const response = await fetch(url, { headers: { 'User-Agent': 'RodadaMoto/1.0' } });
      if (!response.ok) { res.json([]); return; }

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

// POST /geocode/route  { waypoints: [{lat,lon},...], avoidHighways?: boolean }
router.post('/route', async (req, res) => {
  const { waypoints, avoidHighways } = req.body as { waypoints: WaypointInput[]; avoidHighways?: boolean };
  if (!waypoints || waypoints.length < 2) { res.json(null); return; }

  try {
    if (avoidHighways) {
      const orsKey = process.env.ORS_API_KEY;
      if (!orsKey) {
        res.json(await routeOsrm(waypoints));
        return;
      }
      // cycling-road evita motorway + trunk (autopistas y autovías) de forma nativa.
      // El tiempo lo calculamos nosotros a velocidad media de moto en carretera secundaria.
      const response = await fetch('https://api.openrouteservice.org/v2/directions/cycling-road', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': orsKey,
        },
        body: JSON.stringify({
          coordinates: waypoints.map(p => [p.lon, p.lat]),
        }),
      });
      if (response.ok) {
        const data = await response.json() as {
          routes?: Array<{ geometry: string; summary: { distance: number } }>;
        };
        const route = data.routes?.[0];
        if (route) {
          const distanceKm = Math.round(route.summary.distance / 1000);
          // Velocidad media en carreteras secundarias (sin autopistas): ~75 km/h
          const durationMin = Math.round((distanceKm / 75) * 60);
          res.json({ coords: decodePolyline5(route.geometry), distanceKm, durationMin });
          return;
        }
      }
      const errBody = await response.text().catch(() => '');
      console.error('[ORS] falló (status', response.status, '):', errBody, '- fallback a OSRM');
      const fallback = await routeOsrm(waypoints);
      res.json({ ...fallback, _orsDebug: { status: response.status, body: errBody } });
    } else {
      res.json(await routeOsrm(waypoints));
    }
  } catch (err) {
    console.error('[route] Error:', err);
    res.json(null);
  }
});

export default router;
