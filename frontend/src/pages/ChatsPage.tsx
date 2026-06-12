import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, MessageCircle, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Spinner } from "@/components/ui/spinner";
import Navbar from "@/components/Navbar";

const API_URL = (import.meta.env.VITE_API_URL as string) || "http://localhost:3001";

interface Conversacion {
  id: string;
  usuario: {
    id: string;
    username: string;
    nombre: string;
    apellidos: string;
    avatar_url: string | null;
    online: boolean;
  };
  ultimo_mensaje: { contenido: string; created_at: string; emisor_id: string } | null;
  no_leidos: number;
  ultimo_mensaje_at: string;
}

function formatFecha(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
  }
  return date.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" });
}

export default function ChatsPage() {
  const navigate = useNavigate();
  const [conversaciones, setConversaciones] = useState<Conversacion[]>([]);
  const [loading, setLoading] = useState(true);

  async function getToken() {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }

  async function load() {
    const token = await getToken();
    if (!token) { navigate("/entrar"); return; }

    const res = await fetch(`${API_URL}/chat`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setConversaciones(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleOcultar(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    const token = await getToken();
    if (!token) return;
    const res = await fetch(`${API_URL}/chat/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setConversaciones(prev => prev.filter(c => c.id !== id));
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
        <h1 className="font-display text-4xl sm:text-5xl text-foreground mb-8">MENSAJES</h1>

        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        ) : conversaciones.length === 0 ? (
          <div className="card-surface rounded-xl p-10 text-center">
            <MessageCircle className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">No tienes conversaciones todavía</p>
          </div>
        ) : (
          <div className="space-y-3">
            {conversaciones.map((c) => {
              const u = c.usuario;
              const initials = `${u.nombre.charAt(0)}${u.apellidos?.charAt(0) ?? ""}`.toUpperCase();
              return (
                <div
                  key={c.id}
                  onClick={() => navigate(`/chats/${c.id}`)}
                  className="card-surface rounded-xl p-4 flex items-center gap-4 cursor-pointer hover:border-primary/30 transition-all"
                >
                  <div className="relative h-12 w-12 rounded-xl overflow-hidden bg-primary/20 flex items-center justify-center text-sm font-display font-bold text-primary flex-shrink-0">
                    {u.avatar_url
                      ? <img src={u.avatar_url} alt={u.username} className="h-full w-full object-cover" />
                      : initials
                    }
                    {u.online && (
                      <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-500 border-2 border-card" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-bold text-foreground text-sm truncate">{u.nombre} {u.apellidos}</p>
                      {c.ultimo_mensaje && (
                        <span className="text-xs text-muted-foreground flex-shrink-0">
                          {formatFecha(c.ultimo_mensaje.created_at)}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {c.ultimo_mensaje ? c.ultimo_mensaje.contenido : "Empieza la conversación"}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {c.no_leidos > 0 && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                        {c.no_leidos}
                      </span>
                    )}
                    <button
                      onClick={(e) => handleOcultar(c.id, e)}
                      title="Eliminar conversación"
                      className="text-muted-foreground hover:text-danger transition-colors p-1"
                    >
                      <Trash2 className="h-4 w-4" />
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
