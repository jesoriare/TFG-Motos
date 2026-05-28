import { MapPin } from "lucide-react";

export default function Footer() {
  return (
    <footer className="surface-1 border-t border-border py-12 px-4">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          <div>
            <a href="#" className="flex items-center gap-2 mb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary">
                <MapPin className="h-4 w-4 text-primary-foreground" strokeWidth={2.5} />
              </div>
              <span className="font-display text-xl tracking-tight text-foreground">
                RODADA<span className="text-primary">MOTO</span>
              </span>
            </a>
            <p className="text-xs text-muted-foreground max-w-xs">
              La plataforma de referencia para moteros en España. Rutas, comunidad e incidencias en tiempo real.
            </p>
          </div>

          <div className="flex flex-wrap gap-8 text-xs">
            <div>
              <p className="font-bold uppercase tracking-widest text-foreground mb-3">Plataforma</p>
              <ul className="space-y-2 text-muted-foreground">
                {["Mapa en vivo", "Rutas", "Moteros", "Incidencias", "Circuitos"].map((l) => (
                  <li key={l}><a href="#" className="hover:text-primary transition-colors">{l}</a></li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-bold uppercase tracking-widest text-foreground mb-3">Empresa</p>
              <ul className="space-y-2 text-muted-foreground">
                {["Acerca de", "Blog", "Contacto", "Privacidad", "Términos"].map((l) => (
                  <li key={l}><a href="#" className="hover:text-primary transition-colors">{l}</a></li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <p>© 2026 RodadaMoto. Todos los derechos reservados.</p>
          <p>Hecho con <span className="text-primary">♥</span> por y para moteros</p>
        </div>
      </div>
    </footer>
  );
}
