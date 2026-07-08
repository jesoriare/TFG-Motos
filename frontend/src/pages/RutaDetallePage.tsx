import 'leaflet/dist/leaflet.css';
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Polyline } from 'react-leaflet';
import { Spinner } from "@/components/ui/spinner";
import L from 'leaflet';
import {
  ArrowLeft, MapPin, Route, Clock, Gauge, Mountain, Tag,
  Star, Shield, User, AlertCircle, Pencil,
} from "lucide-react";
import { getMe, getToken } from "@/lib/api";

const API_URL = (import.meta.env.VITE_API_URL as string) || "http://localhost:3001";

interface Waypoint { lat: number; lng: number; }
interface Valoracion {
  puntuacion: number; comentario: string | null; created_at: string;
  profiles: { username: string; avatar_url: string | null };
}
interface Ruta {
  id: string; user_id: string; nombre: string; region: string;
  distancia_km: number; duracion_min: number;
  dificultad: string; descripcion: string | null;
  tags: string[]; waypoints: Waypoint[];
  avoid_highways: boolean;
  publicada: boolean; created_at: string;
  profiles: { username: string; avatar_url: string | null; verified: boolean; zona: string | null };
  valoraciones_ruta: Valoracion[];
}

function markerIcon(label: string) {
  return L.divIcon({
    html: `<div style="background:#F97316;color:white;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:11px;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4)">${label}</div>`,
    className: '',
    iconSize: [28, 28],
    iconAnchor: [14, 28],
  });
}

async function reverseGeocode(lat: number, lng: number, signal: AbortSignal): Promise<string> {
  try {
    const res = await fetch(`${API_URL}/geocode/reverse?lat=${lat}&lng=${lng}`, { signal });
    if (!res.ok) return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    const data = await res.json();
    return data.name ?? `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  } catch {
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
}

async function getRouteCoords(pts: Waypoint[], avoidHighways: boolean): Promise<[number, number][] | null> {
  if (pts.length < 2) return null;
  try {
    const res = await fetch(`${API_URL}/geocode/route`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ waypoints: pts.map(p => ({ lat: p.lat, lon: p.lng })), avoidHighways }),
    });
    if (!res.ok) return null;
    const data = await res.json() as { coords: [number, number][] } | null;
    return data?.coords ?? null;
  } catch { return null; }
}

const DIFICULTAD: Record<string, { label: string; color: string }> = {
  facil:      { label: "Fácil",      color: "text-green-400 border-green-400/40 bg-green-400/10" },
  media:      { label: "Media",      color: "text-amber-400 border-amber-400/40 bg-amber-400/10" },
  media_alta: { label: "Media-Alta", color: "text-orange-400 border-orange-400/40 bg-orange-400/10" },
  alta:       { label: "Alta",       color: "text-red-400 border-red-400/40 bg-red-400/10" },
};

function formatDuracion(min: number) {
  const h = Math.floor(min / 60), m = min % 60;
  return h > 0 ? `${h}h${m > 0 ? ` ${m}min` : ""}` : `${m}min`;
}

export default function RutaDetallePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [ruta, setRuta] = useState<Ruta | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);
  const [waypointNames, setWaypointNames] = useState<string[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    setCurrentUserId(getMe()?.id ?? null);
  }, []);

  useEffect(() => {
    fetch(`${API_URL}/rutas/${id}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data: Ruta) => { setRuta(data); setLoading(false); })
      .catch(() => { setNotFound(true); setLoading(false); });
  }, [id]);

  useEffect(() => {
    if (!ruta?.waypoints?.length) return;

    const controller = new AbortController();
    const { signal } = controller;

    getRouteCoords(ruta.waypoints, ruta.avoid_highways ?? false).then(coords => {
      if (!signal.aborted && coords) setRouteCoords(coords);
    });

    // Geocodificación inversa secuencial con cleanup al desmontar
    (async () => {
      const names: string[] = [];
      for (const wp of ruta.waypoints) {
        if (signal.aborted) break;
        try {
          names.push(await reverseGeocode(wp.lat, wp.lng, signal));
          if (!signal.aborted) setWaypointNames([...names]);
        } catch {
          break;
        }
      }
    })();

    return () => controller.abort();
  }, [ruta]);

  const mapCenter: [number, number] = ruta?.waypoints?.[0]
    ? [ruta.waypoints[0].lat, ruta.waypoints[0].lng]
    : [40.4, -3.7];

  const mapZoom = ruta?.waypoints?.length ? 8 : 6;

  const avgRating = ruta?.valoraciones_ruta?.length
    ? +(ruta.valoraciones_ruta.reduce((s, v) => s + v.puntuacion, 0) / ruta.valoraciones_ruta.length).toFixed(1)
    : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (notFound || !ruta) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <AlertCircle className="h-12 w-12 text-muted-foreground/40" />
        <p className="text-foreground font-bold">Ruta no encontrada</p>
        <button onClick={() => navigate("/")} className="text-sm text-primary hover:underline">Volver al inicio</button>
      </div>
    );
  }

  const dif = DIFICULTAD[ruta.dificultad] ?? { label: ruta.dificultad, color: "text-muted-foreground border-border bg-transparent" };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-md px-4 py-3 flex-shrink-0">
        <div className="mx-auto flex max-w-full items-center justify-between">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm font-semibold">Volver</span>
          </button>
          <a href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary">
              <MapPin className="h-4 w-4 text-primary-foreground" strokeWidth={2.5} />
            </div>
            <span className="font-display text-xl tracking-tight text-foreground">
              RODADA<span className="text-primary">MOTO</span>
            </span>
          </a>
          {currentUserId && ruta && currentUserId === ruta.user_id ? (
            <button
              onClick={() => navigate(`/rutas/${ruta.id}/editar`)}
              className="flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm font-semibold text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
            >
              <Pencil className="h-3.5 w-3.5" />
              Editar
            </button>
          ) : (
            <div className="w-16" />
          )}
        </div>
      </header>

      {/* Main: map left + info right */}
      <div className="flex flex-col lg:flex-row flex-1 min-h-0">

        {/* Mapa */}
        <div className="lg:flex-1 h-[350px] lg:h-auto">
          <MapContainer
            center={mapCenter}
            zoom={mapZoom}
            style={{ height: '100%', width: '100%', minHeight: '350px' }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
            />
            {ruta.waypoints.map((wp, i) => (
              <Marker
                key={i}
                position={[wp.lat, wp.lng]}
                icon={markerIcon(String.fromCharCode(65 + i))}
              />
            ))}
            {routeCoords.length > 0 && (
              <Polyline positions={routeCoords} color="#F97316" weight={4} opacity={0.9} />
            )}
          </MapContainer>
        </div>

        {/* Info panel */}
        <div className="lg:w-[420px] overflow-y-auto border-t lg:border-t-0 lg:border-l border-border/50">
          <div className="p-6 space-y-6">

            {/* Título + badge dificultad */}
            <div>
              <div className="flex items-start justify-between gap-3 mb-2">
                <h1 className="font-display text-3xl text-foreground leading-tight">{ruta.nombre}</h1>
                <span className={`shrink-0 text-xs font-bold px-3 py-1 rounded-full border ${dif.color}`}>
                  {dif.label}
                </span>
              </div>
              <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" /> {ruta.region}
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: <Gauge className="h-4 w-4 text-primary" />, label: "Distancia", value: `${ruta.distancia_km} km` },
                { icon: <Clock className="h-4 w-4 text-primary" />, label: "Duración", value: formatDuracion(ruta.duracion_min) },
                { icon: <Star className="h-4 w-4 text-amber-400" />, label: "Valoración", value: avgRating ? `${avgRating} / 5` : "Sin votos" },
              ].map(stat => (
                <div key={stat.label} className="card-surface rounded-xl p-3 text-center">
                  <div className="flex justify-center mb-1">{stat.icon}</div>
                  <p className="text-foreground font-bold text-sm">{stat.value}</p>
                  <p className="text-muted-foreground text-xs">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Waypoints */}
            {ruta.waypoints.length > 0 && (
              <div className="card-surface rounded-xl p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                  <Route className="h-3.5 w-3.5" /> Paradas ({ruta.waypoints.length})
                </p>
                <div className="space-y-2">
                  {ruta.waypoints.map((wp, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <div className="h-5 w-5 shrink-0 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-[10px]">
                        {String.fromCharCode(65 + i)}
                      </div>
                      {waypointNames[i] ? (
                        <span className="text-foreground font-medium">{waypointNames[i]}</span>
                      ) : (
                        <span className="text-muted-foreground italic">Cargando...</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Descripción */}
            {ruta.descripcion && (
              <div className="card-surface rounded-xl p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Mountain className="h-3.5 w-3.5" /> Descripción
                </p>
                <p className="text-sm text-foreground leading-relaxed">{ruta.descripcion}</p>
              </div>
            )}

            {/* Tags */}
            {ruta.tags?.length > 0 && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5" /> Etiquetas
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {ruta.tags.map(tag => (
                    <span key={tag} className="text-xs px-2.5 py-1 rounded-full surface-3 border border-border/50 text-muted-foreground">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Autor */}
            <div className="flex items-center gap-3 py-3 border-t border-border/50">
              <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center">
                <User className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground flex items-center gap-1">
                  @{ruta.profiles?.username}
                  {ruta.profiles?.verified && <Shield className="h-3.5 w-3.5 text-primary" />}
                </p>
                {ruta.profiles?.zona && <p className="text-xs text-muted-foreground">{ruta.profiles.zona}</p>}
              </div>
            </div>

            {/* Valoraciones */}
            {ruta.valoraciones_ruta?.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Star className="h-3.5 w-3.5" /> Valoraciones ({ruta.valoraciones_ruta.length})
                </p>
                {ruta.valoraciones_ruta.map((v, i) => (
                  <div key={i} className="card-surface rounded-xl p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-foreground">@{v.profiles?.username}</span>
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, s) => (
                          <Star key={s} className={`h-3 w-3 ${s < v.puntuacion ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30"}`} />
                        ))}
                      </div>
                    </div>
                    {v.comentario && <p className="text-xs text-muted-foreground">{v.comentario}</p>}
                  </div>
                ))}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
