import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  MapPin, Shield, Route, Gauge, Star,
  Calendar, ArrowLeft, Bike, Clock, ChevronRight, Pencil,
  UserPlus, UserCheck, Check, X, MessageCircle
} from "lucide-react";
import { getMe, getToken, apiFetch } from "@/lib/api";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const API_URL = (import.meta.env.VITE_API_URL as string) || "http://localhost:3001";

type FriendStatus = "ninguno" | "pendiente_enviada" | "pendiente_recibida" | "amigos" | "propio" | null;

interface Profile {
  id: string;
  nombre: string;
  apellidos: string;
  username: string;
  avatar_url: string | null;
  zona: string | null;
  verified: boolean;
  online: boolean;
  last_seen: string | null;
  created_at: string;
}

interface Moto {
  marca_modelo: string;
  cilindrada: number;
  tipo: string;
}

interface Ruta {
  id: string;
  nombre: string;
  region: string;
  distancia_km: number;
  duracion_min: number;
  dificultad: string;
  tags: string[];
  rating: number | null;
  num_valoraciones: number;
}

const DIFICULTAD_COLOR: Record<string, string> = {
  facil:      "text-green-400 border-green-400/30 bg-green-400/10",
  media:      "text-amber-400 border-amber-400/30 bg-amber-400/10",
  media_alta: "text-orange-400 border-orange-400/30 bg-orange-400/10",
  alta:       "text-red-400 border-red-400/30 bg-red-400/10",
};

const DIFICULTAD_LABEL: Record<string, string> = {
  facil: "Fácil", media: "Media", media_alta: "Media-Alta", alta: "Alta",
};

function formatDuracion(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h ${m > 0 ? `${m}min` : ""}`.trim() : `${m}min`;
}

export default function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [motos, setMotos] = useState<Moto[]>([]);
  const [rutas, setRutas] = useState<Ruta[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isOwn, setIsOwn] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [friendStatus, setFriendStatus] = useState<FriendStatus>(null);
  const [friendRequestId, setFriendRequestId] = useState<string | null>(null);
  const [friendLoading, setFriendLoading] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [friendCount, setFriendCount] = useState(0);

  useEffect(() => {
    if (!username) return;
    async function load() {
      const res = await fetch(`${API_URL}/usuarios/${username}`);
      if (!res.ok) { setNotFound(true); setLoading(false); return; }
      const p = await res.json();
      setProfile(p);
      setMotos(p.motos ?? []);

      const me = getMe();
      const token = getToken();
      setIsOwn(me?.id === p.id);
      setLoggedIn(!!me);

      if (me && me.id !== p.id && token) {
        fetch(`${API_URL}/amistad/estado/${username}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
          .then(r => r.ok ? r.json() : null)
          .then(d => {
            if (!d) return;
            setFriendStatus(d.estado);
            setFriendRequestId(d.id ?? null);
          })
          .catch(() => {});
      }

      fetch(`${API_URL}/amistad/amigos/${username}/count`)
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d) setFriendCount(d.count); })
        .catch(() => {});

      const rutasRes = await fetch(`${API_URL}/rutas?username=${encodeURIComponent(username!)}`);
      if (rutasRes.ok) setRutas(await rutasRes.json());
      setLoading(false);
    }
    load();
  }, [username]);

  async function handleEnviarSolicitud() {
    const token = getToken();
    if (!token || !username) return;
    setFriendLoading(true);
    const res = await fetch(`${API_URL}/amistad/${username}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const d = await res.json();
      setFriendStatus(d.estado === "aceptada" ? "amigos" : "pendiente_enviada");
      setFriendRequestId(d.id);
    }
    setFriendLoading(false);
  }

  async function handleAceptarSolicitud() {
    if (!friendRequestId) return;
    const token = getToken();
    if (!token) return;
    setFriendLoading(true);
    const res = await fetch(`${API_URL}/amistad/${friendRequestId}/aceptar`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setFriendStatus("amigos");
    setFriendLoading(false);
  }

  async function handleRechazarSolicitud() {
    if (!friendRequestId) return;
    const token = getToken();
    if (!token) return;
    setFriendLoading(true);
    const res = await fetch(`${API_URL}/amistad/${friendRequestId}/rechazar`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) { setFriendStatus("ninguno"); setFriendRequestId(null); }
    setFriendLoading(false);
  }

  async function handleEliminarRelacion() {
    if (!friendRequestId) return;
    const token = getToken();
    if (!token) return;
    setFriendLoading(true);
    const res = await fetch(`${API_URL}/amistad/${friendRequestId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) { setFriendStatus("ninguno"); setFriendRequestId(null); }
    setFriendLoading(false);
  }

  async function handleAbrirChat() {
    const token = getToken();
    if (!token || !username) return;
    setChatLoading(true);
    const res = await fetch(`${API_URL}/chat/${username}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const { id } = await res.json();
      navigate(`/chats/${id}`);
    }
    setChatLoading(false);
  }

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>
  );

  if (notFound) return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
      <p className="font-display text-4xl text-foreground">USUARIO NO ENCONTRADO</p>
      <button onClick={() => navigate("/")} className="text-primary hover:underline text-sm font-semibold">
        Volver al inicio
      </button>
    </div>
  );

  const motoP = motos.find(m => true) ?? motos[0];
  const initials = profile
    ? `${profile.nombre.charAt(0)}${profile.apellidos.charAt(0)}`.toUpperCase()
    : "?";

  function FriendButtons({ full }: { full?: boolean }) {
    if (!loggedIn || isOwn || friendStatus === null || friendStatus === "propio") return null;

    const base = `flex items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold transition-all disabled:opacity-50 ${full ? "w-full" : ""}`;

    if (friendStatus === "ninguno") {
      return (
        <button onClick={handleEnviarSolicitud} disabled={friendLoading} className={`${base} border-primary/40 bg-primary/10 text-primary hover:bg-primary/20`}>
          <UserPlus className="h-4 w-4" /> Enviar solicitud
        </button>
      );
    }

    if (friendStatus === "pendiente_enviada") {
      return (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button disabled={friendLoading} className={`${base} border-border bg-surface-3 text-muted-foreground hover:border-danger/50 hover:text-danger`}>
              <X className="h-4 w-4" /> Cancelar solicitud
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent className="bg-card border-border">
            <AlertDialogHeader>
              <AlertDialogTitle className="font-display text-xl text-foreground">
                ¿Estás seguro que quieres eliminar amistad con {profile?.nombre} {profile?.apellidos}?
              </AlertDialogTitle>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-border text-foreground hover:bg-surface-3">
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleEliminarRelacion}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      );
    }

    if (friendStatus === "pendiente_recibida") {
      return (
        <div className={`flex gap-2 ${full ? "w-full" : ""}`}>
          <button onClick={handleAceptarSolicitud} disabled={friendLoading} className={`${base} flex-1 border-success/40 bg-success/10 text-success hover:bg-success/20`}>
            <Check className="h-4 w-4" /> Aceptar
          </button>
          <button onClick={handleRechazarSolicitud} disabled={friendLoading} className={`${base} flex-1 border-border bg-surface-3 text-muted-foreground hover:border-danger/50 hover:text-danger`}>
            <X className="h-4 w-4" /> Rechazar
          </button>
        </div>
      );
    }

    return (
      <div className={`flex gap-2 ${full ? "w-full" : ""}`}>
        <button onClick={handleAbrirChat} disabled={chatLoading} className={`${base} flex-1 border-primary/40 bg-primary/10 text-primary hover:bg-primary/20`}>
          <MessageCircle className="h-4 w-4" /> Mensaje
        </button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button disabled={friendLoading} className={`${base} flex-1 border-success/40 bg-success/10 text-success hover:border-danger/50 hover:bg-danger/10 hover:text-danger`}>
              <UserCheck className="h-4 w-4" /> Amigos
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent className="bg-card border-border">
            <AlertDialogHeader>
              <AlertDialogTitle className="font-display text-xl text-foreground">
                ¿Estás seguro que quieres eliminar amistad con {profile?.nombre} {profile?.apellidos}?
              </AlertDialogTitle>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-border text-foreground hover:bg-surface-3">
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleEliminarRelacion}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Back */}
      <div className="fixed top-4 left-4 z-50">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 rounded-full border border-border bg-background/80 backdrop-blur-md px-3 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Volver
        </button>
      </div>

      {/* Hero banner */}
      <div className="relative h-48 sm:h-72 overflow-hidden">
        <img
          src="/src/assets/hero-moto.jpg"
          alt="banner"
          className="h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/20 to-background" />
      </div>

      {/* Profile card */}
      <div className="mx-auto max-w-4xl px-4">
        <div className="-mt-16 sm:-mt-20 relative z-10">
          <div className="card-surface rounded-2xl p-5 sm:p-8">
            <div className="flex flex-col sm:flex-row gap-5 sm:gap-8 items-start">
              {/* Avatar */}
              <div className="relative shrink-0">
                <div className="h-24 w-24 sm:h-32 sm:w-32 rounded-2xl border-4 border-primary overflow-hidden bg-surface-3 flex items-center justify-center">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt={username} className="h-full w-full object-cover" />
                  ) : (
                    <span className="font-display text-3xl sm:text-4xl text-primary">{initials}</span>
                  )}
                </div>
                {profile?.online && (
                  <span className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-green-500 border-4 border-card" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h1 className="font-display text-3xl sm:text-4xl text-foreground leading-none">
                    {profile?.nombre} {profile?.apellidos}
                  </h1>
                  {profile?.verified && (
                    <Shield className="h-5 w-5 text-primary shrink-0" />
                  )}
                </div>

                <p className="text-primary font-semibold text-lg mb-3">@{profile?.username}</p>

                <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                  {profile?.zona && (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="h-4 w-4 text-primary" />
                      {profile.zona}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 text-primary" />
                    Desde {new Date(profile!.created_at).toLocaleDateString("es-ES", { month: "long", year: "numeric" })}
                  </span>
                  <span className={`flex items-center gap-1.5 ${profile?.online ? "text-green-400" : "text-muted-foreground"}`}>
                    <span className={`h-2 w-2 rounded-full ${profile?.online ? "bg-green-400" : "bg-muted-foreground"}`} />
                    {profile?.online ? "En línea" : "Desconectado"}
                  </span>
                </div>
              </div>

              {/* Editar perfil (solo el dueño) */}
              {isOwn && (
                <button
                  onClick={() => navigate("/perfil/editar")}
                  className="hidden sm:flex items-center gap-2 rounded-md border border-border bg-surface-3 px-4 py-2 text-sm font-semibold text-muted-foreground hover:border-primary/50 hover:text-primary transition-all shrink-0"
                >
                  <Pencil className="h-4 w-4" /> Editar perfil
                </button>
              )}

              {/* Solicitud de amistad (otros perfiles) */}
              {!isOwn && (
                <div className="hidden sm:block shrink-0">
                  <FriendButtons />
                </div>
              )}

              {/* Stats */}
              <div className="flex sm:flex-col gap-4 sm:gap-3 shrink-0">
                <div className="text-center">
                  <p className="font-display text-3xl text-primary leading-none">{rutas.length}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 uppercase tracking-wider">Rutas</p>
                </div>
                <div className="text-center">
                  <p className="font-display text-3xl text-primary leading-none">
                    {motos.length}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 uppercase tracking-wider">Motos</p>
                </div>
                <button
                  onClick={() => navigate(`/perfil/${username}/amigos`)}
                  className="text-center hover:opacity-80 transition-opacity"
                >
                  <p className="font-display text-3xl text-primary leading-none">{friendCount}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 uppercase tracking-wider">Amigos</p>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Editar perfil móvil */}
        {isOwn && (
          <div className="mt-4 sm:hidden">
            <button
              onClick={() => navigate("/perfil/editar")}
              className="w-full flex items-center justify-center gap-2 rounded-md border border-border bg-surface-3 px-4 py-2.5 text-sm font-semibold text-muted-foreground hover:border-primary/50 hover:text-primary transition-all"
            >
              <Pencil className="h-4 w-4" /> Editar perfil
            </button>
          </div>
        )}

        {/* Solicitud de amistad móvil */}
        {!isOwn && (
          <div className="mt-4 sm:hidden">
            <FriendButtons full />
          </div>
        )}

        {/* Body */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6 pb-16">
          {/* Left column */}
          <div className="space-y-4">
            {/* Moto card */}
            {motoP && (
              <div className="card-surface rounded-xl p-5">
                <p className="text-xs font-bold uppercase tracking-widest text-primary mb-4 flex items-center gap-2">
                  <Bike className="h-4 w-4" /> Su moto
                </p>
                <div className="space-y-3">
                  {motos.map((m, i) => (
                    <div key={i} className="surface-3 rounded-lg p-3 stripe-border">
                      <p className="font-bold text-foreground text-sm">{m.marca_modelo}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Gauge className="h-3 w-3" /> {m.cilindrada} cc
                        </span>
                        <span className="text-muted-foreground/30">·</span>
                        <span className="text-xs text-muted-foreground capitalize">{m.tipo}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Rating summary */}
            {rutas.length > 0 && (() => {
              const totalValoraciones = rutas.reduce((s, r) => s + r.num_valoraciones, 0);
              if (totalValoraciones === 0) return null;
              const avg = (
                rutas.reduce((s, r) => s + (r.rating ?? 0) * r.num_valoraciones, 0) / totalValoraciones
              ).toFixed(1);
              return (
                <div className="card-surface rounded-xl p-5 flex items-center gap-4">
                  <div className="h-14 w-14 rounded-xl bg-amber-400/10 border border-amber-400/20 flex flex-col items-center justify-center shrink-0">
                    <Star className="h-5 w-5 text-amber-400" />
                    <p className="font-display text-lg text-amber-400 leading-none mt-0.5">{avg}</p>
                  </div>
                  <div>
                    <p className="font-bold text-foreground text-sm">Valoración media</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Basada en {totalValoraciones} valoracion{totalValoraciones !== 1 ? "es" : ""}
                    </p>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Right column — rutas */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                <Route className="h-4 w-4" /> Rutas publicadas
              </p>
              <span className="text-xs text-muted-foreground">{rutas.length} ruta{rutas.length !== 1 ? "s" : ""}</span>
            </div>

            {rutas.length === 0 ? (
              <div className="card-surface rounded-xl p-10 text-center">
                <Route className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">Todavía no ha publicado ninguna ruta</p>
              </div>
            ) : (
              <div className="space-y-3">
                {rutas.map((ruta) => {
                  const rating = ruta.rating != null ? ruta.rating.toFixed(1) : null;
                  return (
                    <div
                      key={ruta.id}
                      onClick={() => navigate(`/rutas/${ruta.id}`)}
                      className="card-surface rounded-xl p-4 hover:border-primary/30 transition-all group cursor-pointer"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h3 className="font-display text-lg text-foreground group-hover:text-primary transition-colors leading-none">
                              {ruta.nombre}
                            </h3>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${DIFICULTAD_COLOR[ruta.dificultad] ?? ""}`}>
                              {DIFICULTAD_LABEL[ruta.dificultad] ?? ruta.dificultad}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mb-3">
                            <MapPin className="h-3 w-3" /> {ruta.region}
                          </p>
                          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1.5">
                              <Route className="h-3.5 w-3.5 text-primary" />
                              {ruta.distancia_km} km
                            </span>
                            <span className="flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5 text-primary" />
                              {formatDuracion(ruta.duracion_min)}
                            </span>
                            {rating && (
                              <span className="flex items-center gap-1.5">
                                <Star className="h-3.5 w-3.5 text-amber-400" />
                                {rating}
                              </span>
                            )}
                          </div>
                          {ruta.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-3">
                              {ruta.tags.map(tag => (
                                <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-surface-3 border border-border text-muted-foreground">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0 mt-1" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
