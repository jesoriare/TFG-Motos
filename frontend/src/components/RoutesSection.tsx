import { Route, Clock, TrendingUp, Star, Users, ArrowRight, Mountain, Sunset, Trees } from "lucide-react";

const routes = [
  {
    id: 1,
    name: "Ruta de las Águilas",
    region: "Sierra Norte, Madrid",
    distance: "186 km",
    duration: "3h 15min",
    difficulty: "Media-Alta",
    diffColor: "text-warning",
    rating: 4.9,
    riders: 234,
    tags: ["Montaña", "Curvas", "Miradores"],
    icon: Mountain,
    gradient: "from-surface-2 to-surface-1",
  },
  {
    id: 2,
    name: "Costa Brava Express",
    region: "Girona, Cataluña",
    distance: "312 km",
    duration: "5h 30min",
    difficulty: "Fácil",
    diffColor: "text-success",
    rating: 4.7,
    riders: 189,
    tags: ["Costa", "Playas", "Gastronomía"],
    icon: Sunset,
    gradient: "from-surface-2 to-surface-1",
  },
  {
    id: 3,
    name: "Bosques del Norte",
    region: "Asturias",
    distance: "245 km",
    duration: "4h 20min",
    difficulty: "Media",
    diffColor: "text-amber",
    rating: 4.8,
    riders: 156,
    tags: ["Verde", "Naturaleza", "Lluvia"],
    icon: Trees,
    gradient: "from-surface-2 to-surface-1",
  },
];

export default function RoutesSection() {
  return (
    <section id="rutas" className="py-20 px-4 surface-1">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10">
          <p className="text-xs font-bold uppercase tracking-widest text-primary mb-2">Rutas predefinidas</p>
          <h2 className="font-display text-5xl md:text-6xl text-foreground mb-4">RUTAS<br className="hidden sm:block" /> ÉPICAS</h2>
          <p className="max-w-md text-muted-foreground text-sm">
            Rutas verificadas y valoradas por la comunidad. Desde circuitos de montaña hasta rutas costeras.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {routes.map((route) => {
            const Icon = route.icon;
            return (
              <div key={route.id} className="card-surface rounded-xl overflow-hidden group cursor-pointer hover:border-primary/40 transition-all hover:shadow-[0_0_30px_hsl(25_100%_52%/0.1)]">
                {/* Route visual header */}
                <div className="relative h-36 surface-2 flex items-center justify-center overflow-hidden">
                  <Icon className="h-16 w-16 text-primary/20 absolute" />
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
                  <div className="relative z-10 text-center">
                    <p className="font-display text-4xl text-foreground">{route.distance}</p>
                    <p className="text-xs text-muted-foreground mt-1">{route.region}</p>
                  </div>

                  {/* Difficulty badge */}
                  <div className={`absolute top-3 right-3 text-xs font-bold px-2 py-1 rounded surface-3 border border-border/50 ${route.diffColor}`}>
                    {route.difficulty}
                  </div>
                </div>

                <div className="p-4">
                  <h3 className="font-display text-xl text-foreground mb-2 group-hover:text-primary transition-colors">{route.name}</h3>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {route.duration}</span>
                    <span className="flex items-center gap-1"><Star className="h-3 w-3 text-amber" /> {route.rating}</span>
                    <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {route.riders}</span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {route.tags.map((tag) => (
                      <span key={tag} className="text-xs px-2 py-0.5 rounded-full surface-3 border border-border/50 text-muted-foreground">
                        {tag}
                      </span>
                    ))}
                  </div>

                  <button className="w-full flex items-center justify-center gap-2 rounded-md border border-border py-2.5 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:border-primary/50 hover:text-primary transition-all group-hover:border-primary/30">
                    Ver detalles <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="text-center">
          <button className="inline-flex items-center gap-2 rounded-md border border-border surface-2 px-6 py-3 text-sm font-bold uppercase tracking-wider text-muted-foreground hover:border-primary/50 hover:text-primary transition-all">
            Ver todas las rutas ({Math.floor(Math.random() * 200) + 3600}) <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
}
