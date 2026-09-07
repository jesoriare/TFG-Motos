import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Users, Crown, Route as RouteIcon, Shield, UserPlus, UserMinus, LogOut, Trash2, Lock, Globe, Pencil, MessageCircle } from "lucide-react";
import {
  getToken, getMe, getGrupo, expulsarMiembroGrupo, invitarAGrupo, salirDeGrupo, eliminarGrupo, editarGrupo,
  type GrupoDetalle,
} from "@/lib/api";
import { Spinner } from "@/components/ui/spinner";
import Navbar from "@/components/Navbar";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const API_URL = (import.meta.env.VITE_API_URL as string) || "http://localhost:3001";

interface RutaPropia {
  id: string;
  nombre: string;
  region: string;
}

export default function GrupoDetallePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const me = getMe();
  const [grupo, setGrupo] = useState<GrupoDetalle | null>(null);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [inviteUsername, setInviteUsername] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteMsg, setInviteMsg] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  const [editMode, setEditMode] = useState(false);
  const [editNombre, setEditNombre] = useState("");
  const [editDescripcion, setEditDescripcion] = useState("");
  const [editPrivacidad, setEditPrivacidad] = useState<"privado" | "publico">("privado");
  const [editRutaId, setEditRutaId] = useState("");
  const [editRutas, setEditRutas] = useState<RutaPropia[]>([]);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  async function load() {
    if (!id) return;
    const token = getToken();
    if (!token) { navigate("/entrar"); return; }
    const { status, data } = await getGrupo(id, token);
    if (status === 403) { setForbidden(true); setLoading(false); return; }
    if (status === 404) { setNotFound(true); setLoading(false); return; }
    setGrupo(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, [id]);

  const esLider = !!(grupo && me && grupo.lider_id === me.id);

  function openEdit() {
    if (!grupo) return;
    setEditNombre(grupo.nombre);
    setEditDescripcion(grupo.descripcion ?? "");
    setEditPrivacidad(grupo.privacidad);
    setEditRutaId(grupo.ruta_id ?? "");
    setEditError(null);
    setEditMode(true);
    if (me) {
      fetch(`${API_URL}/rutas?username=${me.username}`)
        .then(res => res.ok ? res.json() : [])
        .then(setEditRutas)
        .catch(() => setEditRutas([]));
    }
  }

  async function handleGuardarEdicion(e: React.FormEvent) {
    e.preventDefault();
    if (!id || !editNombre.trim()) return;
    const token = getToken();
    if (!token) return;
    setEditLoading(true);
    setEditError(null);
    const { data, error } = await editarGrupo(
      id, { nombre: editNombre.trim(), descripcion: editDescripcion.trim() || null, privacidad: editPrivacidad, ruta_id: editRutaId || null },
      token
    );
    setEditLoading(false);
    if (error) { setEditError(error); return; }
    setGrupo(prev => prev ? { ...prev, ...data } : prev);
    setEditMode(false);
  }

  async function handleExpulsar(userId: string) {
    if (!id) return;
    const token = getToken();
    if (!token) return;
    setProcessingIds(prev => new Set(prev).add(userId));
    const ok = await expulsarMiembroGrupo(id, userId, token);
    if (ok) setGrupo(prev => prev ? { ...prev, miembros: prev.miembros.filter(m => m.id !== userId) } : prev);
    setProcessingIds(prev => { const next = new Set(prev); next.delete(userId); return next; });
  }

  async function handleInvitar(e: React.FormEvent) {
    e.preventDefault();
    if (!id || !inviteUsername.trim()) return;
    const token = getToken();
    if (!token) return;
    setInviteLoading(true);
    setInviteMsg(null);
    const { error } = await invitarAGrupo(id, inviteUsername.trim(), token);
    setInviteLoading(false);
    if (error) { setInviteMsg({ type: "error", text: error }); return; }
    setInviteMsg({ type: "ok", text: `Invitación enviada a @${inviteUsername.trim()}` });
    setInviteUsername("");
  }

  async function handleSalir() {
    if (!id) return;
    const token = getToken();
    if (!token) return;
    const ok = await salirDeGrupo(id, token);
    if (ok) navigate("/grupos");
  }

  async function handleEliminar() {
    if (!id) return;
    const token = getToken();
    if (!token) return;
    const ok = await eliminarGrupo(id, token);
    if (ok) navigate("/grupos");
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

        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        ) : forbidden ? (
          <div className="card-surface rounded-xl p-10 text-center">
            <Lock className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">No perteneces a este grupo</p>
          </div>
        ) : notFound || !grupo ? (
          <div className="card-surface rounded-xl p-10 text-center">
            <p className="text-muted-foreground text-sm">Grupo no encontrado</p>
          </div>
        ) : (
          <>
            {editMode ? (
              <form onSubmit={handleGuardarEdicion} className="card-surface rounded-xl p-4 space-y-4">
                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">Nombre del grupo</label>
                  <input
                    type="text"
                    value={editNombre}
                    onChange={(e) => setEditNombre(e.target.value)}
                    required
                    className="w-full rounded-md border border-border bg-surface-3 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">Descripción</label>
                  <textarea
                    value={editDescripcion}
                    onChange={(e) => setEditDescripcion(e.target.value)}
                    rows={3}
                    className="w-full rounded-md border border-border bg-surface-3 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">Privacidad</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setEditPrivacidad("privado")}
                      className={`flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold transition-all ${
                        editPrivacidad === "privado" ? "border-primary bg-primary/10 text-primary" : "border-border bg-surface-3 text-muted-foreground"
                      }`}
                    >
                      <Lock className="h-4 w-4" /> Privado
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditPrivacidad("publico")}
                      className={`flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold transition-all ${
                        editPrivacidad === "publico" ? "border-primary bg-primary/10 text-primary" : "border-border bg-surface-3 text-muted-foreground"
                      }`}
                    >
                      <Globe className="h-4 w-4" /> Público
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">Ruta vinculada</label>
                  <select
                    value={editRutaId}
                    onChange={(e) => setEditRutaId(e.target.value)}
                    className="w-full rounded-md border border-border bg-surface-3 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">Sin ruta</option>
                    {editRutas.map((r) => (
                      <option key={r.id} value={r.id}>{r.nombre} — {r.region}</option>
                    ))}
                  </select>
                </div>
                {editError && <p className="text-sm text-danger">{editError}</p>}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditMode(false)}
                    className="flex-1 rounded-md border border-border bg-surface-3 py-2.5 text-sm font-bold text-foreground hover:bg-surface-2 transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={editLoading || !editNombre.trim()}
                    className="flex-1 rounded-md bg-primary py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-all"
                  >
                    {editLoading ? "Guardando..." : "Guardar cambios"}
                  </button>
                </div>
              </form>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h1 className="font-display text-3xl text-foreground truncate flex items-center gap-2">
                        {grupo.nombre}
                        {esLider && <Crown className="h-5 w-5 text-primary flex-shrink-0" />}
                      </h1>
                      {esLider && (
                        <button
                          onClick={openEdit}
                          title="Editar grupo"
                          className="flex-shrink-0 rounded-md p-1.5 text-muted-foreground hover:text-primary hover:bg-surface-3 transition-all"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      {grupo.ruta ? (
                        <button
                          onClick={() => navigate(`/rutas/${grupo.ruta!.id}`)}
                          className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
                        >
                          <RouteIcon className="h-3 w-3" /> {grupo.ruta.nombre} — {grupo.ruta.region}
                        </button>
                      ) : (
                        <p className="text-xs text-muted-foreground/60">Sin ruta vinculada</p>
                      )}
                      <span className="text-xs text-muted-foreground/60 flex items-center gap-1">
                        {grupo.privacidad === "publico" ? <Globe className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                        {grupo.privacidad === "publico" ? "Público" : "Privado"}
                      </span>
                    </div>
                  </div>
                </div>

                {grupo.descripcion && (
                  <p className="text-sm text-muted-foreground mb-4 whitespace-pre-wrap">{grupo.descripcion}</p>
                )}

                <button
                  onClick={() => navigate(`/grupos/${id}/chat`)}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 mt-2 text-sm font-bold text-primary-foreground hover:opacity-90 transition-all"
                >
                  <MessageCircle className="h-4 w-4" /> Chat del grupo
                </button>
              </>
            )}

            {esLider && (
              <div className="card-surface rounded-xl p-4 mt-6 mb-6">
                <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                  <UserPlus className="h-3.5 w-3.5" /> Invitar amigo
                </h2>
                <form onSubmit={handleInvitar} className="flex gap-2">
                  <input
                    type="text"
                    value={inviteUsername}
                    onChange={(e) => setInviteUsername(e.target.value)}
                    placeholder="username"
                    className="flex-1 rounded-md border border-border bg-surface-3 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <button
                    type="submit"
                    disabled={inviteLoading || !inviteUsername.trim()}
                    className="rounded-md bg-primary px-4 py-2 text-xs font-bold uppercase tracking-wider text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-all"
                  >
                    Invitar
                  </button>
                </form>
                {inviteMsg && (
                  <p className={`text-xs mt-2 ${inviteMsg.type === "ok" ? "text-success" : "text-danger"}`}>{inviteMsg.text}</p>
                )}
              </div>
            )}

            <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
              Miembros ({grupo.miembros.length})
            </h2>
            <div className="space-y-3 mb-8">
              {grupo.miembros.map((m) => {
                const initials = `${m.nombre.charAt(0)}${m.apellidos?.charAt(0) ?? ""}`.toUpperCase();
                const esLiderMiembro = m.id === grupo.lider_id;
                const processing = processingIds.has(m.id);
                return (
                  <div key={m.id} className="card-surface rounded-xl p-4 flex items-center gap-4">
                    <button
                      onClick={() => navigate(`/perfil/${m.username}`)}
                      className="relative h-12 w-12 rounded-xl overflow-hidden bg-primary/20 flex items-center justify-center text-sm font-display font-bold text-primary flex-shrink-0"
                    >
                      {m.avatar_url ? <img src={m.avatar_url} alt={m.username} className="h-full w-full object-cover" /> : initials}
                    </button>
                    <div className="min-w-0 flex-1">
                      <button onClick={() => navigate(`/perfil/${m.username}`)} className="flex items-center gap-1.5 hover:text-primary transition-colors">
                        <p className="font-bold text-foreground text-sm truncate">{m.nombre} {m.apellidos}</p>
                        {m.verified && <Shield className="h-3.5 w-3.5 text-primary flex-shrink-0" />}
                        {esLiderMiembro && <Crown className="h-3.5 w-3.5 text-primary flex-shrink-0" />}
                      </button>
                      <p className="text-xs text-muted-foreground truncate">@{m.username}</p>
                    </div>
                    {esLider && !esLiderMiembro && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button
                            disabled={processing}
                            title="Expulsar"
                            className="flex items-center gap-1 rounded-md border border-border bg-surface-3 px-3 py-2 text-xs font-bold text-muted-foreground hover:border-danger/50 hover:text-danger transition-all disabled:opacity-50 flex-shrink-0"
                          >
                            <UserMinus className="h-4 w-4" />
                          </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-card border-border">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="font-display text-xl text-foreground">
                              ¿Expulsar a este usuario?
                            </AlertDialogTitle>
                            <AlertDialogDescription className="text-muted-foreground">
                              @{m.username} dejará de pertenecer al grupo. Podrás volver a invitarle más adelante.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="border-border text-foreground hover:bg-surface-3">Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleExpulsar(m.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Expulsar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                );
              })}
            </div>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button className="flex items-center gap-2 rounded-md border border-danger/40 bg-danger/10 px-4 py-2.5 text-sm font-bold text-danger hover:bg-danger/20 transition-all">
                  {esLider ? <Trash2 className="h-4 w-4" /> : <LogOut className="h-4 w-4" />}
                  {esLider ? "Eliminar grupo" : "Salir del grupo"}
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-card border-border">
                <AlertDialogHeader>
                  <AlertDialogTitle className="font-display text-xl text-foreground">
                    {esLider ? "¿Eliminar este grupo?" : "¿Salir de este grupo?"}
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-muted-foreground">
                    {esLider
                      ? "Se eliminará el grupo y todos sus miembros e invitaciones pendientes. Esta acción no se puede deshacer."
                      : "Dejarás de pertenecer a este grupo. Podrás volver a unirte si te invitan de nuevo."}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="border-border text-foreground hover:bg-surface-3">Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={esLider ? handleEliminar : handleSalir}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {esLider ? "Eliminar" : "Salir"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}
      </div>
    </div>
  );
}
