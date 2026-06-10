import 'leaflet/dist/leaflet.css';
import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { MapPin, ArrowLeft, Route, MapPinned, Gauge, Clock, Mountain, Tag, X, Trash2, AlertCircle, Search } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { MapContainer, TileLayer, Marker, Polyline, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { supabase } from "@/lib/supabase";

const API_URL = (import.meta.env.VITE_API_URL as string) || "http://localhost:3001";

interface Waypoint { lat: number; lng: number; }

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

function markerIcon(label: string) {
  return L.divIcon({
    html: `<div style="background:#F97316;color:white;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:11px;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4)">${label}</div>`,
    className: '',
    iconSize: [28, 28],
    iconAnchor: [14, 28],
  });
}

function MapClickHandler({ onAdd }: { onAdd: (lat: number, lng: number) => void }) {
  useMapEvents({ click: e => onAdd(e.latlng.lat, e.latlng.lng) });
  return null;
}

async function getOsrmRoute(pts: Waypoint[], avoidHighways = false) {
  if (pts.length < 2) return null;
  try {
    const res = await fetch(`${API_URL}/geocode/route`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ waypoints: pts.map(p => ({ lat: p.lat, lon: p.lng })), avoidHighways }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data as { coords: [number, number][]; distanceKm: number; durationMin: number } | null;
  } catch { return null; }
}

const DIFICULTADES = [
  { key: "facil", label: "Fácil" },
  { key: "media", label: "Media" },
  { key: "media_alta", label: "Media-Alta" },
  { key: "alta", label: "Alta" },
];

export default function EditarRutaPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loadingRuta, setLoadingRuta] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState("");
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);
  const [mapCenter, setMapCenter] = useState<[number, number]>([40.4, -3.7]);
  const [mapZoom, setMapZoom] = useState(6);
  const [waypointNames, setWaypointNames] = useState<string[]>([]);
  const [avoidHighways, setAvoidHighways] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ label: string; lat: number; lng: number }[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const [form, setForm] = useState({
    nombre: "", region: "", distancia_km: "",
    horas: "", minutos: "", dificultad: "media",
    descripcion: "", tags: [] as string[],
  });

  // Cargar ruta existente
  useEffect(() => {
    fetch(`${API_URL}/rutas/${id}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(async data => {
        // Verificar que el usuario actual es el autor
        const { data: { session } } = await supabase.auth.getSession();
        if (!session || session.user.id !== data.user_id) {
          navigate(`/rutas/${id}`);
          return;
        }
        setForm({
          nombre: data.nombre ?? "",
          region: data.region ?? "",
          distancia_km: String(data.distancia_km ?? ""),
          horas: String(Math.floor((data.duracion_min ?? 0) / 60)),
          minutos: String((data.duracion_min ?? 0) % 60),
          dificultad: data.dificultad ?? "media",
          descripcion: data.descripcion ?? "",
          tags: data.tags ?? [],
        });
        if (data.waypoints?.length) {
          setWaypoints(data.waypoints);
          setMapCenter([data.waypoints[0].lat, data.waypoints[0].lng]);
          setMapZoom(8);
        }
        setLoadingRuta(false);
      })
      .catch(() => { setNotFound(true); setLoadingRuta(false); });
  }, [id, navigate]);

  // Recalcular ruta OSRM al cambiar waypoints o toggle autopistas
  useEffect(() => {
    if (waypoints.length >= 2) {
      getOsrmRoute(waypoints, avoidHighways).then(route => {
        if (route) {
          setRouteCoords(route.coords);
          setForm(p => ({
            ...p,
            distancia_km: String(route.distanceKm),
            horas: String(Math.floor(route.durationMin / 60)),
            minutos: String(route.durationMin % 60),
          }));
        }
      });
    } else {
      setRouteCoords([]);
    }
  }, [waypoints, avoidHighways]);

  // Geocodificación con cleanup (separado para no re-geocodificar al toggle)
  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    setWaypointNames([]);

    (async () => {
      const names: string[] = [];
      for (const wp of waypoints) {
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
  }, [waypoints]);

  useEffect(() => {
    if (searchQuery.trim().length < 2) { setSearchResults([]); setSearchOpen(false); return; }
    setSearchLoading(true);
    const t = setTimeout(() => {
      fetch(`${API_URL}/geocode/search?q=${encodeURIComponent(searchQuery)}`)
        .then(r => r.ok ? r.json() : [])
        .then((data: { label: string; lat: number; lng: number }[]) => { setSearchResults(data); setSearchOpen(data.length > 0); })
        .finally(() => setSearchLoading(false));
    }, 350);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  function pickSearchResult(result: { label: string; lat: number; lng: number }) {
    setWaypoints(prev => [...prev, { lat: result.lat, lng: result.lng }]);
    setWaypointNames(prev => [...prev, result.label]);
    setSearchQuery(""); setSearchResults([]); setSearchOpen(false);
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    if (error) setError(null);
  };

  function addTag() {
    const t = tagInput.trim();
    if (t && !form.tags.includes(t)) setForm(prev => ({ ...prev, tags: [...prev.tags, t] }));
    setTagInput("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate("/entrar"); return; }
    const duracion_min = (parseInt(form.horas || "0") * 60) + parseInt(form.minutos || "0");
    const { error: err } = await supabase.from("rutas").update({
      nombre: form.nombre,
      region: form.region,
      distancia_km: parseInt(form.distancia_km),
      duracion_min,
      dificultad: form.dificultad,
      descripcion: form.descripcion || null,
      tags: form.tags,
      waypoints,
    }).eq("id", id!).eq("user_id", session.user.id);
    setLoading(false);
    if (err) { setError(err.message); return; }
    navigate(`/rutas/${id}`);
  }

  if (loadingRuta) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <AlertCircle className="h-12 w-12 text-muted-foreground/40" />
        <p className="text-foreground font-bold">Ruta no encontrada</p>
        <button onClick={() => navigate("/")} className="text-sm text-primary hover:underline">Volver al inicio</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-md px-4 py-3 flex-shrink-0">
        <div className="mx-auto flex max-w-full items-center justify-between">
          <button onClick={() => navigate(`/rutas/${id}`)} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
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
          <div className="w-16" />
        </div>
      </header>

      {/* Main: map left + form right */}
      <div className="flex flex-col lg:flex-row flex-1 min-h-0">

        {/* Mapa */}
        <div className="lg:flex-1 h-[350px] lg:h-auto relative">
          <MapContainer center={mapCenter} zoom={mapZoom} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
            />
            <MapClickHandler onAdd={(lat, lng) => {
              const idx = waypoints.length;
              setWaypoints(prev => [...prev, { lat, lng }]);
              setWaypointNames(prev => [...prev, '']);
              fetch(`${API_URL}/geocode/reverse?lat=${lat}&lng=${lng}`)
                .then(r => r.ok ? r.json() : null)
                .then(data => {
                  if (!data) return;
                  setWaypointNames(prev => prev.map((n, i) => i === idx ? data.name : n));
                })
                .catch(() => {});
            }} />
            {waypoints.map((wp, i) => (
              <Marker key={i} position={[wp.lat, wp.lng]} icon={markerIcon(String.fromCharCode(65 + i))} />
            ))}
            {routeCoords.length > 0 && (
              <Polyline positions={routeCoords} color="#F97316" weight={4} opacity={0.85} />
            )}
          </MapContainer>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-[1000] bg-background/80 backdrop-blur-sm text-xs text-muted-foreground px-3 py-1.5 rounded-full border border-border/50 pointer-events-none">
            Haz clic en el mapa para añadir o cambiar paradas
          </div>
        </div>

        {/* Form panel */}
        <div className="lg:w-[420px] overflow-y-auto border-t lg:border-t-0 lg:border-l border-border/50">
          <div className="p-6">
            <div className="mb-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 py-1.5 mb-3">
                <span className="h-2 w-2 rounded-full bg-primary" />
                <span className="text-xs font-bold uppercase tracking-widest text-primary">Editar ruta</span>
              </div>
              <h1 className="font-display text-3xl text-foreground leading-none">
                EDITA <span className="text-gradient-orange">TU RUTA</span>
              </h1>
            </div>

            {/* Buscador de paradas */}
            <div ref={searchRef} className="relative mb-4">
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                Añadir parada por nombre
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onFocus={() => searchResults.length > 0 && setSearchOpen(true)}
                  onKeyDown={e => e.key === 'Escape' && setSearchOpen(false)}
                  placeholder="Ej: Ronda, Sevilla, Puerto de Montaña..."
                  className="w-full rounded-md border border-border bg-surface-3 pl-10 pr-10 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
                />
                {searchLoading && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                )}
                {!searchLoading && searchQuery && (
                  <button type="button" onClick={() => { setSearchQuery(""); setSearchOpen(false); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              {searchOpen && searchResults.length > 0 && (
                <ul className="absolute z-[1001] w-full mt-1 rounded-md border border-border bg-card shadow-xl overflow-hidden">
                  {searchResults.map((r, i) => (
                    <li key={i}>
                      <button
                        type="button"
                        onMouseDown={() => pickSearchResult(r)}
                        className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left hover:bg-surface-2 transition-colors"
                      >
                        <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span className="text-foreground truncate">{r.label}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Waypoints actuales */}
            {waypoints.length > 0 && (
              <div className="mb-5 card-surface rounded-xl p-3 space-y-1.5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Paradas ({waypoints.length})</span>
                  <button type="button" onClick={() => setWaypoints([])} className="text-xs text-danger hover:opacity-70 flex items-center gap-1">
                    <Trash2 className="h-3 w-3" /> Limpiar
                  </button>
                </div>
                {waypoints.map((wp, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <div className="h-5 w-5 shrink-0 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-[10px]">
                      {String.fromCharCode(65 + i)}
                    </div>
                    {waypointNames[i] ? (
                      <span className="text-foreground font-medium flex-1">{waypointNames[i]}</span>
                    ) : (
                      <span className="text-muted-foreground italic flex-1">Cargando...</span>
                    )}
                    <button onClick={() => setWaypoints(prev => prev.filter((_, idx) => idx !== i))} className="text-muted-foreground hover:text-danger transition-colors">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Toggle evitar autopistas */}
            <div className="flex items-center justify-between rounded-xl card-surface px-4 py-3 mb-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Evitar autopistas</p>
                <p className="text-[11px] text-muted-foreground/60 mt-0.5">Recalcula la ruta evitando vías rápidas</p>
              </div>
              <button
                type="button"
                onClick={() => setAvoidHighways(h => !h)}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${avoidHighways ? 'bg-primary' : 'bg-border'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${avoidHighways ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Field label="Nombre de la ruta" name="nombre" value={form.nombre} onChange={handleChange} placeholder="Ruta de las Águilas" icon={<Route className="h-4 w-4" />} required />
              <Field label="Región / Provincia" name="region" value={form.region} onChange={handleChange} placeholder="Sierra de Gredos, Ávila" icon={<MapPinned className="h-4 w-4" />} required />

              <div className="grid grid-cols-2 gap-3">
                <Field label="Distancia (km)" name="distancia_km" value={form.distancia_km} onChange={handleChange} placeholder="186" icon={<Gauge className="h-4 w-4" />} type="number" required />
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">Duración</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground"><Clock className="h-3.5 w-3.5" /></span>
                      <input name="horas" value={form.horas} onChange={handleChange} placeholder="3h" type="number" min="0"
                        className="w-full rounded-md border border-border bg-surface-3 pl-8 pr-2 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary" />
                    </div>
                    <input name="minutos" value={form.minutos} onChange={handleChange} placeholder="30m" type="number" min="0" max="59"
                      className="flex-1 rounded-md border border-border bg-surface-3 px-2 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary" />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">Dificultad</label>
                <div className="flex flex-wrap gap-2">
                  {DIFICULTADES.map(d => (
                    <button key={d.key} type="button"
                      onClick={() => setForm(p => ({ ...p, dificultad: d.key }))}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${form.dificultad === d.key ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}>
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">Etiquetas</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"><Tag className="h-4 w-4" /></span>
                    <input value={tagInput} onChange={e => setTagInput(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addTag())}
                      placeholder="Montaña, Curvas..." type="text"
                      className="w-full rounded-md border border-border bg-surface-3 pl-10 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary" />
                  </div>
                  <button type="button" onClick={addTag} className="rounded-md border border-border px-3 py-2 text-xs font-bold text-muted-foreground hover:text-primary hover:border-primary/50 transition-all">
                    Añadir
                  </button>
                </div>
                {form.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {form.tags.map(tag => (
                      <span key={tag} className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-surface-3 border border-border text-muted-foreground">
                        {tag}
                        <button type="button" onClick={() => setForm(p => ({ ...p, tags: p.tags.filter(t => t !== tag) }))}><X className="h-3 w-3 hover:text-destructive" /></button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">Descripción</label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-muted-foreground"><Mountain className="h-4 w-4" /></span>
                  <textarea name="descripcion" value={form.descripcion} onChange={handleChange} rows={3} placeholder="Describe los puntos de interés..."
                    className="w-full rounded-md border border-border bg-surface-3 pl-10 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary resize-none" />
                </div>
              </div>

              {error && <p className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">{error}</p>}

              <div className="flex gap-3">
                <button type="button" onClick={() => navigate(`/rutas/${id}`)}
                  className="flex-1 rounded-md border border-border py-3 text-sm font-bold text-muted-foreground hover:border-primary/50 hover:text-primary transition-all">
                  Cancelar
                </button>
                <button type="submit" disabled={loading}
                  className="flex-1 rounded-md bg-primary py-3 text-sm font-bold uppercase tracking-wider text-primary-foreground transition-all hover:opacity-90 hover:shadow-[0_0_30px_hsl(25_100%_52%/0.5)] disabled:opacity-50 disabled:cursor-not-allowed">
                  {loading ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

interface FieldProps {
  label: string; name: string; value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string; icon: React.ReactNode; required?: boolean; type?: string;
}
function Field({ label, name, value, onChange, placeholder, icon, required, type = "text" }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
        {label}{required && <span className="text-primary ml-0.5">*</span>}
      </label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{icon}</span>
        <input type={type} name={name} value={value} onChange={onChange} placeholder={placeholder} required={required}
          className="w-full rounded-md border border-border bg-surface-3 pl-10 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary" />
      </div>
    </div>
  );
}
