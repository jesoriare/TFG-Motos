import { MapPin, Menu, X } from "lucide-react";
import { useState } from "react";

export default function Navbar() {
  const [open, setOpen] = useState(false);

  const links = [
    { label: "Mapa", href: "#mapa" },
    { label: "Rutas", href: "#rutas" },
    { label: "Moteros", href: "#moteros" },
    { label: "Incidencias", href: "#incidencias" },
    { label: "Circuitos", href: "#circuitos" },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        {/* Logo */}
        <a href="#" className="flex items-center gap-2 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary">
            <MapPin className="h-5 w-5 text-primary-foreground" strokeWidth={2.5} />
          </div>
          <span className="font-display text-2xl tracking-tight text-foreground">
            RODADA<span className="text-primary">MOTO</span>
          </span>
        </a>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="px-4 py-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-primary"
            >
              {l.label}
            </a>
          ))}
        </nav>

        {/* CTA */}
        <div className="hidden md:flex items-center gap-3">
          <button className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">
            Entrar
          </button>
          <button className="rounded-md bg-primary px-4 py-2 text-sm font-bold uppercase tracking-wider text-primary-foreground transition-all hover:opacity-90 hover:shadow-[0_0_20px_hsl(25_100%_52%/0.4)] glow-orange">
            Únete gratis
          </button>
        </div>

        {/* Mobile */}
        <button className="md:hidden text-muted-foreground" onClick={() => setOpen(!open)}>
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden surface-1 border-t border-border px-4 pb-4">
          {links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block py-3 text-sm font-bold uppercase tracking-wider text-muted-foreground hover:text-primary border-b border-border/40 last:border-0"
            >
              {l.label}
            </a>
          ))}
          <button className="mt-4 w-full rounded-md bg-primary py-2.5 text-sm font-bold uppercase tracking-wider text-primary-foreground">
            Únete gratis
          </button>
        </div>
      )}
    </header>
  );
}
