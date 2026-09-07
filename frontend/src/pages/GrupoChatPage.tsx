import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Send, Users } from "lucide-react";
import { getMe, getToken, getGrupo, getMensajesGrupo, enviarMensajeGrupo, type MensajeGrupo } from "@/lib/api";
import { Spinner } from "@/components/ui/spinner";

const POLL_INTERVAL_MS = 2000;

export default function GrupoChatPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [mensajes, setMensajes] = useState<MensajeGrupo[]>([]);
  const [nombreGrupo, setNombreGrupo] = useState<string>("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [texto, setTexto] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchMensajes = useCallback(async (token: string) => {
    if (!id) return;
    const data = await getMensajesGrupo(id, token);
    setMensajes(prev => {
      if (prev.length === data.length && prev.every((m, i) => m.id === data[i].id)) return prev;
      return data;
    });
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const me = getMe();
    const token = getToken();
    if (!me || !token) { navigate("/entrar"); return; }
    setCurrentUserId(me.id);

    async function load() {
      const { status, data: grupo } = await getGrupo(id!, token!);
      if (status === 403 || status === 404) { setForbidden(true); setLoading(false); return; }
      if (grupo) setNombreGrupo(grupo.nombre);

      setMensajes(await getMensajesGrupo(id!, token!));
      setLoading(false);

      pollingRef.current = setInterval(() => fetchMensajes(token!), POLL_INTERVAL_MS);
    }

    load();

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [id, navigate, fetchMensajes]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes]);

  async function handleEnviar(e: React.FormEvent) {
    e.preventDefault();
    const contenido = texto.trim();
    if (!contenido || sending || !id) return;
    const token = getToken();
    if (!token) return;

    setSending(true);
    setTexto("");

    const mensaje = await enviarMensajeGrupo(id, contenido, token);
    if (mensaje) {
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

  if (forbidden) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3">
        <p className="text-muted-foreground text-sm">No perteneces a este grupo</p>
        <button onClick={() => navigate("/grupos")} className="text-sm text-primary hover:underline">Volver a mis grupos</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(`/grupos/${id}`)} className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
              <Users className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0 text-left">
              <p className="font-bold text-foreground text-sm truncate">{nombreGrupo}</p>
              <p className="text-xs text-muted-foreground truncate">Chat de grupo</p>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto pt-20 pb-24 px-4">
        <div className="mx-auto max-w-2xl space-y-2">
          {mensajes.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-16">Empieza la conversación del grupo</p>
          ) : (
            mensajes.map((m) => {
              const propio = m.emisor_id === currentUserId;
              return (
                <div key={m.id} className={`flex ${propio ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[75%] rounded-xl px-3 py-2 text-sm ${propio ? "bg-primary text-primary-foreground" : "card-surface text-foreground"}`}>
                    {!propio && (
                      <p className="text-[11px] font-bold text-primary mb-0.5">{m.emisor.nombre} {m.emisor.apellidos}</p>
                    )}
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
