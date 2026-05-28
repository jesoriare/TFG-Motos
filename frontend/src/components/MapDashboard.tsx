import { MapPin, Navigation, Users, AlertTriangle, Coffee, Eye, Zap } from "lucide-react";

const riders = [
  { id: 1, name: "Carlos M.", bike: "Ducati 950", online: true, x: 35, y: 40 },
  { id: 2, name: "Ana R.", bike: "BMW R1250", online: true, x: 55, y: 55 },
  { id: 3, name: "Javi P.", bike: "KTM 890", online: true, x: 70, y: 30 },
  { id: 4, name: "Sara L.", bike: "Honda CB650", online: false, x: 25, y: 65 },
];

const pois = [
  { id: 1, type: "viewpoint", label: "Mirador Picos", x: 45, y: 25, icon: Eye },
  { id: 2, type: "rest", label: "Bar La Curva", x: 62, y: 50, icon: Coffee },
  { id: 3, type: "alert", label: "Control GC", x: 30, y: 48, icon: AlertTriangle },
  { id: 4, type: "charge", label: "Gasolinera", x: 78, y: 62, icon: Zap },
];

const poiColors: Record<string, string> = {
  viewpoint: "text-success border-success/40 bg-success/10",
  rest: "text-amber border-amber/40 bg-amber/10",
  alert: "text-danger border-danger/40 bg-danger/10",
  charge: "text-primary border-primary/40 bg-primary/10",
};

export default function MapDashboard() {
  return (
    <section id="mapa" className="py-20 px-4">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
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
          {/* Map */}
          <div className="lg:col-span-3 relative rounded-xl overflow-hidden border border-border" style={{ minHeight: "480px" }}>
            {/* Fake map background */}
            <div className="absolute inset-0 bg-surface-2">
              {/* Grid lines to simulate map */}
              <svg className="w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="hsl(220 10% 30%)" strokeWidth="0.5" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
              </svg>

              {/* Simulated roads */}
              <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
                <path d="M 10% 50% Q 30% 20% 55% 35% T 90% 40%" fill="none" stroke="hsl(220 10% 25%)" strokeWidth="4" />
                <path d="M 10% 50% Q 30% 20% 55% 35% T 90% 40%" fill="none" stroke="hsl(38 100% 55% / 0.5)" strokeWidth="2" strokeDasharray="8 4" />
                <path d="M 20% 80% Q 50% 60% 70% 70%" fill="none" stroke="hsl(220 10% 25%)" strokeWidth="3" />
                <path d="M 60% 10% Q 70% 40% 75% 65%" fill="none" stroke="hsl(220 10% 22%)" strokeWidth="3" />
              </svg>

              {/* POIs */}
              {pois.map((poi) => {
                const Icon = poi.icon;
                return (
                  <div
                    key={poi.id}
                    className={`absolute flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-bold ${poiColors[poi.type]} cursor-pointer hover:scale-110 transition-transform`}
                    style={{ left: `${poi.x}%`, top: `${poi.y}%`, transform: "translate(-50%, -50%)" }}
                  >
                    <Icon className="h-3 w-3" />
                    <span className="hidden sm:inline">{poi.label}</span>
                  </div>
                );
              })}

              {/* Rider pins */}
              {riders.map((rider) => (
                <div
                  key={rider.id}
                  className="absolute cursor-pointer group"
                  style={{ left: `${rider.x}%`, top: `${rider.y}%`, transform: "translate(-50%, -50%)" }}
                >
                  <div className={`relative flex h-9 w-9 items-center justify-center rounded-full border-2 ${rider.online ? "border-primary bg-primary/20" : "border-muted-foreground bg-muted/20"} transition-transform group-hover:scale-110`}>
                    <Navigation className={`h-4 w-4 ${rider.online ? "text-primary" : "text-muted-foreground"}`} />
                    {rider.online && (
                      <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-success border-2 border-background" />
                    )}
                  </div>
                  <div className="absolute left-1/2 top-10 -translate-x-1/2 hidden group-hover:block bg-card border border-border rounded-md px-2 py-1 text-xs whitespace-nowrap z-10">
                    <p className="font-bold text-foreground">{rider.name}</p>
                    <p className="text-muted-foreground">{rider.bike}</p>
                  </div>
                </div>
              ))}

              {/* Map controls */}
              <div className="absolute top-3 right-3 flex flex-col gap-1">
                {["+", "−"].map((c) => (
                  <button key={c} className="h-8 w-8 rounded border border-border surface-2 text-foreground font-bold hover:border-primary/50 transition-colors">
                    {c}
                  </button>
                ))}
              </div>

              {/* Legend */}
              <div className="absolute bottom-3 left-3 surface-1 border border-border rounded-lg p-3 text-xs space-y-1.5">
                <p className="font-bold text-foreground uppercase tracking-wider mb-2">Leyenda</p>
                <div className="flex items-center gap-2 text-primary"><Navigation className="h-3 w-3" /> Moteros online</div>
                <div className="flex items-center gap-2 text-success"><Eye className="h-3 w-3" /> Miradores</div>
                <div className="flex items-center gap-2 text-danger"><AlertTriangle className="h-3 w-3" /> Incidencias</div>
                <div className="flex items-center gap-2 text-amber"><Coffee className="h-3 w-3" /> Paradas</div>
              </div>
            </div>
          </div>

          {/* Sidebar panel */}
          <div className="flex flex-col gap-3">
            <div className="card-surface rounded-xl p-4">
              <p className="text-xs font-bold uppercase tracking-widest text-primary mb-3">Grupo activo</p>
              <div className="space-y-3">
                {riders.map((r) => (
                  <div key={r.id} className="flex items-center gap-3">
                    <div className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${r.online ? "bg-success" : "bg-muted-foreground"}`} />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-foreground truncate">{r.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{r.bike}</p>
                    </div>
                    {r.online && (
                      <span className="ml-auto text-xs text-success font-semibold">●  Live</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="card-surface rounded-xl p-4">
              <p className="text-xs font-bold uppercase tracking-widest text-primary mb-3">Ruta actual</p>
              <p className="text-2xl font-display text-foreground">247 km</p>
              <p className="text-xs text-muted-foreground mb-3">Madrid → Cuenca circular</p>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Duración est.</span>
                  <span className="font-semibold text-foreground">3h 40min</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Paradas</span>
                  <span className="font-semibold text-foreground">3 planificadas</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Dificultad</span>
                  <span className="font-semibold text-primary">Media</span>
                </div>
              </div>
            </div>

            <button className="rounded-xl bg-primary py-3.5 text-sm font-bold uppercase tracking-wider text-primary-foreground hover:opacity-90 hover:shadow-[0_0_20px_hsl(25_100%_52%/0.4)] transition-all">
              <Users className="h-4 w-4 inline mr-2" />
              Unirme a esta ruta
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
