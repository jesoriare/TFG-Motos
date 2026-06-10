import { useEffect, useState } from "react";
import { MapPin, Navigation, Users, AlertTriangle, Coffee, Eye, Zap, Shield } from "lucide-react";

const API_URL = (import.meta.env.VITE_API_URL as string) || "http://localhost:3001";

interface Rider {
  id: string; nombre: string; apellidos: string; username: string;
  online: boolean; motos: { marca_modelo: string }[];
}
interface Incidencia {
  id: string; tipo: string; via: string; severidad: string; confirmaciones: number;
}

const TIPO_ICON: Record<string, typeof AlertTriangle> = {
  control_gc: Shield, radar: Eye,
  firme_mal_estado: AlertTriangle, accidente: AlertTriangle,
  obras: Zap, otro: AlertTriangle,
};
const TIPO_LABEL: Record<string, string> = {
  control_gc: "Control GC", radar: "Radar", firme_mal_estado: "Firme",
  accidente: "Accidente", obras: "Obras", otro: "Otro",
};
const SEV_COLOR: Record<string, string> = {
  high: "text-danger border-danger/40 bg-danger/10",
  medium: "text-warning border-warning/40 bg-warning/10",
  low: "text-primary border-primary/40 bg-primary/10",
  resolved: "text-success border-success/40 bg-success/10",
};

export default function MapDashboard() {
  const [riders, setRiders] = useState<Rider[]>([]);
  const [incidencias, setIncidencias] = useState<Incidencia[]>([]);

  useEffect(() => {
    fetch(`${API_URL}/usuarios`).then(r => r.ok ? r.json() : []).then(setRiders).catch(() => {});
    fetch(`${API_URL}/incidencias`).then(r => r.ok ? r.json() : []).then(setIncidencias).catch(() => {});
  }, []);

  const onlineRiders = riders.filter(r => r.online);

  return (
    <section id="mapa" className="py-20 px-4">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-primary mb-2">Mapa en tiempo real</p>
            <h2 className="font-display text-5xl md:text-6xl text-foreground">TU GRUPO,<br />SIEMPRE CONECTADO</h2>
          </div>
          <p className="max-w-sm text-muted-foreground text-sm">
            Ve la posición de todos los miembros del grupo, puntos de interés, descansos planificados e incidencias en la vía.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Mapa decorativo */}
          <div className="lg:col-span-3 relative rounded-xl overflow-hidden border border-border" style={{ minHeight: "480px" }}>
            <div className="absolute inset-0 bg-surface-2">
              <svg className="w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="hsl(220 10% 30%)" strokeWidth="0.5" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
              </svg>
              <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
                <path d="M 10% 50% Q 30% 20% 55% 35% T 90% 40%" fill="none" stroke="hsl(220 10% 25%)" strokeWidth="4" />
                <path d="M 10% 50% Q 30% 20% 55% 35% T 90% 40%" fill="none" stroke="hsl(38 100% 55% / 0.5)" strokeWidth="2" strokeDasharray="8 4" />
                <path d="M 20% 80% Q 50% 60% 70% 70%" fill="none" stroke="hsl(220 10% 25%)" strokeWidth="3" />
                <path d="M 60% 10% Q 70% 40% 75% 65%" fill="none" stroke="hsl(220 10% 22%)" strokeWidth="3" />
              </svg>

              {/* Incidencias activas como POIs en el mapa (posiciones ilustrativas) */}
              {incidencias.slice(0, 4).map((inc, i) => {
                const Icon = TIPO_ICON[inc.tipo] ?? AlertTriangle;
                const positions = [{ x: 30, y: 46 }, { x: 62, y: 30 }, { x: 45, y: 60 }, { x: 75, y: 50 }];
                const pos = positions[i];
                return (
                  <div key={inc.id}
                    className={`absolute flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-bold ${SEV_COLOR[inc.severidad] ?? SEV_COLOR.medium} cursor-pointer hover:scale-110 transition-transform`}
                    style={{ left: `${pos.x}%`, top: `${pos.y}%`, transform: "translate(-50%, -50%)" }}
                  >
                    <Icon className="h-3 w-3" />
                    <span className="hidden sm:inline">{TIPO_LABEL[inc.tipo] ?? inc.tipo}</span>
                  </div>
                );
              })}

              {/* Moteros online como pins */}
              {onlineRiders.slice(0, 4).map((rider, i) => {
                const positions = [{ x: 35, y: 40 }, { x: 55, y: 55 }, { x: 70, y: 30 }, { x: 25, y: 65 }];
                const pos = positions[i];
                return (
                  <div key={rider.id} className="absolute cursor-pointer group"
                    style={{ left: `${pos.x}%`, top: `${pos.y}%`, transform: "translate(-50%, -50%)" }}
                  >
                    <div className="relative flex h-9 w-9 items-center justify-center rounded-full border-2 border-primary bg-primary/20 transition-transform group-hover:scale-110">
                      <Navigation className="h-4 w-4 text-primary" />
                      <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-success border-2 border-background" />
                    </div>
                    <div className="absolute left-1/2 top-10 -translate-x-1/2 hidden group-hover:block bg-card border border-border rounded-md px-2 py-1 text-xs whitespace-nowrap z-10">
                      <p className="font-bold text-foreground">@{rider.username}</p>
                      <p className="text-muted-foreground">{rider.motos?.[0]?.marca_modelo ?? "Sin moto"}</p>
                    </div>
                  </div>
                );
              })}

              <div className="absolute top-3 right-3 flex flex-col gap-1">
                {["+", "−"].map(c => (
                  <button key={c} className="h-8 w-8 rounded border border-border surface-2 text-foreground font-bold hover:border-primary/50 transition-colors">{c}</button>
                ))}
              </div>

              <div className="absolute bottom-3 left-3 surface-1 border border-border rounded-lg p-3 text-xs space-y-1.5">
                <p className="font-bold text-foreground uppercase tracking-wider mb-2">Leyenda</p>
                <div className="flex items-center gap-2 text-primary"><Navigation className="h-3 w-3" /> Moteros online</div>
                <div className="flex items-center gap-2 text-success"><Eye className="h-3 w-3" /> Miradores</div>
                <div className="flex items-center gap-2 text-danger"><AlertTriangle className="h-3 w-3" /> Incidencias</div>
                <div className="flex items-center gap-2 text-amber"><Coffee className="h-3 w-3" /> Paradas</div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="flex flex-col gap-3">
            {/* Moteros online */}
            <div className="card-surface rounded-xl p-4">
              <p className="text-xs font-bold uppercase tracking-widest text-primary mb-3">
                Moteros online ({onlineRiders.length})
              </p>
              {riders.length === 0 ? (
                <p className="text-xs text-muted-foreground">Cargando...</p>
              ) : onlineRiders.length === 0 ? (
                <p className="text-xs text-muted-foreground">Ningún motero en línea ahora</p>
              ) : (
                <div className="space-y-3">
                  {onlineRiders.slice(0, 4).map(r => (
                    <div key={r.id} className="flex items-center gap-3">
                      <div className="h-2.5 w-2.5 rounded-full flex-shrink-0 bg-success" />
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-foreground truncate">{r.nombre} {r.apellidos}</p>
                        <p className="text-xs text-muted-foreground truncate">{r.motos?.[0]?.marca_modelo ?? "Sin moto"}</p>
                      </div>
                      <span className="ml-auto text-xs text-success font-semibold">● Live</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Incidencias activas */}
            <div className="card-surface rounded-xl p-4">
              <p className="text-xs font-bold uppercase tracking-widest text-primary mb-3">
                Alertas activas ({incidencias.filter(i => i.severidad !== "resolved").length})
              </p>
              {incidencias.length === 0 ? (
                <p className="text-xs text-muted-foreground">Sin incidencias activas</p>
              ) : (
                <div className="space-y-2">
                  {incidencias.slice(0, 3).map(inc => {
                    const Icon = TIPO_ICON[inc.tipo] ?? AlertTriangle;
                    return (
                      <div key={inc.id} className="flex items-center gap-2 text-xs">
                        <Icon className="h-3 w-3 text-danger flex-shrink-0" />
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

            <button className="rounded-xl bg-primary py-3.5 text-sm font-bold uppercase tracking-wider text-primary-foreground hover:opacity-90 hover:shadow-[0_0_20px_hsl(25_100%_52%/0.4)] transition-all">
              <Users className="h-4 w-4 inline mr-2" />
              Unirme a una ruta
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
