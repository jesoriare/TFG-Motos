import heroMoto from "@/assets/hero-moto.jpg";
import { ArrowRight, Users, Route, AlertTriangle } from "lucide-react";

export default function HeroSection() {
  const stats = [
    { icon: Users, value: "12.400+", label: "Moteros activos" },
    { icon: Route, value: "3.800+", label: "Rutas publicadas" },
    { icon: AlertTriangle, value: "En directo", label: "Incidencias en tiempo real" },
  ];

  return (
    <section className="relative min-h-screen flex items-end pb-24 overflow-hidden">
      {/* Background image */}
      <div className="absolute inset-0">
        <img src={heroMoto} alt="Grupo de moteros en ruta de montaña" className="h-full w-full object-cover" />
        <div className="absolute inset-0" style={{ background: "var(--gradient-hero)" }} />
        {/* Side vignette */}
        <div className="absolute inset-0 bg-gradient-to-r from-background/60 via-transparent to-background/30" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 w-full">
        {/* Badge */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 py-1.5">
          <span className="h-2 w-2 rounded-full bg-primary animate-pulse-orange" />
          <span className="text-xs font-bold uppercase tracking-widest text-primary">Plataforma de moteros</span>
        </div>

        <h1 className="font-display text-6xl md:text-8xl lg:text-9xl leading-none tracking-tight mb-6">
          <span className="text-foreground">LA RUTA</span>
          <br />
          <span className="text-gradient-orange">EMPIEZA</span>
          <br />
          <span className="text-foreground">AQUÍ</span>
        </h1>

        <p className="max-w-xl text-lg text-muted-foreground mb-8 font-body">
          Conecta con moteros de tu zona, descubre rutas épicas, comparte tu posición en tiempo real
          y sal a la carretera con la comunidad que siempre quisiste.
        </p>

        <div className="flex flex-wrap gap-3 mb-16">
          <a href="#rutas" className="flex items-center gap-2 rounded-md bg-primary px-6 py-3.5 text-sm font-bold uppercase tracking-wider text-primary-foreground transition-all hover:opacity-90 hover:shadow-[0_0_30px_hsl(25_100%_52%/0.5)]">
            Explorar rutas <ArrowRight className="h-4 w-4" />
          </a>
          <a href="#mapa" className="flex items-center gap-2 rounded-md border border-border bg-surface-2 px-6 py-3.5 text-sm font-bold uppercase tracking-wider text-foreground transition-all hover:border-primary/50 hover:bg-surface-3">
            Ver el mapa en vivo
          </a>
        </div>

        {/* Stats */}
        <div className="flex flex-wrap gap-6 md:gap-10">
          {stats.map(({ icon: Icon, value, label }) => (
            <div key={label} className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/15 border border-primary/30">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-display text-xl leading-none text-foreground">{value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
