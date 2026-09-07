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
  const response = await fetch('https://api.heigit.org/openrouteservice/v2/directions/cycling-road', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: orsKey },
    body: JSON.stringify({ coordinates: waypoints.map(p => [p.lon, p.lat]) }),
  });
  if (!response.ok) {
    console.error('[ORS] falló (status', response.status, ')');
    return null;
  }
  const data = await response.json() as { routes?: Array<{ geometry: string; summary: { distance: number } }> };
  const route = data.routes?.[0];
  if (!route) return null;
  const distanceKm = Math.round(route.summary.distance / 1000);
  const durationMin = Math.round((distanceKm / 75) * 60);
  return { coords: decodePolyline5(route.geometry), distanceKm, durationMin };
}

// POST /api/route  { waypoints: [{lat,lon},...], avoidHighways?: boolean }
// Función serverless en Vercel: OpenRouteService bloquea las peticiones que
// llegan desde el backend en Render, así que esta llamada se hace desde aquí.
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') { res.status(405).json(null); return; }
  const { waypoints, avoidHighways } = req.body as { waypoints: WaypointInput[]; avoidHighways?: boolean };
  if (!waypoints || waypoints.length < 2) { res.status(200).json(null); return; }

  try {
    if (avoidHighways) {
      const orsKey = process.env.ORS_API_KEY;
      if (orsKey) {
        const MAX_ATTEMPTS = 3;
        for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
          const route = await routeOrs(waypoints, orsKey).catch(() => null);
          if (route) { res.status(200).json(route); return; }
          if (attempt < MAX_ATTEMPTS) await new Promise(r => setTimeout(r, 1000 * attempt));
        }
      }
    }
    res.status(200).json(await routeOsrm(waypoints));
  } catch (err) {
    console.error('[route] Error:', err);
    res.status(200).json(null);
  }
}
