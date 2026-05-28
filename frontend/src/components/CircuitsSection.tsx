import { Flag, Calendar, Users, Clock, ArrowRight, Trophy } from "lucide-react";

const circuits = [
  {
    id: 1,
    name: "Circuito del Jarama",
    location: "San Sebastián de los Reyes, Madrid",
    date: "15 Mar 2026",
    daysLeft: 25,
    spots: 12,
    totalSpots: 30,
    type: "Open Pit Lane",
    price: "180€",
    level: "Todos los niveles",
    levelColor: "text-success",
  },
  {
    id: 2,
    name: "Motorland Aragón",
    location: "Alcañiz, Teruel",
    date: "29 Mar 2026",
    daysLeft: 39,
    spots: 5,
    totalSpots: 25,
    type: "Track Day",
    price: "240€",
    level: "Avanzado",
    levelColor: "text-warning",
  },
  {
    id: 3,
    name: "Circuit de Catalunya",
    location: "Montmeló, Barcelona",
    date: "12 Abr 2026",
    daysLeft: 53,
    spots: 18,
    totalSpots: 35,
    type: "Open Pit Lane",
    price: "220€",
    level: "Intermedio",
    levelColor: "text-amber",
  },
];

export default function CircuitsSection() {
  return (
    <section id="circuitos" className="py-20 px-4">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10">
          <p className="text-xs font-bold uppercase tracking-widest text-primary mb-2">Salidas a circuito</p>
          <h2 className="font-display text-5xl md:text-6xl text-foreground mb-4">
            SIENTE EL<br />ASFALTO PURO
          </h2>
          <p className="max-w-md text-muted-foreground text-sm">
            Organiza y únete a salidas a circuitos homologados. Sin límites de velocidad, sin tráfico, solo tú y tu moto.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
          {circuits.map((c) => {
            const fillPercent = ((c.totalSpots - c.spots) / c.totalSpots) * 100;
            return (
              <div key={c.id} className="card-surface rounded-xl overflow-hidden group cursor-pointer hover:border-primary/40 transition-all hover:shadow-[0_0_30px_hsl(25_100%_52%/0.1)]">
                {/* Header */}
                <div className="relative surface-2 p-6 overflow-hidden">
                  <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-primary/5" />
                  <Trophy className="absolute right-4 top-4 h-10 w-10 text-primary/20" />

                  <div className="relative z-10">
                    <span className="text-xs font-bold uppercase tracking-wider bg-primary/15 border border-primary/30 text-primary px-2 py-1 rounded-full">
                      {c.type}
                    </span>
                    <h3 className="font-display text-2xl text-foreground mt-3 mb-1 group-hover:text-primary transition-colors">{c.name}</h3>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Flag className="h-3 w-3" /> {c.location}
                    </p>
                  </div>
                </div>

                <div className="p-4">
                  {/* Info grid */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="surface-3 rounded-lg p-3">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                        <Calendar className="h-3 w-3" /> Fecha
                      </div>
                      <p className="text-sm font-bold text-foreground">{c.date}</p>
                      <p className="text-xs text-primary font-semibold">{c.daysLeft} días</p>
                    </div>
                    <div className="surface-3 rounded-lg p-3">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                        <Users className="h-3 w-3" /> Plazas
                      </div>
                      <p className="text-sm font-bold text-foreground">{c.spots} libres</p>
                      <p className={`text-xs font-semibold ${c.spots <= 6 ? "text-danger" : "text-success"}`}>
                        {c.spots <= 6 ? "¡Últimas!" : "Disponible"}
                      </p>
                    </div>
                  </div>

                  {/* Fill bar */}
                  <div className="mb-4">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                      <span>Ocupación</span>
                      <span>{Math.round(fillPercent)}%</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full surface-3">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${fillPercent}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Nivel</p>
                      <p className={`text-sm font-bold ${c.levelColor}`}>{c.level}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Precio</p>
                      <p className="font-display text-xl text-foreground">{c.price}</p>
                    </div>
                  </div>

                  <button className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary py-3 text-sm font-bold uppercase tracking-wider text-primary-foreground hover:opacity-90 hover:shadow-[0_0_20px_hsl(25_100%_52%/0.4)] transition-all">
                    Reservar plaza <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <button className="w-full rounded-xl border border-dashed border-border py-5 text-sm font-bold uppercase tracking-wider text-muted-foreground hover:border-primary/40 hover:text-primary transition-all flex items-center justify-center gap-2">
          <Flag className="h-4 w-4" />
          Proponer nueva salida a circuito
        </button>
      </div>
    </section>
  );
}
