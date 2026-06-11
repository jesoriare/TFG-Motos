import { useEffect, useRef, useState } from "react";
import { Route, Clock, Mountain, Plus, ArrowRight, MapPin, X, ChevronDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Spinner } from "@/components/ui/spinner";
import { CIUDADES_ESPANA } from "@/data/ciudades-espana";

const API_URL = (import.meta.env.VITE_API_URL as string) || "http://localhost:3001";

interface Ruta {
  id: string; nombre: string; region: string;
  distancia_km: number; duracion_min: number;
  dificultad: string; tags: string[];
  profiles: { username: string };
}

const DIFICULTAD: Record<string, { label: string; color: string }> = {
  facil:      { label: "Fácil",      color: "text-success" },
  media:      { label: "Media",      color: "text-amber" },
  media_alta: { label: "Media-Alta", color: "text-warning" },
  alta:       { label: "Alta",       color: "text-danger" },
};

function formatDuracion(min: number) {
  const h = Math.floor(min / 60), m = min % 60;
  return h > 0 ? `${h}h${m > 0 ? ` ${m}min` : ""}` : `${m}min`;
}

export default function RoutesSection() {
  const navigate = useNavigate();
  const [rutas, setRutas] = useState<Ruta[]>([]);
  const [loading, setLoading] = useState(true);
  const [regionFilter, setRegionFilter] = useState("");
  const [regionQuery, setRegionQuery] = useState("");
  const [regionOpen, setRegionOpen] = useState(false);
  const regionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`${API_URL}/rutas`)
      .then(r => r.ok ? r.json() : [])
      .then(data => { setRutas(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (regionRef.current && !regionRef.current.contains(e.target as Node)) setRegionOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const filteredRutas = regionFilter
    ? rutas.filter(r => r.region.toLowerCase().includes(regionFilter.toLowerCase()))
    : rutas;

  const displayRutas = regionFilter ? filteredRutas : filteredRutas.slice(0, 6);

  return (
    <section id="rutas" className="py-20 px-4 surface-1">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-primary mb-2">Rutas predefinidas</p>
            <h2 className="font-display text-5xl md:text-6xl text-foreground mb-4">RUTAS<br className="hidden sm:block" /> ÉPICAS</h2>
            <p className="max-w-md text-muted-foreground text-sm">
              Rutas verificadas y valoradas por la comunidad. Desde circuitos de montaña hasta rutas costeras.
            </p>
          </div>
          <button
            onClick={() => navigate("/rutas/crear")}
            className="flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-bold uppercase tracking-wider text-primary-foreground transition-all hover:opacity-90 hover:shadow-[0_0_20px_hsl(25_100%_52%/0.4)] shrink-0"
          >
            <Plus className="h-4 w-4" /> Crear ruta
          </button>
        </div>

        {/* Filtro región */}
        <div className="mb-8 flex items-center gap-3 flex-wrap">
          <div className="relative w-72" ref={regionRef}>
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              value={regionQuery || regionFilter}
              onChange={e => { setRegionQuery(e.target.value); setRegionFilter(e.target.value); setRegionOpen(true); }}
              onFocus={() => setRegionOpen(true)}
              onKeyDown={e => e.key === 'Escape' && setRegionOpen(false)}
              placeholder="Filtrar por región o ciudad..."
              className="w-full rounded-md border border-border bg-surface-3 pl-10 pr-8 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
            />
            {regionFilter
              ? <button type="button" onClick={() => { setRegionFilter(""); setRegionQuery(""); setRegionOpen(false); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              : <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            }
            {regionOpen && (
              <ul className="absolute z-[1001] w-full max-h-52 overflow-y-auto mt-1 rounded-md border border-border bg-card shadow-xl">
                {CIUDADES_ESPANA.filter(c => c.toLowerCase().includes((regionQuery || regionFilter).toLowerCase())).slice(0, 40).map(ciudad => (
                  <li key={ciudad}>
                    <button type="button" onMouseDown={() => { setRegionFilter(ciudad); setRegionQuery(""); setRegionOpen(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-surface-2 transition-colors">
                      <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span className="text-foreground truncate">{ciudad}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {regionFilter && (
            <div className="flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5">
              <MapPin className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-bold text-primary">{regionFilter}</span>
              <button onClick={() => { setRegionFilter(""); setRegionQuery(""); }} className="text-primary/60 hover:text-primary">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {regionFilter && (
            <span className="text-xs text-muted-foreground">
              {filteredRutas.length} {filteredRutas.length === 1 ? "ruta" : "rutas"} encontradas
            </span>
          )}
        </div>

        {loading && (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        )}

        {!loading && filteredRutas.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <Mountain className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-bold text-foreground mb-1">
              {regionFilter ? `No hay rutas en "${regionFilter}"` : "Aún no hay rutas publicadas"}
            </p>
            <p className="text-sm">
              {regionFilter ? "Prueba con otra ciudad o elimina el filtro." : "¡Sé el primero en compartir tu ruta épica!"}
            </p>
            {regionFilter
              ? <button onClick={() => { setRegionFilter(""); setRegionQuery(""); }} className="mt-4 inline-flex items-center gap-2 rounded-md border border-border px-5 py-2.5 text-sm font-bold text-muted-foreground hover:text-primary hover:border-primary/50 transition-all">
                  <X className="h-4 w-4" /> Quitar filtro
                </button>
              : <button onClick={() => navigate("/rutas/crear")} className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90 transition-opacity">
                  <Plus className="h-4 w-4" /> Crear ruta
                </button>
            }
          </div>
        )}

        {displayRutas.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {displayRutas.map((ruta) => {
                const dif = DIFICULTAD[ruta.dificultad] ?? { label: ruta.dificultad, color: "text-muted-foreground" };
                return (
                  <div key={ruta.id} className="card-surface rounded-xl overflow-hidden group cursor-pointer hover:border-primary/40 transition-all hover:shadow-[0_0_30px_hsl(25_100%_52%/0.1)]">
                    <div className="relative h-36 surface-2 flex items-center justify-center overflow-hidden">
                      <Mountain className="h-16 w-16 text-primary/20 absolute" />
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
                      <div className="relative z-10 text-center">
                        <p className="font-display text-4xl text-foreground">{ruta.distancia_km} km</p>
                        <p className="text-xs text-muted-foreground mt-1">{ruta.region}</p>
                      </div>
                      <div className={`absolute top-3 right-3 text-xs font-bold px-2 py-1 rounded surface-3 border border-border/50 ${dif.color}`}>
                        {dif.label}
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-display text-xl text-foreground mb-2 group-hover:text-primary transition-colors">{ruta.nombre}</h3>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {formatDuracion(ruta.duracion_min)}</span>
                        <span className="flex items-center gap-1"><Route className="h-3 w-3" /> {ruta.distancia_km} km</span>
                        <span>@{ruta.profiles?.username}</span>
                      </div>
                      {ruta.tags?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-4">
                          {ruta.tags.map(tag => (
                            <span key={tag} className="text-xs px-2 py-0.5 rounded-full surface-3 border border-border/50 text-muted-foreground">{tag}</span>
                          ))}
                        </div>
                      )}
                      <button
                        onClick={() => navigate(`/rutas/${ruta.id}`)}
                        className="w-full flex items-center justify-center gap-2 rounded-md border border-border py-2.5 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:border-primary/50 hover:text-primary transition-all group-hover:border-primary/30"
                      >
                        Ver detalles <ArrowRight className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {!regionFilter && rutas.length > 6 && (
              <div className="text-center">
                <button className="inline-flex items-center gap-2 rounded-md border border-border surface-2 px-6 py-3 text-sm font-bold uppercase tracking-wider text-muted-foreground hover:border-primary/50 hover:text-primary transition-all">
                  Ver todas las rutas ({rutas.length}) <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
