import 'leaflet/dist/leaflet.css';
import { useState, useEffect } from "react";
import { AlertTriangle, Shield, Clock, Eye, CheckCircle, MapPin, ArrowRight, Trash2, LocateFixed } from "lucide-react";
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { getMe, getToken } from "@/lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const API_URL = (import.meta.env.VITE_API_URL as string) ?? 'http://localhost:3001';

const SPAIN_CENTER: [number, number] = [40.4, -3.7];

const incidentIcon = L.divIcon({
  html: `<div style="background:#EF4444;border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.5)"></div>`,
  className: '',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

function MapClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: e => onPick(e.latlng.lat, e.latlng.lng) });
  return null;
}

interface Incidencia {
  id: string;
  user_id: string;
  tipo: string;
  descripcion: string;
  via: string;
  severidad: string;
  confirmaciones: number;
  created_at: string;
  expires_at: string;
  profiles: { username: string; avatar_url: string | null };
}

const TIPO_ICON = {
  control_gc: Shield,
  radar: Eye,
  firme_mal_estado: AlertTriangle,
  accidente: AlertTriangle,
  obras: AlertTriangle,
  otro: AlertTriangle,
} as const;

const TIPO_LABEL: Record<string, string> = {
  control_gc: 'Control GC',
  radar: 'Radar Móvil',
  firme_mal_estado: 'Firme en mal estado',
  accidente: 'Accidente',
  obras: 'Obras',
  otro: 'Otro',
};

const severityStyles: Record<string, string> = {
  high: "border-l-danger text-danger bg-danger/5",
  medium: "border-l-warning text-warning bg-warning/5",
  low: "border-l-primary/50 text-muted-foreground bg-primary/5",
  resolved: "border-l-success text-success bg-success/5",
};

const severityBadge: Record<string, string> = {
  high: "bg-danger/20 text-danger",
  medium: "bg-warning/20 text-warning",
  low: "bg-muted text-muted-foreground",
  resolved: "bg-success/20 text-success",
};

const severityLabel: Record<string, string> = {
  high: "Urgente",
  medium: "Precaución",
  low: "Informativa",
  resolved: "Resuelta",
};

function timeAgo(dateStr: string) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return 'Hace un momento';
  if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`;
  return `Hace ${Math.floor(diff / 3600)}h`;
}

export default function IncidentsSection() {
  const { toast } = useToast();
  const [incidencias, setIncidencias] = useState<Incidencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ tipo: 'control_gc', descripcion: '', via: '', severidad: 'medium', expiry_hours: '2' });
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmedIds, setConfirmedIds] = useState<Set<string>>(new Set());

  // Ubicación de la incidencia a reportar
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoStatus, setGeoStatus] = useState<'locating' | 'ok' | 'denied'>('locating');

  function locate() {
    if (!navigator.geolocation) { setGeoStatus('denied'); return; }
    setGeoStatus('locating');
    navigator.geolocation.getCurrentPosition(
      pos => { setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setGeoStatus('ok'); },
      () => setGeoStatus('denied'),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  useEffect(() => {
    if (modalOpen && coords === null) locate();
  }, [modalOpen]);

  async function fetchIncidencias() {
    try {
      const res = await fetch(`${API_URL}/incidencias`);
      const body = await res.json();
      if (res.ok) {
        console.log('[incidencias] GET ok:', body);
        setIncidencias(body);
      } else {
        console.error('[incidencias] GET error:', body);
      }
    } catch (e) {
      console.error('[incidencias] network error:', e);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchIncidencias();
    setUserId(getMe()?.id ?? null);
    const syncUser = () => setUserId(getMe()?.id ?? null);
    window.addEventListener('auth-change', syncUser);
    return () => window.removeEventListener('auth-change', syncUser);
  }, []);

  async function handleConfirmar(id: string) {
    const token = getToken();
    if (!token) return;
    const res = await fetch(`${API_URL}/incidencias/${id}/confirmar`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const { confirmado } = await res.json();
      setConfirmedIds(prev => {
        const next = new Set(prev);
        confirmado ? next.add(id) : next.delete(id);
        return next;
      });
      fetchIncidencias();
    }
  }

  async function handleEliminar(id: string) {
    const token = getToken();
    if (!token) return;
    const res = await fetch(`${API_URL}/incidencias/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setIncidencias(prev => prev.filter(i => i.id !== id));
  }

  async function handleReportar() {
    if (!form.descripcion || !form.via || !coords) return;
    setError(null);
    setEnviando(true);
    const token = getToken();
    if (!token) {
      setEnviando(false);
      setError('Debes iniciar sesión para reportar una incidencia.');
      return;
    }
    const res = await fetch(`${API_URL}/incidencias`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ...form, lat: coords.lat, lng: coords.lng }),
    });
    setEnviando(false);
    if (res.ok) {
      setModalOpen(false);
      setForm({ tipo: 'control_gc', descripcion: '', via: '', severidad: 'medium', expiry_hours: '2' });
      setCoords(null);
      fetchIncidencias();
      toast({ title: '¡Incidencia reportada!', description: 'Gracias por avisar a la comunidad.' });
    } else {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? `Error ${res.status}`);
    }
  }

  const activas = incidencias.filter(i => i.severidad !== 'resolved');

  return (
    <section id="incidencias" className="py-20 px-4 surface-1">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-primary mb-2">Alertas en tiempo real</p>
            <h2 className="font-display text-5xl md:text-6xl text-foreground">INCIDENCIAS<br />EN LA VÍA</h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-success font-semibold">
              <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
              {activas.length} alertas activas
            </div>
            <button
              onClick={() => setModalOpen(true)}
              className="rounded-lg bg-danger/15 border border-danger/30 px-4 py-2 text-xs font-bold uppercase tracking-wider text-danger hover:bg-danger/20 transition-colors"
            >
              + Reportar
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : (
          <div className="space-y-3 mb-8">
            {incidencias.length === 0 && (
              <p className="text-center text-muted-foreground py-8">No hay incidencias activas</p>
            )}
            {incidencias.map((inc) => {
              const Icon = TIPO_ICON[inc.tipo as keyof typeof TIPO_ICON] ?? AlertTriangle;
              const isOwn = inc.user_id === userId;
              return (
                <div
                  key={inc.id}
                  className={`card-surface rounded-xl border-l-4 p-4 transition-all group ${severityStyles[inc.severidad]}`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${severityBadge[inc.severidad]}`}>
                      <Icon className="h-5 w-5" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-bold text-sm text-foreground">{TIPO_LABEL[inc.tipo] ?? inc.tipo}</span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${severityBadge[inc.severidad]}`}>
                          {severityLabel[inc.severidad] ?? inc.severidad}
                        </span>
                        <span className="text-xs text-muted-foreground">por @{inc.profiles?.username}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{inc.descripcion}</p>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {inc.via}</span>
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {timeAgo(inc.created_at)}</span>
                        <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3 text-success" /> {inc.confirmaciones} confirmaciones</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0 mt-1">
                      {!isOwn && userId && (() => {
                        const confirmed = confirmedIds.has(inc.id);
                        return (
                          <button
                            onClick={() => handleConfirmar(inc.id)}
                            title={confirmed ? 'Quitar confirmación' : 'Confirmar incidencia'}
                            className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold transition-all ${
                              confirmed
                                ? 'bg-success/20 text-success'
                                : 'text-muted-foreground hover:text-success hover:bg-success/10'
                            }`}
                          >
                            <CheckCircle className={`h-4 w-4 ${confirmed ? 'fill-success/30' : ''}`} />
                            {confirmed && <span>Confirmada</span>}
                            <span>{inc.confirmaciones}</span>
                          </button>
                        );
                      })()}
                      {isOwn && (
                        <button
                          onClick={() => handleEliminar(inc.id)}
                          className="text-danger hover:opacity-70 transition-opacity"
                          title="Eliminar incidencia"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                      <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div
          onClick={() => setModalOpen(true)}
          className="card-surface rounded-xl p-6 border-dashed border-2 border-border hover:border-primary/30 transition-all cursor-pointer group text-center"
        >
          <AlertTriangle className="h-8 w-8 text-muted-foreground mx-auto mb-3 group-hover:text-primary transition-colors" />
          <p className="font-bold text-foreground mb-1">¿Ves algo en la carretera?</p>
          <p className="text-sm text-muted-foreground">Reporta controles, accidentes, obras o cualquier incidencia para avisar a la comunidad.</p>
          <button className="mt-4 rounded-lg bg-primary px-5 py-2.5 text-sm font-bold uppercase tracking-wider text-primary-foreground hover:opacity-90 transition-opacity">
            Reportar incidencia
          </button>
        </div>
      </div>

      <Dialog open={modalOpen} onOpenChange={v => { setModalOpen(v); if (v) setError(null); else setCoords(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reportar incidencia</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Tipo</label>
              <Select value={form.tipo} onValueChange={v => setForm(p => ({ ...p, tipo: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="control_gc">Control GC</SelectItem>
                  <SelectItem value="radar">Radar Móvil</SelectItem>
                  <SelectItem value="firme_mal_estado">Firme en mal estado</SelectItem>
                  <SelectItem value="accidente">Accidente</SelectItem>
                  <SelectItem value="obras">Obras</SelectItem>
                  <SelectItem value="otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Severidad</label>
              <Select value={form.severidad} onValueChange={v => setForm(p => ({ ...p, severidad: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">Urgente</SelectItem>
                  <SelectItem value="medium">Precaución</SelectItem>
                  <SelectItem value="low">Informativa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Vía / Carretera *</label>
              <Input
                value={form.via}
                onChange={e => setForm(p => ({ ...p, via: e.target.value }))}
                placeholder="Ej: A-4, km 47 dirección Córdoba"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Ubicación *</label>
                <button
                  type="button"
                  onClick={locate}
                  className="flex items-center gap-1 text-xs text-primary hover:opacity-80 transition-opacity"
                >
                  <LocateFixed className="h-3 w-3" /> {geoStatus === 'locating' ? 'Localizando...' : 'Usar mi ubicación'}
                </button>
              </div>
              <div className="h-40 rounded-md overflow-hidden border border-border">
                <MapContainer
                  center={coords ?? SPAIN_CENTER}
                  zoom={coords ? 14 : 5}
                  style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
                  />
                  <MapClickHandler onPick={(lat, lng) => setCoords({ lat, lng })} />
                  {coords && (
                    <Marker
                      position={coords}
                      icon={incidentIcon}
                      draggable
                      eventHandlers={{
                        dragend: (e) => {
                          const m = e.target.getLatLng();
                          setCoords({ lat: m.lat, lng: m.lng });
                        },
                      }}
                    />
                  )}
                </MapContainer>
              </div>
              <p className="text-xs text-muted-foreground/60 mt-1">
                {geoStatus === 'denied' && !coords
                  ? 'No pudimos obtener tu ubicación — toca el mapa para marcarla.'
                  : 'Arrastra el marcador o toca el mapa para ajustar el punto exacto.'}
              </p>
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Descripción *</label>
              <Textarea
                value={form.descripcion}
                onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))}
                placeholder="Describe la incidencia..."
                rows={3}
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Tiempo de expiración</label>
              <Select value={form.expiry_hours} onValueChange={v => setForm(p => ({ ...p, expiry_hours: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 hora</SelectItem>
                  <SelectItem value="2">2 horas</SelectItem>
                  <SelectItem value="4">4 horas</SelectItem>
                  <SelectItem value="8">8 horas</SelectItem>
                  <SelectItem value="24">24 horas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {error && (
              <p className="text-xs text-danger font-medium">{error}</p>
            )}
            <Button
              onClick={handleReportar}
              disabled={enviando || !form.via || !form.descripcion || !coords}
              className="w-full"
            >
              {enviando ? 'Enviando...' : 'Enviar reporte'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
