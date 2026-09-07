import 'leaflet/dist/leaflet.css';
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { AlertTriangle, Route as RouteIcon, Eye, Zap, Shield, MapPin } from "lucide-react";

const API_URL = (import.meta.env.VITE_API_URL as string) || "http://localhost:3001";

const SPAIN_CENTER: [number, number] = [40.4, -3.7];

interface Waypoint { lat: number; lng: number; }
interface Ruta {
  id: string; nombre: string; region: string; distancia_km: number; dificultad: string;
  waypoints: Waypoint[];
}
interface Incidencia {
  id: string; tipo: string; via: string; descripcion: string; severidad: string;
  confirmaciones: number; lat: string | number; lng: string | number;
}

const TIPO_ICON: Record<string, typeof AlertTriangle> = {
  control_gc: Shield, radar: Eye,
  firme_mal_estado: AlertTriangle, accidente: AlertTriangle,
  obras: Zap, otro: AlertTriangle,
};
const TIPO_LABEL: Record<string, string> = {
  control_gc: "Control GC", radar: "Radar", firme_mal_estado: "Firme en mal estado",
  accidente: "Accidente", obras: "Obras", otro: "Otro",
};
const SEV_COLOR: Record<string, string> = {
  high: "#EF4444", medium: "#F59E0B", low: "#F97316", resolved: "#22C55E",
};
const SEV_TEXT: Record<string, string> = {
  high: "text-danger", medium: "text-warning", low: "text-primary", resolved: "text-success",
};

function incidentIcon(tipo: string, severidad: string) {
  const color = SEV_COLOR[severidad] ?? SEV_COLOR.medium;
  return L.divIcon({
    html: `<div style="background:${color};border-radius:50%;width:26px;height:26px;display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4)"><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg></div>`,
    className: '',
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

function routeIcon(label: string) {
  return L.divIcon({
    html: `<div style="background:#F97316;color:white;border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:10px;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4)">${label}</div>`,
    className: '',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) { map.setView(points[0], 11); return; }
    map.fitBounds(points, { padding: [30, 30], maxZoom: 12 });
  }, [points.map(p => p.join(',')).join('|')]);
  return null;
}

const DIFICULTAD_LABEL: Record<string, string> = {
  facil: "Fácil", media: "Media", media_alta: "Media-Alta", alta: "Alta",
};

export default function MapDashboard() {
  const navigate = useNavigate();
  const [rutas, setRutas] = useState<Ruta[]>([]);
  const [incidencias, setIncidencias] = useState<Incidencia[]>([]);

  useEffect(() => {
    fetch(`${API_URL}/rutas`).then(r => r.ok ? r.json() : []).then(setRutas).catch(() => {});
    fetch(`${API_URL}/incidencias`).then(r => r.ok ? r.json() : []).then(setIncidencias).catch(() => {});
  }, []);

  const activas = incidencias.filter(i => i.severidad !== 'resolved');

  const allPoints: [number, number][] = [
    ...rutas.flatMap(r => r.waypoints?.map(w => [w.lat, w.lng] as [number, number]) ?? []),
    ...activas.map(i => [Number(i.lat), Number(i.lng)] as [number, number]).filter(([lat, lng]) => lat !== 0 || lng !== 0),
  ];

  return (
    <section id="mapa" className="py-20 px-4">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-primary mb-2">Mapa en tiempo real</p>
            <h2 className="font-display text-5xl md:text-6xl text-foreground">RUTAS E<br />INCIDENCIAS</h2>
          </div>
          <p className="max-w-sm text-muted-foreground text-sm">
            Consulta de un vistazo dónde están las rutas de la comunidad y las incidencias activas en la vía.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Mapa real */}
          <div className="lg:col-span-3 rounded-xl overflow-hidden border border-border" style={{ minHeight: "480px" }}>
            <MapContainer center={SPAIN_CENTER} zoom={6} style={{ height: '100%', width: '100%', minHeight: '480px' }}>
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
              />
              <FitBounds points={allPoints} />

              {rutas.map((ruta) => {
                const pts = (ruta.waypoints ?? []).map(w => [w.lat, w.lng] as [number, number]);
                if (pts.length === 0) return null;
                return (
                  <div key={ruta.id}>
                    {pts.length > 1 && (
                      <Polyline positions={pts} color="#F97316" weight={3} opacity={0.7} dashArray="6 6" />
                    )}
                    <Marker position={pts[0]} icon={routeIcon('R')}>
                      <Popup>
                        <div className="text-sm">
                          <p className="font-bold mb-0.5">{ruta.nombre}</p>
                          <p className="text-xs text-muted-foreground mb-1">{ruta.region} · {ruta.distancia_km} km · {DIFICULTAD_LABEL[ruta.dificultad] ?? ruta.dificultad}</p>
                          <button
                            onClick={() => navigate(`/rutas/${ruta.id}`)}
                            className="text-xs font-bold text-primary hover:underline"
                          >
                            Ver ruta →
                          </button>
                        </div>
                      </Popup>
                    </Marker>
                  </div>
                );
              })}

              {activas.map((inc) => {
                const lat = Number(inc.lat), lng = Number(inc.lng);
                if (lat === 0 && lng === 0) return null;
                return (
                  <Marker key={inc.id} position={[lat, lng]} icon={incidentIcon(inc.tipo, inc.severidad)}>
                    <Popup>
                      <div className="text-sm">
                        <p className="font-bold mb-0.5">{TIPO_LABEL[inc.tipo] ?? inc.tipo}</p>
                        <p className="text-xs text-muted-foreground mb-1">{inc.via}</p>
                        <p className="text-xs">{inc.descripcion}</p>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          </div>

          {/* Sidebar */}
          <div className="flex flex-col gap-3">
            {/* Incidencias activas */}
            <div className="card-surface rounded-xl p-4">
              <p className="text-xs font-bold uppercase tracking-widest text-primary mb-3">
                Alertas activas ({activas.length})
              </p>
              {incidencias.length === 0 ? (
                <p className="text-xs text-muted-foreground">Sin incidencias activas</p>
              ) : (
                <div className="space-y-2">
                  {activas.slice(0, 4).map(inc => {
                    const Icon = TIPO_ICON[inc.tipo] ?? AlertTriangle;
                    return (
                      <div key={inc.id} className="flex items-center gap-2 text-xs">
                        <Icon className={`h-3 w-3 flex-shrink-0 ${SEV_TEXT[inc.severidad] ?? SEV_TEXT.medium}`} />
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground truncate">{TIPO_LABEL[inc.tipo] ?? inc.tipo}</p>
                          <p className="text-muted-foreground truncate">{inc.via}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Rutas en el mapa */}
            <div className="card-surface rounded-xl p-4">
              <p className="text-xs font-bold uppercase tracking-widest text-primary mb-3">
                Rutas en el mapa ({rutas.length})
              </p>
              {rutas.length === 0 ? (
                <p className="text-xs text-muted-foreground">Todavía no hay rutas publicadas</p>
              ) : (
                <div className="space-y-3">
                  {rutas.slice(0, 4).map(r => (
                    <button
                      key={r.id}
                      onClick={() => navigate(`/rutas/${r.id}`)}
                      className="flex items-center gap-2 text-xs w-full text-left hover:text-primary transition-colors"
                    >
                      <RouteIcon className="h-3 w-3 flex-shrink-0 text-primary" />
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground truncate">{r.nombre}</p>
                        <p className="text-muted-foreground truncate flex items-center gap-1">
                          <MapPin className="h-2.5 w-2.5" /> {r.region}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
