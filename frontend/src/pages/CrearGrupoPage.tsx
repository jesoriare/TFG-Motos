import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Users, Route, Lock, Globe } from "lucide-react";
import { getToken, getMe, crearGrupo } from "@/lib/api";
import Navbar from "@/components/Navbar";

const API_URL = (import.meta.env.VITE_API_URL as string) || "http://localhost:3001";

interface RutaPropia {
  id: string;
  nombre: string;
  region: string;
}

export default function CrearGrupoPage() {
  const navigate = useNavigate();
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [privacidad, setPrivacidad] = useState<"privado" | "publico">("privado");
  const [rutaId, setRutaId] = useState<string>("");
  const [rutas, setRutas] = useState<RutaPropia[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const me = getMe();
    if (!me) { navigate("/entrar"); return; }
    fetch(`${API_URL}/rutas?username=${me.username}`)
      .then(res => res.ok ? res.json() : [])
      .then(setRutas)
      .catch(() => setRutas([]));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const token = getToken();
    if (!token) { navigate("/entrar"); return; }
    if (!nombre.trim()) { setError("El nombre es obligatorio"); return; }

    setLoading(true);
    setError(null);
    const { data, error: err } = await crearGrupo(
      { nombre: nombre.trim(), ruta_id: rutaId || null, descripcion: descripcion.trim() || null, privacidad },
      token
    );
    setLoading(false);

    if (err) { setError(err); return; }
    navigate(`/grupos/${data!.id}`);
  }

  return (
    <div className="min-h-screen bg-background pt-24 pb-16 px-4">
      <Navbar />
      <div className="mx-auto max-w-lg">
        <button
          onClick={() => navigate(-1)}
          className="mb-6 flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Volver
        </button>

        <p className="text-xs font-bold uppercase tracking-widest text-primary mb-2">Comunidad</p>
        <h1 className="font-display text-4xl sm:text-5xl text-foreground mb-8">
          CREAR GRUPO
        </h1>

        <form onSubmit={handleSubmit} className="card-surface rounded-xl p-6 space-y-5">
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">Nombre del grupo</label>
            <div className="relative">
              <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Rodada de los sábados"
                required
                className="w-full rounded-md border border-border bg-surface-3 pl-10 pr-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">Descripción (opcional)</label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="De qué va el grupo, qué tipo de rutas hacéis..."
              rows={3}
              className="w-full rounded-md border border-border bg-surface-3 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">Privacidad</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPrivacidad("privado")}
                className={`flex items-center justify-center gap-2 rounded-md border px-3 py-2.5 text-sm font-semibold transition-all ${
                  privacidad === "privado"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-surface-3 text-muted-foreground hover:text-foreground"
                }`}
              >
                <Lock className="h-4 w-4" /> Privado
              </button>
              <button
                type="button"
                onClick={() => setPrivacidad("publico")}
                className={`flex items-center justify-center gap-2 rounded-md border px-3 py-2.5 text-sm font-semibold transition-all ${
                  privacidad === "publico"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-surface-3 text-muted-foreground hover:text-foreground"
                }`}
              >
                <Globe className="h-4 w-4" /> Público
              </button>
            </div>
            <p className="text-xs text-muted-foreground/60">
              {privacidad === "privado"
                ? "Solo entra quien invites tú (debe ser tu amigo)."
                : "Cualquiera puede encontrarlo y unirse desde \"Grupos públicos\"."}
            </p>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">Ruta vinculada (opcional)</label>
            <div className="relative">
              <Route className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <select
                value={rutaId}
                onChange={(e) => setRutaId(e.target.value)}
                className="w-full appearance-none rounded-md border border-border bg-surface-3 pl-10 pr-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">Sin ruta</option>
                {rutas.map((r) => (
                  <option key={r.id} value={r.id}>{r.nombre} — {r.region}</option>
                ))}
              </select>
            </div>
            {rutas.length === 0 && (
              <p className="text-xs text-muted-foreground/60">No tienes rutas propias creadas todavía.</p>
            )}
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-primary py-3 text-sm font-bold uppercase tracking-wider text-primary-foreground transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Creando..." : "Crear grupo"}
          </button>
        </form>
      </div>
    </div>
  );
}
