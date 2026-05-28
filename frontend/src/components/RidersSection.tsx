import { MapPin, Filter, Users, Star, Shield } from "lucide-react";

const bikeTypes = ["Todos", "Sport", "Naked", "Adventure", "Custom", "Touring", "Enduro"];

const riders = [
  {
    id: 1,
    name: "Carlos Mendoza",
    handle: "@carlos_ducatero",
    bike: "Ducati Streetfighter 950",
    cc: "950cc",
    type: "Naked",
    zone: "Madrid Norte",
    rating: 4.9,
    routes: 87,
    online: true,
    verified: true,
    avatar: "CM",
    color: "bg-primary/20 text-primary",
  },
  {
    id: 2,
    name: "Ana Rodríguez",
    handle: "@ana_bmwrider",
    bike: "BMW R 1250 GS",
    cc: "1254cc",
    type: "Adventure",
    zone: "Madrid Centro",
    rating: 4.8,
    routes: 124,
    online: true,
    verified: true,
    avatar: "AR",
    color: "bg-success/20 text-success",
  },
  {
    id: 3,
    name: "Javier Prados",
    handle: "@javi_ktm",
    bike: "KTM 890 Duke R",
    cc: "890cc",
    type: "Naked",
    zone: "Getafe",
    rating: 4.7,
    routes: 52,
    online: true,
    verified: false,
    avatar: "JP",
    color: "bg-amber/20 text-amber",
  },
  {
    id: 4,
    name: "María López",
    handle: "@maria_harley",
    bike: "Harley-Davidson Iron 883",
    cc: "883cc",
    type: "Custom",
    zone: "Alcalá de Henares",
    rating: 4.6,
    routes: 31,
    online: false,
    verified: true,
    avatar: "ML",
    color: "bg-primary/10 text-primary",
  },
  {
    id: 5,
    name: "Roberto Sanz",
    handle: "@rob_honda",
    bike: "Honda Africa Twin 1100",
    cc: "1100cc",
    type: "Adventure",
    zone: "Pozuelo",
    rating: 4.9,
    routes: 201,
    online: true,
    verified: true,
    avatar: "RS",
    color: "bg-danger/20 text-danger",
  },
  {
    id: 6,
    name: "Lucía García",
    handle: "@luci_kawasaki",
    bike: "Kawasaki Z900",
    cc: "900cc",
    type: "Naked",
    zone: "Leganés",
    rating: 4.5,
    routes: 18,
    online: false,
    verified: false,
    avatar: "LG",
    color: "bg-success/10 text-success",
  },
];

export default function RidersSection() {
  return (
    <section id="moteros" className="py-20 px-4">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-primary mb-2">Comunidad</p>
            <h2 className="font-display text-5xl md:text-6xl text-foreground">MOTEROS<br />CERCA DE TI</h2>
          </div>
          <p className="max-w-xs text-muted-foreground text-sm">
            Filtra por cilindrada, tipo de moto o zona y encuentra tu equipo perfecto para la próxima salida.
          </p>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <Filter className="h-3.5 w-3.5" />
            Tipo:
          </div>
          {bikeTypes.map((type, i) => (
            <button
              key={type}
              className={`rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-all ${
                i === 0
                  ? "bg-primary text-primary-foreground"
                  : "border border-border surface-2 text-muted-foreground hover:border-primary/50 hover:text-primary"
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        {/* Zone search */}
        <div className="mb-8 flex gap-2">
          <div className="flex-1 flex items-center gap-2 rounded-lg border border-border surface-2 px-4 py-2.5">
            <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <input
              type="text"
              placeholder="Buscar por zona o municipio..."
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
            />
          </div>
          <button className="rounded-lg bg-primary px-5 py-2.5 text-sm font-bold uppercase tracking-wider text-primary-foreground hover:opacity-90 transition-opacity">
            Buscar
          </button>
        </div>

        {/* Riders grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {riders.map((rider) => (
            <div key={rider.id} className="card-surface rounded-xl p-4 group cursor-pointer hover:border-primary/30 transition-all">
              <div className="flex items-start gap-3 mb-4">
                {/* Avatar */}
                <div className={`relative h-12 w-12 rounded-xl flex items-center justify-center text-sm font-display font-bold flex-shrink-0 ${rider.color}`}>
                  {rider.avatar}
                  {rider.online && (
                    <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-success border-2 border-card" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="font-bold text-foreground text-sm truncate group-hover:text-primary transition-colors">{rider.name}</p>
                    {rider.verified && <Shield className="h-3.5 w-3.5 text-primary flex-shrink-0" />}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{rider.handle}</p>
                </div>

                <div className="flex items-center gap-1 text-xs text-amber flex-shrink-0">
                  <Star className="h-3 w-3" />
                  {rider.rating}
                </div>
              </div>

              {/* Bike info */}
              <div className="surface-3 rounded-lg p-3 mb-3 stripe-border">
                <p className="text-xs font-bold text-foreground truncate">{rider.bike}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{rider.cc} · {rider.type}</p>
              </div>

              {/* Stats */}
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <MapPin className="h-3 w-3" /> {rider.zone}
                </span>
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Users className="h-3 w-3" /> {rider.routes} rutas
                </span>
              </div>

              <button className="mt-3 w-full rounded-lg border border-border py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:border-primary/50 hover:text-primary transition-all">
                Ver perfil
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
