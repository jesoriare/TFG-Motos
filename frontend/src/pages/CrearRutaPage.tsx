import 'leaflet/dist/leaflet.css';
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, ArrowLeft, Route, MapPinned, Gauge, Clock, Mountain, Tag, X, Trash2, Search, ChevronDown } from "lucide-react";
import { MapContainer, TileLayer, Marker, Polyline, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { getToken } from "@/lib/api";
import { CIUDADES_ESPANA } from "@/data/ciudades-espana";

const API_URL = (import.meta.env.VITE_API_URL as string) || "http://localhost:3001";

interface Waypoint { lat: number; lng: number; name?: string; }

type PoiTipo = 'mirador' | 'descanso' | 'gasolinera';
interface PuntoInteres { lat: number; lng: number; tipo: PoiTipo; nombre?: string; }

const POI_TIPOS: { key: PoiTipo; label: string; emoji: string; color: string }[] = [
  { key: 'mirador',    label: 'Mirador',    emoji: '👁️', color: '#22C55E' },
  { key: 'descanso',   label: 'Descanso',   emoji: '☕', color: '#3B82F6' },
  { key: 'gasolinera', label: 'Gasolinera', emoji: '⛽', color: '#A855F7' },
];

function markerIcon(label: string) {
  return L.divIcon({
    html: `<div style="background:#F97316;color:white;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:11px;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4)">${label}</div>`,
    className: '',
    iconSize: [28, 28],
    iconAnchor: [14, 28],
  });
}

function poiIcon(tipo: PoiTipo) {
  const meta = POI_TIPOS.find(t => t.key === tipo)!;
  return L.divIcon({
    html: `<div style="background:${meta.color};border-radius:50%;width:26px;height:26px;display:flex;align-items:center;justify-content:center;font-size:13px;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4)">${meta.emoji}</div>`,
    className: '',
    iconSize: [26, 26],
    iconAnchor: [13, 26],
  });
}

function MapClickHandler({ onAdd }: { onAdd: (lat: number, lng: number) => void }) {
  useMapEvents({ click: e => onAdd(e.latlng.lat, e.latlng.lng) });
  return null;
}


async function getOsrmRoute(pts: Waypoint[], avoidHighways = false) {
  if (pts.length < 2) return null;
  try {
    const res = await fetch(`/api/route`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ waypoints: pts.map(p => ({ lat: p.lat, lon: p.lng })), avoidHighways }),
    });
    if (!res.ok) return null;
    return await res.json() as { coords: [number, number][]; distanceKm: number; durationMin: number } | null;
  } catch { return null; }
}

const DIFICULTADES = [
  { key: "facil", label: "Fácil" },
  { key: "media", label: "Media" },
  { key: "media_alta", label: "Media-Alta" },
  { key: "alta", label: "Alta" },
];

interface SearchResult { label: string; lat: number; lng: number; }

export default function CrearRutaPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState("");
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);
  const [avoidHighways, setAvoidHighways] = useState(false);
  const [mode, setMode] = useState<'parada' | 'poi'>('parada');
  const [poiTipo, setPoiTipo] = useState<PoiTipo>('mirador');
  const [puntosInteres, setPuntosInteres] = useState<PuntoInteres[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const regionRef = useRef<HTMLDivElement>(null);
  const [regionQuery, setRegionQuery] = useState("");
  const [regionOpen, setRegionOpen] = useState(false);
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);
  const [form, setForm] = useState({
    nombre: "", region: "", distancia_km: "",
    horas: "", minutos: "", dificultad: "media",
    descripcion: "", tags: [] as string[],
  });

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

  // Búsqueda de lugares con debounce
  useEffect(() => {
    if (searchQuery.trim().length < 2) { setSearchResults([]); setSearchOpen(false); return; }
    setSearchLoading(true);
    const t = setTimeout(() => {
      fetch(`${API_URL}/geocode/search?q=${encodeURIComponent(searchQuery)}`)
        .then(r => r.ok ? r.json() : [])
        .then((data: SearchResult[]) => { setSearchResults(data); setSearchOpen(data.length > 0); })
        .finally(() => setSearchLoading(false));
    }, 350);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false);
      if (regionRef.current && !regionRef.current.contains(e.target as Node)) setRegionOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  function pickSearchResult(result: SearchResult) {
    addWaypointWithName(result.lat, result.lng, result.label);
    setSearchQuery("");
    setSearchResults([]);
    setSearchOpen(false);
  }

  function addWaypointWithName(lat: number, lng: number, name?: string) {
    const idx = waypoints.length;
    setWaypoints(prev => [...prev, { lat, lng, name }]);
    if (!name) {
      fetch(`${API_URL}/geocode/reverse?lat=${lat}&lng=${lng}`)
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (!mountedRef.current || !data) return;
          setWaypoints(prev => prev.map((wp, i) => i === idx ? { ...wp, name: data.name } : wp));
        })
        .catch(() => {});
    }
  }

  function removeWaypoint(i: number) {
    setWaypoints(prev => prev.filter((_, idx) => idx !== i));
  }

  function addPoi(lat: number, lng: number) {
    const idx = puntosInteres.length;
    setPuntosInteres(prev => [...prev, { lat, lng, tipo: poiTipo }]);
    fetch(`${API_URL}/geocode/reverse?lat=${lat}&lng=${lng}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!mountedRef.current || !data) return;
        setPuntosInteres(prev => prev.map((p, i) => i === idx ? { ...p, nombre: data.name } : p));
      })
      .catch(() => {});
  }

  function removePoi(i: number) {
    setPuntosInteres(prev => prev.filter((_, idx) => idx !== i));
  }

  function handleMapClick(lat: number, lng: number) {
    if (mode === 'poi') addPoi(lat, lng);
    else addWaypointWithName(lat, lng);
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
    const token = getToken();
    if (!token) { navigate("/entrar"); return; }
    const duracion_min = (parseInt(form.horas || "0") * 60) + parseInt(form.minutos || "0");
    const res = await fetch(`${API_URL}/rutas`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        nombre: form.nombre,
        region: form.region,
        distancia_km: parseInt(form.distancia_km),
        duracion_min,
        dificultad: form.dificultad,
        descripcion: form.descripcion || null,
        tags: form.tags,
        waypoints: waypoints.map(({ lat, lng }) => ({ lat, lng })),
        puntos_interes: puntosInteres.map(({ lat, lng, tipo, nombre }) => ({ lat, lng, tipo, nombre })),
      }),
    });
    setLoading(false);
    if (!res.ok) { const d = await res.json(); setError(d.error ?? "Error al crear la ruta"); return; }
    navigate("/");
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-md px-4 py-3 flex-shrink-0">
        <div className="mx-auto flex max-w-full items-center justify-between">
          <button onClick={() => navigate("/")} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
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

        {/* Map panel */}
        <div className="lg:flex-1 h-[350px] lg:h-auto relative">
          <MapContainer
            center={[40.4, -3.7]}
            zoom={6}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
            />
            <MapClickHandler onAdd={handleMapClick} />
            {waypoints.map((wp, i) => (
              <Marker
                key={i}
                position={[wp.lat, wp.lng]}
                icon={markerIcon(String.fromCharCode(65 + i))}
              />
            ))}
            {puntosInteres.map((p, i) => (
              <Marker key={`poi-${i}`} position={[p.lat, p.lng]} icon={poiIcon(p.tipo)} />
            ))}
            {routeCoords.length > 0 && (
              <Polyline positions={routeCoords} color="#F97316" weight={4} opacity={0.85} />
            )}
          </MapContainer>

          {/* Selector de modo */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] flex flex-col items-center gap-2">
            <div className="flex rounded-full border border-border/50 bg-background/90 backdrop-blur-sm p-1 shadow-lg">
              <button type="button" onClick={() => setMode('parada')}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${mode === 'parada' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                Parada
              </button>
              <button type="button" onClick={() => setMode('poi')}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${mode === 'poi' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                Punto de interés
              </button>
            </div>
            {mode === 'poi' && (
              <div className="flex rounded-full border border-border/50 bg-background/90 backdrop-blur-sm p-1 shadow-lg gap-1">
                {POI_TIPOS.map(t => (
                  <button key={t.key} type="button" onClick={() => setPoiTipo(t.key)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition-all ${poiTipo === t.key ? 'text-white' : 'text-muted-foreground hover:text-foreground'}`}
                    style={poiTipo === t.key ? { backgroundColor: t.color } : undefined}>
                    <span>{t.emoji}</span> {t.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Hint overlay */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-[1000] bg-background/80 backdrop-blur-sm text-xs text-muted-foreground px-3 py-1.5 rounded-full border border-border/50 pointer-events-none">
            {mode === 'poi' ? 'Haz clic en el mapa para añadir un punto de interés' : 'Haz clic en el mapa para añadir paradas'}
          </div>
        </div>

        {/* Form panel */}
        <div className="lg:w-[420px] overflow-y-auto border-t lg:border-t-0 lg:border-l border-border/50">
          <div className="p-6">
            <div className="mb-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 py-1.5 mb-3">
                <span className="h-2 w-2 rounded-full bg-primary animate-pulse-orange" />
                <span className="text-xs font-bold uppercase tracking-widest text-primary">Nueva ruta</span>
              </div>
              <h1 className="font-display text-3xl text-foreground leading-none">
                PUBLICA <span className="text-gradient-orange">TU RUTA</span>
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

            {/* Waypoints list */}
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
                    <div className="h-5 w-5 flex-shrink-0 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-[10px]">
                      {String.fromCharCode(65 + i)}
                    </div>
                    {wp.name
                      ? <span className="text-foreground font-medium flex-1">{wp.name}</span>
                      : <span className="text-muted-foreground italic flex-1">Cargando...</span>
                    }
                    <button onClick={() => removeWaypoint(i)} className="text-muted-foreground hover:text-danger transition-colors">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Puntos de interés list */}
            {puntosInteres.length > 0 && (
              <div className="mb-5 card-surface rounded-xl p-3 space-y-1.5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Puntos de interés ({puntosInteres.length})</span>
                  <button type="button" onClick={() => setPuntosInteres([])} className="text-xs text-danger hover:opacity-70 flex items-center gap-1">
                    <Trash2 className="h-3 w-3" /> Limpiar
                  </button>
                </div>
                {puntosInteres.map((p, i) => {
                  const meta = POI_TIPOS.find(t => t.key === p.tipo)!;
                  return (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <div className="h-5 w-5 flex-shrink-0 rounded-full flex items-center justify-center text-[11px]" style={{ backgroundColor: meta.color }}>
                        {meta.emoji}
                      </div>
                      {p.nombre
                        ? <span className="text-foreground font-medium flex-1">{p.nombre}</span>
                        : <span className="text-muted-foreground italic flex-1">Cargando...</span>
                      }
                      <span className="text-muted-foreground/60">{meta.label}</span>
                      <button onClick={() => removePoi(i)} className="text-muted-foreground hover:text-danger transition-colors">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
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
              <div className="space-y-1.5" ref={regionRef}>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Región / Provincia <span className="text-primary">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"><MapPinned className="h-4 w-4" /></span>
                  <input
                    value={regionQuery || form.region}
                    onChange={e => { setRegionQuery(e.target.value); setForm(p => ({ ...p, region: e.target.value })); setRegionOpen(true); }}
                    onFocus={() => setRegionOpen(true)}
                    onKeyDown={e => e.key === 'Escape' && setRegionOpen(false)}
                    placeholder="Busca una ciudad o provincia..."
                    className="w-full rounded-md border border-border bg-surface-3 pl-10 pr-8 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                </div>
                {regionOpen && (
                  <ul className="absolute z-[1001] w-full max-h-48 overflow-y-auto mt-1 rounded-md border border-border bg-card shadow-xl">
                    {CIUDADES_ESPANA.filter(c => c.toLowerCase().includes((regionQuery || form.region).toLowerCase())).slice(0, 40).map(ciudad => (
                      <li key={ciudad}>
                        <button type="button" onMouseDown={() => { setForm(p => ({ ...p, region: ciudad })); setRegionQuery(""); setRegionOpen(false); }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-surface-2 transition-colors">
                          <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                          <span className="text-foreground truncate">{ciudad}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

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

              <button type="submit" disabled={loading}
                className="w-full rounded-md bg-primary py-3 text-sm font-bold uppercase tracking-wider text-primary-foreground transition-all hover:opacity-90 hover:shadow-[0_0_30px_hsl(25_100%_52%/0.5)] disabled:opacity-50 disabled:cursor-not-allowed">
                {loading ? "Publicando..." : "Publicar ruta"}
              </button>
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
