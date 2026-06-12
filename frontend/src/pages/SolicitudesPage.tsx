import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Check, X, UserCheck, Shield } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Spinner } from "@/components/ui/spinner";
import Navbar from "@/components/Navbar";

const API_URL = (import.meta.env.VITE_API_URL as string) || "http://localhost:3001";

interface Solicitud {
  id: string;
  created_at: string;
  profiles: {
    username: string;
    nombre: string;
    apellidos: string;
    avatar_url: string | null;
    verified: boolean;
  };
}

export default function SolicitudesPage() {
  const navigate = useNavigate();
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  async function getToken() {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }

  async function load() {
    const token = await getToken();
    if (!token) { navigate("/entrar"); return; }

    const res = await fetch(`${API_URL}/amistad/solicitudes`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setSolicitudes(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleAceptar(id: string) {
    const token = await getToken();
    if (!token) return;
    setProcessingIds(prev => new Set(prev).add(id));
    const res = await fetch(`${API_URL}/amistad/${id}/aceptar`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setSolicitudes(prev => prev.filter(s => s.id !== id));
    setProcessingIds(prev => { const next = new Set(prev); next.delete(id); return next; });
  }

  async function handleRechazar(id: string) {
    const token = await getToken();
    if (!token) return;
    setProcessingIds(prev => new Set(prev).add(id));
    const res = await fetch(`${API_URL}/amistad/${id}/rechazar`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setSolicitudes(prev => prev.filter(s => s.id !== id));
    setProcessingIds(prev => { const next = new Set(prev); next.delete(id); return next; });
  }

  return (
    <div className="min-h-screen bg-background pt-24 pb-16 px-4">
      <Navbar />
      <div className="mx-auto max-w-2xl">
        <button
          onClick={() => navigate(-1)}
          className="mb-6 flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Volver
        </button>

        <p className="text-xs font-bold uppercase tracking-widest text-primary mb-2">Comunidad</p>
        <h1 className="font-display text-4xl sm:text-5xl text-foreground mb-8">
          SOLICITUDES<br className="sm:hidden" /> DE AMISTAD
        </h1>

        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        ) : solicitudes.length === 0 ? (
          <div className="card-surface rounded-xl p-10 text-center">
            <UserCheck className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">No tienes solicitudes de amistad pendientes</p>
          </div>
        ) : (
          <div className="space-y-3">
            {solicitudes.map((s) => {
              const p = s.profiles;
              const initials = `${p.nombre.charAt(0)}${p.apellidos?.charAt(0) ?? ""}`.toUpperCase();
              const processing = processingIds.has(s.id);
              return (
                <div key={s.id} className="card-surface rounded-xl p-4 flex items-center gap-4">
                  <button
                    onClick={() => navigate(`/perfil/${p.username}`)}
                    className="relative h-12 w-12 rounded-xl overflow-hidden bg-primary/20 flex items-center justify-center text-sm font-display font-bold text-primary flex-shrink-0"
                  >
                    {p.avatar_url
                      ? <img src={p.avatar_url} alt={p.username} className="h-full w-full object-cover" />
                      : initials
                    }
                  </button>

                  <div className="min-w-0 flex-1">
                    <button
                      onClick={() => navigate(`/perfil/${p.username}`)}
                      className="flex items-center gap-1.5 hover:text-primary transition-colors"
                    >
                      <p className="font-bold text-foreground text-sm truncate">{p.nombre} {p.apellidos}</p>
                      {p.verified && <Shield className="h-3.5 w-3.5 text-primary flex-shrink-0" />}
                    </button>
                    <p className="text-xs text-muted-foreground truncate">@{p.username}</p>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleAceptar(s.id)}
                      disabled={processing}
                      title="Aceptar"
                      className="flex items-center gap-1 rounded-md border border-success/40 bg-success/10 px-3 py-2 text-xs font-bold text-success hover:bg-success/20 transition-all disabled:opacity-50"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleRechazar(s.id)}
                      disabled={processing}
                      title="Rechazar"
                      className="flex items-center gap-1 rounded-md border border-border bg-surface-3 px-3 py-2 text-xs font-bold text-muted-foreground hover:border-danger/50 hover:text-danger transition-all disabled:opacity-50"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
