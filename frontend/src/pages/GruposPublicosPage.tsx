import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, Globe, Route, UserPlus } from "lucide-react";
import { getToken, getGruposPublicos, unirseAGrupo, type GrupoPublico } from "@/lib/api";
import { Spinner } from "@/components/ui/spinner";
import Navbar from "@/components/Navbar";

export default function GruposPublicosPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [grupos, setGrupos] = useState<GrupoPublico[]>([]);
  const [loading, setLoading] = useState(true);
  const [joiningIds, setJoiningIds] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function load(q: string) {
    const token = getToken();
    if (!token) { navigate("/entrar"); return; }
    setLoading(true);
    const data = await getGruposPublicos(q, token);
    setGrupos(data);
    setLoading(false);
  }

  useEffect(() => {
    const timeout = setTimeout(() => load(query), 300);
    return () => clearTimeout(timeout);
  }, [query]);

  async function handleUnirse(id: string) {
    const token = getToken();
    if (!token) return;
    setJoiningIds(prev => new Set(prev).add(id));
    setErrors(prev => { const next = { ...prev }; delete next[id]; return next; });
    const { error } = await unirseAGrupo(id, token);
    setJoiningIds(prev => { const next = new Set(prev); next.delete(id); return next; });
    if (error) { setErrors(prev => ({ ...prev, [id]: error })); return; }
    navigate(`/grupos/${id}`);
  }

  return (
    <div className="min-h-screen bg-background pt-24 pb-16 px-4">
      <Navbar />
      <div className="mx-auto max-w-2xl">
        <button
          onClick={() => navigate("/grupos")}
          className="mb-6 flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Mis grupos
        </button>

        <p className="text-xs font-bold uppercase tracking-widest text-primary mb-2">Comunidad</p>
        <h1 className="font-display text-4xl sm:text-5xl text-foreground mb-8">
          GRUPOS PÚBLICOS
        </h1>

        <div className="relative mb-8">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre o descripción..."
            className="w-full rounded-md border border-border bg-surface-3 pl-10 pr-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        ) : grupos.length === 0 ? (
          <div className="card-surface rounded-xl p-10 text-center">
            <Globe className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">
              {query ? "No se encontraron grupos públicos con ese término" : "No hay grupos públicos disponibles todavía"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {grupos.map((g) => {
              const joining = joiningIds.has(g.id);
              return (
                <div key={g.id} className="card-surface rounded-xl p-4 flex items-start gap-4">
                  <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <Globe className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-foreground text-sm truncate">{g.nombre}</p>
                    <p className="text-xs text-muted-foreground truncate">Liderado por @{g.lider_username}</p>
                    {g.descripcion && (
                      <p className="text-xs text-muted-foreground/80 mt-1 line-clamp-2">{g.descripcion}</p>
                    )}
                    {g.ruta && (
                      <p className="text-xs text-muted-foreground/60 mt-1 flex items-center gap-1">
                        <Route className="h-3 w-3" /> {g.ruta.nombre} — {g.ruta.region}
                      </p>
                    )}
                    {errors[g.id] && <p className="text-xs text-danger mt-1">{errors[g.id]}</p>}
                  </div>
                  <button
                    onClick={() => handleUnirse(g.id)}
                    disabled={joining}
                    className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-bold uppercase tracking-wider text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-all flex-shrink-0"
                  >
                    <UserPlus className="h-3.5 w-3.5" /> Unirse
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
