import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Users, Plus, Crown, Route, Check, X, Mail, Globe } from "lucide-react";
import { getToken, getMisGrupos, getInvitacionesGrupo, aceptarInvitacionGrupo, rechazarInvitacionGrupo, type Grupo, type InvitacionGrupo } from "@/lib/api";
import { Spinner } from "@/components/ui/spinner";
import Navbar from "@/components/Navbar";

export default function GruposPage() {
  const navigate = useNavigate();
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [invitaciones, setInvitaciones] = useState<InvitacionGrupo[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  async function load() {
    const token = getToken();
    if (!token) { navigate("/entrar"); return; }
    const [g, i] = await Promise.all([getMisGrupos(token), getInvitacionesGrupo(token)]);
    setGrupos(g);
    setInvitaciones(i);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleAceptar(id: string) {
    const token = getToken();
    if (!token) return;
    setProcessingIds(prev => new Set(prev).add(id));
    const ok = await aceptarInvitacionGrupo(id, token);
    if (ok) { setInvitaciones(prev => prev.filter(inv => inv.id !== id)); load(); }
    setProcessingIds(prev => { const next = new Set(prev); next.delete(id); return next; });
  }

  async function handleRechazar(id: string) {
    const token = getToken();
    if (!token) return;
    setProcessingIds(prev => new Set(prev).add(id));
    const ok = await rechazarInvitacionGrupo(id, token);
    if (ok) setInvitaciones(prev => prev.filter(inv => inv.id !== id));
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

        <div className="flex items-center justify-between mb-8 gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-primary mb-2">Comunidad</p>
            <h1 className="font-display text-4xl sm:text-5xl text-foreground">
              MIS GRUPOS
            </h1>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => navigate("/grupos/publicos")}
              className="flex items-center gap-2 rounded-md border border-border bg-surface-3 px-4 py-2.5 text-sm font-bold uppercase tracking-wider text-foreground transition-all hover:border-primary/40 hover:text-primary"
            >
              <Globe className="h-4 w-4" /> Grupos públicos
            </button>
            <button
              onClick={() => navigate("/grupos/crear")}
              className="flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-bold uppercase tracking-wider text-primary-foreground transition-all hover:opacity-90"
            >
              <Plus className="h-4 w-4" /> Crear
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        ) : (
          <>
            {invitaciones.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5" /> Invitaciones recibidas
                </h2>
                <div className="space-y-3">
                  {invitaciones.map((inv) => {
                    const processing = processingIds.has(inv.id);
                    return (
                      <div key={inv.id} className="card-surface rounded-xl p-4 flex items-center gap-4">
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-foreground text-sm truncate">{inv.grupo.nombre}</p>
                          <p className="text-xs text-muted-foreground truncate">Invitado por @{inv.emisor.username}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={() => handleAceptar(inv.id)}
                            disabled={processing}
                            title="Aceptar"
                            className="flex items-center gap-1 rounded-md border border-success/40 bg-success/10 px-3 py-2 text-xs font-bold text-success hover:bg-success/20 transition-all disabled:opacity-50"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleRechazar(inv.id)}
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
              </div>
            )}

            {grupos.length === 0 ? (
              <div className="card-surface rounded-xl p-10 text-center">
                <Users className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">Todavía no perteneces a ningún grupo</p>
              </div>
            ) : (
              <div className="space-y-3">
                {grupos.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => navigate(`/grupos/${g.id}`)}
                    className="card-surface rounded-xl p-4 flex items-center gap-4 w-full text-left hover:border-primary/30 transition-all"
                  >
                    <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="font-bold text-foreground text-sm truncate">{g.nombre}</p>
                        {g.rol === 'lider' && <Crown className="h-3.5 w-3.5 text-primary flex-shrink-0" />}
                      </div>
                      {g.ruta ? (
                        <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                          <Route className="h-3 w-3" /> {g.ruta.nombre}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground/60 truncate">Sin ruta vinculada</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
