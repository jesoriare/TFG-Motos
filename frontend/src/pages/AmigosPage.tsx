import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Users, Shield, Lock } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Spinner } from "@/components/ui/spinner";

const API_URL = (import.meta.env.VITE_API_URL as string) || "http://localhost:3001";

interface Amigo {
  id: string;
  username: string;
  nombre: string;
  apellidos: string;
  avatar_url: string | null;
  verified: boolean;
  online: boolean;
}

export default function AmigosPage() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const [amigos, setAmigos] = useState<Amigo[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!username) return;
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setForbidden(true); setLoading(false); return; }

      const res = await fetch(`${API_URL}/amistad/amigos/${username}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (res.status === 403) { setForbidden(true); setLoading(false); return; }
      if (res.status === 404) { setNotFound(true); setLoading(false); return; }
      if (res.ok) setAmigos(await res.json());
      setLoading(false);
    }
    load();
  }, [username]);

  return (
    <div className="min-h-screen bg-background pt-24 pb-16 px-4">
      <div className="mx-auto max-w-2xl">
        <button
          onClick={() => navigate(-1)}
          className="mb-6 flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Volver
        </button>

        <p className="text-xs font-bold uppercase tracking-widest text-primary mb-2">Comunidad</p>
        <h1 className="font-display text-4xl sm:text-5xl text-foreground mb-8">
          AMIGOS DE <span className="text-primary">@{username}</span>
        </h1>

        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        ) : forbidden ? (
          <div className="card-surface rounded-xl p-10 text-center">
            <Lock className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">No eres amigo de este usuario</p>
          </div>
        ) : notFound ? (
          <div className="card-surface rounded-xl p-10 text-center">
            <p className="text-muted-foreground text-sm">Usuario no encontrado</p>
          </div>
        ) : amigos.length === 0 ? (
          <div className="card-surface rounded-xl p-10 text-center">
            <Users className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">Todavía no tiene amigos</p>
          </div>
        ) : (
          <div className="space-y-3">
            {amigos.map((a) => {
              const initials = `${a.nombre.charAt(0)}${a.apellidos?.charAt(0) ?? ""}`.toUpperCase();
              return (
                <button
                  key={a.id}
                  onClick={() => navigate(`/perfil/${a.username}`)}
                  className="card-surface rounded-xl p-4 flex items-center gap-4 w-full text-left hover:border-primary/30 transition-all"
                >
                  <div className="relative h-12 w-12 rounded-xl overflow-hidden bg-primary/20 flex items-center justify-center text-sm font-display font-bold text-primary flex-shrink-0">
                    {a.avatar_url
                      ? <img src={a.avatar_url} alt={a.username} className="h-full w-full object-cover" />
                      : initials
                    }
                    {a.online && (
                      <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-500 border-2 border-card" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="font-bold text-foreground text-sm truncate">{a.nombre} {a.apellidos}</p>
                      {a.verified && <Shield className="h-3.5 w-3.5 text-primary flex-shrink-0" />}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">@{a.username}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
