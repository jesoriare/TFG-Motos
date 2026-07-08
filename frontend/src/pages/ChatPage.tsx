import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Send } from "lucide-react";
import { getMe, getToken } from "@/lib/api";
import { Spinner } from "@/components/ui/spinner";

const API_URL = (import.meta.env.VITE_API_URL as string) || "http://localhost:3001";

interface Mensaje {
  id: string;
  conversacion_id: string;
  emisor_id: string;
  contenido: string;
  created_at: string;
  leido: boolean;
}

interface Interlocutor {
  id: string;
  username: string;
  nombre: string;
  apellidos: string;
  avatar_url: string | null;
  online: boolean;
}

export default function ChatPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [interlocutor, setInterlocutor] = useState<Interlocutor | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [texto, setTexto] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchMensajes = useCallback(async (token: string) => {
    const res = await fetch(`${API_URL}/chat/${id}/mensajes`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) {
      const data: Mensaje[] = await res.json();
      setMensajes(prev => {
        if (prev.length === data.length && prev.every((m, i) => m.id === data[i].id)) return prev;
        return data;
      });
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;

    const me = getMe();
    const token = getToken();
    if (!me || !token) { navigate("/entrar"); return; }
    setCurrentUserId(me.id);

    async function load() {
      const [listRes, mensajesRes] = await Promise.all([
        fetch(`${API_URL}/chat`, { headers: { Authorization: `Bearer ${token!}` } }),
        fetch(`${API_URL}/chat/${id}/mensajes`, { headers: { Authorization: `Bearer ${token!}` } }),
      ]);

      if (listRes.ok) {
        const list = await listRes.json();
        const conv = list.find((c: { id: string; usuario: Interlocutor }) => c.id === id);
        if (conv) setInterlocutor(conv.usuario);
      }

      if (mensajesRes.status === 403 || mensajesRes.status === 404) { navigate("/chats"); return; }
      if (mensajesRes.ok) setMensajes(await mensajesRes.json());

      setLoading(false);

      // Marcar conversación como abierta
      fetch(`${API_URL}/chat/abierto`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token!}` },
        body: JSON.stringify({ conversacionId: id }),
      });

      // Polling cada 2 segundos para nuevos mensajes
      pollingRef.current = setInterval(() => fetchMensajes(token!), 2000);
    }

    load();

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      const t = getToken();
      if (!t) return;
      fetch(`${API_URL}/chat/abierto`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
        body: JSON.stringify({ conversacionId: null }),
      });
    };
  }, [id, navigate, fetchMensajes]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes]);

  async function handleEnviar(e: React.FormEvent) {
    e.preventDefault();
    const contenido = texto.trim();
    if (!contenido || sending) return;
    const token = getToken();
    if (!token) return;

    setSending(true);
    setTexto("");

    const res = await fetch(`${API_URL}/chat/${id}/mensajes`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ contenido }),
    });
    if (res.ok) {
      const mensaje = await res.json();
      setMensajes(prev => prev.some(m => m.id === mensaje.id) ? prev : [...prev, mensaje]);
    }
    setSending(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  const initials = interlocutor
    ? `${interlocutor.nombre.charAt(0)}${interlocutor.apellidos?.charAt(0) ?? ""}`.toUpperCase()
    : "?";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <button onClick={() => navigate("/chats")} className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </button>

          {interlocutor && (
            <button onClick={() => navigate(`/perfil/${interlocutor.username}`)} className="flex items-center gap-3 min-w-0">
              <div className="relative h-10 w-10 rounded-xl overflow-hidden bg-primary/20 flex items-center justify-center text-sm font-display font-bold text-primary flex-shrink-0">
                {interlocutor.avatar_url
                  ? <img src={interlocutor.avatar_url} alt={interlocutor.username} className="h-full w-full object-cover" />
                  : initials
                }
                {interlocutor.online && (
                  <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-card" />
                )}
              </div>
              <div className="min-w-0 text-left">
                <p className="font-bold text-foreground text-sm truncate">{interlocutor.nombre} {interlocutor.apellidos}</p>
                <p className="text-xs text-muted-foreground truncate">@{interlocutor.username}</p>
              </div>
            </button>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto pt-20 pb-24 px-4">
        <div className="mx-auto max-w-2xl space-y-2">
          {mensajes.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-16">Empieza la conversación</p>
          ) : (
            mensajes.map((m) => {
              const propio = m.emisor_id === currentUserId;
              return (
                <div key={m.id} className={`flex ${propio ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[75%] rounded-xl px-3 py-2 text-sm ${propio ? "bg-primary text-primary-foreground" : "card-surface text-foreground"}`}>
                    <p className="whitespace-pre-wrap break-words">{m.contenido}</p>
                    <p className={`text-[10px] mt-1 ${propio ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                      {new Date(m.created_at).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      <form onSubmit={handleEnviar} className="fixed bottom-0 left-0 right-0 border-t border-border/50 bg-background/95 backdrop-blur-md px-4 py-3">
        <div className="mx-auto max-w-2xl flex items-center gap-2">
          <input
            type="text" value={texto} onChange={(e) => setTexto(e.target.value)}
            placeholder="Escribe un mensaje..."
            className="flex-1 rounded-lg border border-border surface-2 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50"
          />
          <button type="submit" disabled={!texto.trim() || sending}
            className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary text-primary-foreground disabled:opacity-50 hover:opacity-90 transition-opacity flex-shrink-0">
            <Send className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
