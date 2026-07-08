import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, MessageCircle, Trash2, Search, X } from "lucide-react";
import { getMe, getToken } from "@/lib/api";
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

interface Amigo {
  id: string;
  username: string;
  nombre: string;
  apellidos: string;
  avatar_url: string | null;
  online: boolean;
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

  // Buscador de amigos
  const [query, setQuery] = useState("");
  const [amigos, setAmigos] = useState<Amigo[]>([]);
  const [resultados, setResultados] = useState<Amigo[]>([]);
  const [buscadorOpen, setBuscadorOpen] = useState(false);
  const [iniciando, setIniciando] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function load() {
    const token = getToken();
    if (!token) { navigate("/entrar"); return; }

    const res = await fetch(`${API_URL}/chat`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setConversaciones(await res.json());
    setLoading(false);
  }

  async function loadAmigos() {
    const me = getMe();
    const token = getToken();
    if (!me || !token) return;

    const res = await fetch(`${API_URL}/amistad/amigos/${me.username}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setAmigos(await res.json());
  }

  useEffect(() => {
    load();
    loadAmigos();
  }, []);

  // Filtrar amigos según el texto buscado
  useEffect(() => {
    const q = query.trim().toLowerCase();
    if (!q) { setResultados([]); return; }
    setResultados(
      amigos.filter(a =>
        a.username.toLowerCase().includes(q) ||
        a.nombre.toLowerCase().includes(q) ||
        a.apellidos.toLowerCase().includes(q)
      )
    );
  }, [query, amigos]);

  async function handleIniciarChat(username: string) {
    const token = getToken();
    if (!token) return;
    setIniciando(username);
    const res = await fetch(`${API_URL}/chat/${username}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const { id } = await res.json();
      navigate(`/chats/${id}`);
    }
    setIniciando(null);
  }

  async function handleOcultar(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    const token = getToken();
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

        <div className="flex items-end justify-between mb-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-primary mb-2">Comunidad</p>
            <h1 className="font-display text-4xl sm:text-5xl text-foreground">MENSAJES</h1>
          </div>
        </div>

        {/* Buscador de amigos */}
        <div className="relative mb-6">
          <div
            className="flex items-center gap-3 rounded-xl border border-border bg-surface-3 px-4 py-3 cursor-text"
            onClick={() => { setBuscadorOpen(true); inputRef.current?.focus(); }}
          >
            <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => { setQuery(e.target.value); setBuscadorOpen(true); }}
              onFocus={() => setBuscadorOpen(true)}
              placeholder="Buscar amigo para chatear..."
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 outline-none"
            />
            {query && (
              <button onClick={() => { setQuery(""); setBuscadorOpen(false); }} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Dropdown de resultados */}
          {buscadorOpen && query.trim() && (
            <div className="absolute top-full left-0 right-0 mt-1 z-50 card-surface rounded-xl border border-border shadow-lg overflow-hidden">
              {resultados.length === 0 ? (
                <p className="px-4 py-3 text-sm text-muted-foreground">No se encontró ningún amigo</p>
              ) : (
                resultados.map(a => {
                  const initials = `${a.nombre.charAt(0)}${a.apellidos?.charAt(0) ?? ""}`.toUpperCase();
                  return (
                    <button
                      key={a.id}
                      onClick={() => handleIniciarChat(a.username)}
                      disabled={iniciando === a.username}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-primary/5 transition-colors text-left border-b border-border/40 last:border-0 disabled:opacity-50"
                    >
                      <div className="relative h-9 w-9 rounded-full overflow-hidden bg-primary/20 flex items-center justify-center text-xs font-display font-bold text-primary flex-shrink-0">
                        {a.avatar_url
                          ? <img src={a.avatar_url} alt={a.username} className="h-full w-full object-cover" />
                          : initials
                        }
                        {a.online && (
                          <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-card" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-foreground truncate">{a.nombre} {a.apellidos}</p>
                        <p className="text-xs text-muted-foreground truncate">@{a.username}</p>
                      </div>
                      <span className="text-xs text-primary font-semibold flex-shrink-0">
                        {iniciando === a.username ? "Abriendo..." : "Chatear →"}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Lista de conversaciones */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        ) : conversaciones.length === 0 ? (
          <div className="card-surface rounded-xl p-10 text-center">
            <MessageCircle className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">No tienes conversaciones todavía</p>
            <p className="text-muted-foreground/60 text-xs mt-1">Busca un amigo arriba para empezar</p>
          </div>
        ) : (
          <div
            className="space-y-3"
            onClick={() => setBuscadorOpen(false)}
          >
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
