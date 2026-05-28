import { AlertTriangle, Shield, Clock, Eye, CheckCircle, MapPin, ArrowRight } from "lucide-react";

const incidents = [
  {
    id: 1,
    type: "Control GC",
    description: "Control de velocidad Guardia Civil fijo en el km 34 de la N-II sentido Guadalajara",
    road: "N-II km 34",
    time: "Hace 12 min",
    confirmed: 18,
    severity: "high",
    icon: Shield,
  },
  {
    id: 2,
    type: "Radar Móvil",
    description: "Radar móvil en furgoneta plateada en el arcén derecho de la A-6, sentido Madrid",
    road: "A-6 km 28",
    time: "Hace 23 min",
    confirmed: 9,
    severity: "high",
    icon: Eye,
  },
  {
    id: 3,
    type: "Firme en mal estado",
    description: "Baches peligrosos y gravilla suelta tras las curvas del Puerto de la Morcuera",
    road: "M-632 Puerto Morcuera",
    time: "Hace 41 min",
    confirmed: 34,
    severity: "medium",
    icon: AlertTriangle,
  },
  {
    id: 4,
    type: "Accidente resuelto",
    description: "Accidente entre dos turismos ya despejado. Precaución por restos en calzada.",
    road: "A-3 km 18",
    time: "Hace 1h 5min",
    confirmed: 27,
    severity: "resolved",
    icon: CheckCircle,
  },
  {
    id: 5,
    type: "Obras",
    description: "Corte de carril por obras de asfaltado. Semáforo provisional alternativo.",
    road: "CL-501 km 12",
    time: "Hace 2h",
    confirmed: 41,
    severity: "low",
    icon: AlertTriangle,
  },
];

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

export default function IncidentsSection() {
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
              {incidents.filter(i => i.severity !== 'resolved').length} alertas activas
            </div>
            <button className="rounded-lg bg-danger/15 border border-danger/30 px-4 py-2 text-xs font-bold uppercase tracking-wider text-danger hover:bg-danger/20 transition-colors">
              + Reportar
            </button>
          </div>
        </div>

        <div className="space-y-3 mb-8">
          {incidents.map((inc) => {
            const Icon = inc.icon;
            return (
              <div
                key={inc.id}
                className={`card-surface rounded-xl border-l-4 p-4 cursor-pointer hover:border-r-primary/20 transition-all group ${severityStyles[inc.severity]}`}
              >
                <div className="flex items-start gap-4">
                  <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${severityBadge[inc.severity]}`}>
                    <Icon className="h-5 w-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">{inc.type}</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${severityBadge[inc.severity]}`}>
                        {severityLabel[inc.severity]}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{inc.description}</p>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {inc.road}</span>
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {inc.time}</span>
                      <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3 text-success" /> {inc.confirmed} confirmaciones</span>
                    </div>
                  </div>

                  <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Report CTA */}
        <div className="card-surface rounded-xl p-6 border-dashed border-2 border-border hover:border-primary/30 transition-all cursor-pointer group text-center">
          <AlertTriangle className="h-8 w-8 text-muted-foreground mx-auto mb-3 group-hover:text-primary transition-colors" />
          <p className="font-bold text-foreground mb-1">¿Ves algo en la carretera?</p>
          <p className="text-sm text-muted-foreground">Reporta controles, accidentes, obras o cualquier incidencia para avisar a la comunidad.</p>
          <button className="mt-4 rounded-lg bg-primary px-5 py-2.5 text-sm font-bold uppercase tracking-wider text-primary-foreground hover:opacity-90 transition-opacity">
            Reportar incidencia
          </button>
        </div>
      </div>
    </section>
  );
}
