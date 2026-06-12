import { MapPin, Filter, Shield, X, Loader2, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";

const API_URL = import.meta.env.VITE_API_URL as string || "http://localhost:3001";

const bikeTypes = ["Todos", "Sport", "Naked", "Adventure", "Custom", "Touring", "Enduro"];

interface Rider {
  id: string;
  nombre: string;
  apellidos: string;
  username: string;
  avatar_url: string | null;
  zona: string | null;
  verified: boolean;
  online: boolean;
  motos: { marca_modelo: string; cilindrada: number; tipo: string }[];
}

export default function RidersSection() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [activeType, setActiveType] = useState("Todos");
  const [riders, setRiders] = useState<Rider[]>([]);
  const [loading, setLoading] = useState(true);
  const [backendDown, setBackendDown] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setCurrentUserId(data.session?.user.id ?? null));
  }, []);

  const fetchRiders = useCallback(async (search: string, tipo: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (tipo !== "Todos") params.set("tipo", tipo.toLowerCase());

      const res = await fetch(`${API_URL}/usuarios?${params}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setRiders(data);
      setBackendDown(false);
    } catch {
      setBackendDown(true);
    } finally {
      setLoading(false);
    }
  }, []);

  // Carga inicial
  useEffect(() => { fetchRiders("", "Todos"); }, [fetchRiders]);

  // Búsqueda con debounce
  useEffect(() => {
    const t = setTimeout(() => fetchRiders(query, activeType), 300);
    return () => clearTimeout(t);
  }, [query, activeType, fetchRiders]);

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
            Filtra por tipo de moto, zona o usuario y encuentra tu equipo perfecto para la próxima salida.
          </p>
        </div>

        {/* Filtros tipo */}
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <Filter className="h-3.5 w-3.5" />
            Tipo:
          </div>
          {bikeTypes.map((type) => (
            <button
              key={type}
              onClick={() => setActiveType(type)}
              className={`rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-all ${
                activeType === type
                  ? "bg-primary text-primary-foreground"
                  : "border border-border surface-2 text-muted-foreground hover:border-primary/50 hover:text-primary"
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        {/* Buscador */}
        <div className="mb-8">
          <div className="flex items-center gap-2 rounded-lg border border-border surface-2 px-4 py-2.5">
            <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por zona, nombre, @usuario o tipo de moto..."
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
            />
            {loading && <Loader2 className="h-4 w-4 text-muted-foreground animate-spin shrink-0" />}
            {!loading && query && (
              <button onClick={() => setQuery("")} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Backend caído */}
        {backendDown && (
          <div className="mb-6 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-400">
            El backend no está arrancado. Ejecuta <code className="font-mono">start-backend.bat</code> para ver los moteros reales.
          </div>
        )}

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {!backendDown && !loading && riders.filter((r) => r.id !== currentUserId).length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground text-sm">
              No se encontraron moteros con esa búsqueda
            </div>
          )}

          {riders.filter((r) => r.id !== currentUserId).map((rider) => {
            const moto = rider.motos?.[0];
            const initials = `${rider.nombre.charAt(0)}${rider.apellidos?.charAt(0) ?? ""}`.toUpperCase();
            return (
              <div key={rider.id} className="card-surface rounded-xl p-4 group cursor-pointer hover:border-primary/30 transition-all">
                <div className="flex items-start gap-3 mb-4">
                  {/* Avatar */}
                  <div className="relative h-12 w-12 rounded-xl overflow-hidden bg-primary/20 flex items-center justify-center text-sm font-display font-bold text-primary flex-shrink-0">
                    {rider.avatar_url
                      ? <img src={rider.avatar_url} alt={rider.username} className="h-full w-full object-cover" />
                      : initials
                    }
                    {rider.online && (
                      <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-500 border-2 border-card" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="font-bold text-foreground text-sm truncate group-hover:text-primary transition-colors">
                        {rider.nombre} {rider.apellidos}
                      </p>
                      {rider.verified && <Shield className="h-3.5 w-3.5 text-primary flex-shrink-0" />}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">@{rider.username}</p>
                  </div>
                </div>

                {/* Moto */}
                {moto ? (
                  <div className="surface-3 rounded-lg p-3 mb-3 stripe-border">
                    <p className="text-xs font-bold text-foreground truncate">{moto.marca_modelo}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{moto.cilindrada}cc · {moto.tipo}</p>
                  </div>
                ) : (
                  <div className="surface-3 rounded-lg p-3 mb-3 stripe-border">
                    <p className="text-xs text-muted-foreground italic">Sin moto registrada</p>
                  </div>
                )}

                {/* Stats */}
                <div className="flex items-center justify-between text-xs mb-3">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <MapPin className="h-3 w-3" /> {rider.zona ?? "Sin zona"}
                  </span>
                  <span className={`flex items-center gap-1.5 ${rider.online ? "text-green-400" : "text-muted-foreground"}`}>
                    <span className={`h-2 w-2 rounded-full ${rider.online ? "bg-green-400" : "bg-muted-foreground/40"}`} />
                    {rider.online ? "En línea" : "Desconectado"}
                  </span>
                </div>

                <button
                  onClick={() => navigate(`/perfil/${rider.username}`)}
                  className="w-full rounded-lg border border-border py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:border-primary/50 hover:text-primary transition-all"
                >
                  Ver perfil
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
