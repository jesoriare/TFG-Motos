import { MapPin, Menu, X, User, LogOut, UserPlus, MessageCircle, Users } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getMe, getToken, logout, getNoLeidosGrupo, type AuthUser } from "@/lib/api";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const API_URL = (import.meta.env.VITE_API_URL as string) || "http://localhost:3001";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [solicitudesCount, setSolicitudesCount] = useState(0);
  const [noLeidosCount, setNoLeidosCount] = useState(0);
  const [invitacionesGrupoCount, setInvitacionesGrupoCount] = useState(0);
  const [noLeidosGrupoCount, setNoLeidosGrupoCount] = useState(0);
  const navigate = useNavigate();

  const links = [
    { label: "Mapa",        href: "/#mapa" },
    { label: "Rutas",       href: "/#rutas" },
    { label: "Moteros",     href: "/#moteros" },
    { label: "Incidencias", href: "/#incidencias" },
  ];

  async function syncUser() {
    const me = getMe();
    setUser(me);
    if (me) {
      const token = getToken()!;
      loadSolicitudesCount(token);
      loadNoLeidosCount(token);
      loadInvitacionesGrupoCount(token);
      loadNoLeidosGrupoCount(token);
      // Cargar avatar desde la API
      try {
        const res = await fetch(`${API_URL}/usuarios/${me.username}`);
        if (res.ok) {
          const data = await res.json();
          setAvatarUrl(data.avatar_url ?? null);
        }
      } catch { /* ignorar */ }
    } else {
      setAvatarUrl(null);
      setSolicitudesCount(0);
      setNoLeidosCount(0);
      setInvitacionesGrupoCount(0);
      setNoLeidosGrupoCount(0);
    }
  }

  useEffect(() => {
    syncUser();
    window.addEventListener('auth-change', syncUser);
    return () => window.removeEventListener('auth-change', syncUser);
  }, []);

  async function loadSolicitudesCount(token: string) {
    try {
      const res = await fetch(`${API_URL}/amistad/solicitudes`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setSolicitudesCount((await res.json()).length);
    } catch { /* backend no disponible */ }
  }

  async function loadNoLeidosCount(token: string) {
    try {
      const res = await fetch(`${API_URL}/chat/no-leidos`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setNoLeidosCount((await res.json()).count);
    } catch { /* backend no disponible */ }
  }

  async function loadInvitacionesGrupoCount(token: string) {
    try {
      const res = await fetch(`${API_URL}/grupos/invitaciones`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setInvitacionesGrupoCount((await res.json()).length);
    } catch { /* backend no disponible */ }
  }

  async function loadNoLeidosGrupoCount(token: string) {
    try {
      setNoLeidosGrupoCount(await getNoLeidosGrupo(token));
    } catch { /* backend no disponible */ }
  }

  function handleLogout() {
    logout();
    navigate("/");
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        {/* Logo */}
        <a href="#" className="flex items-center gap-2 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary">
            <MapPin className="h-5 w-5 text-primary-foreground" strokeWidth={2.5} />
          </div>
          <span className="font-display text-2xl tracking-tight text-foreground">RODADA<span className="text-primary">MOTO</span></span>
        </a>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {links.map((l) => (
            <a key={l.label} href={l.href} className="px-4 py-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-primary">
              {l.label}
            </a>
          ))}
        </nav>

        {/* CTA desktop */}
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              <button onClick={() => navigate("/solicitudes")} title="Solicitudes de amistad"
                className="relative h-9 w-9 rounded-full border border-border bg-surface-3 flex items-center justify-center hover:border-primary/50 hover:text-primary transition-colors text-muted-foreground">
                <UserPlus className="h-4 w-4" />
                {solicitudesCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                    {solicitudesCount}
                  </span>
                )}
              </button>

              <button onClick={() => navigate("/chats")} title="Mensajes"
                className="relative h-9 w-9 rounded-full border border-border bg-surface-3 flex items-center justify-center hover:border-primary/50 hover:text-primary transition-colors text-muted-foreground">
                <MessageCircle className="h-4 w-4" />
                {noLeidosCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                    {noLeidosCount}
                  </span>
                )}
              </button>

              <button onClick={() => navigate("/grupos")} title="Mis grupos"
                className="relative h-9 w-9 rounded-full border border-border bg-surface-3 flex items-center justify-center hover:border-primary/50 hover:text-primary transition-colors text-muted-foreground">
                <Users className="h-4 w-4" />
                {(invitacionesGrupoCount + noLeidosGrupoCount) > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                    {invitacionesGrupoCount + noLeidosGrupoCount}
                  </span>
                )}
              </button>

              <div className="flex items-center gap-2">
                <button onClick={() => navigate(`/perfil/${user.username}`)}
                  className="h-9 w-9 rounded-full border-2 border-primary overflow-hidden bg-surface-3 flex items-center justify-center hover:border-primary/70 transition-colors">
                  {avatarUrl
                    ? <img src={avatarUrl} alt={user.username} className="h-full w-full object-cover" />
                    : <User className="h-4 w-4 text-muted-foreground" />}
                </button>
                <button onClick={() => navigate(`/perfil/${user.username}`)}
                  className="text-sm font-semibold text-foreground hover:text-primary transition-colors">
                  @{user.username}
                </button>
              </div>
              <LogoutButton onConfirm={handleLogout} />
            </div>
          ) : (
            <>
              <button onClick={() => navigate("/entrar")} className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">Entrar</button>
              <button onClick={() => navigate("/registro")} className="rounded-md bg-primary px-4 py-2 text-sm font-bold uppercase tracking-wider text-primary-foreground transition-all hover:opacity-90 hover:shadow-[0_0_20px_hsl(25_100%_52%/0.4)] glow-orange">
                Únete gratis
              </button>
            </>
          )}
        </div>

        <button className="md:hidden text-muted-foreground" onClick={() => setOpen(!open)}>
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden surface-1 border-t border-border px-4 pb-4">
          {links.map((l) => (
            <a key={l.label} href={l.href} onClick={() => setOpen(false)}
              className="block py-3 text-sm font-bold uppercase tracking-wider text-muted-foreground hover:text-primary border-b border-border/40 last:border-0">
              {l.label}
            </a>
          ))}

          {user ? (
            <div className="mt-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <button onClick={() => { setOpen(false); navigate(`/perfil/${user.username}`); }}
                  className="flex items-center gap-2 text-sm font-semibold text-foreground hover:text-primary transition-colors">
                  <div className="h-9 w-9 rounded-full border-2 border-primary overflow-hidden bg-surface-3 flex items-center justify-center">
                    {avatarUrl
                      ? <img src={avatarUrl} alt={user.username} className="h-full w-full object-cover" />
                      : <User className="h-4 w-4 text-muted-foreground" />}
                  </div>
                  @{user.username}
                </button>
                <LogoutButton onConfirm={() => { setOpen(false); handleLogout(); }} />
              </div>
              <button onClick={() => { setOpen(false); navigate("/solicitudes"); }}
                className="flex items-center justify-between rounded-md border border-border bg-surface-3 px-4 py-2.5 text-sm font-semibold text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors">
                <span className="flex items-center gap-2"><UserPlus className="h-4 w-4" />Solicitudes de amistad</span>
                {solicitudesCount > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">{solicitudesCount}</span>
                )}
              </button>
              <button onClick={() => { setOpen(false); navigate("/chats"); }}
                className="flex items-center justify-between rounded-md border border-border bg-surface-3 px-4 py-2.5 text-sm font-semibold text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors">
                <span className="flex items-center gap-2"><MessageCircle className="h-4 w-4" />Mensajes</span>
                {noLeidosCount > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">{noLeidosCount}</span>
                )}
              </button>
              <button onClick={() => { setOpen(false); navigate("/grupos"); }}
                className="flex items-center justify-between rounded-md border border-border bg-surface-3 px-4 py-2.5 text-sm font-semibold text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors">
                <span className="flex items-center gap-2"><Users className="h-4 w-4" />Mis grupos</span>
                {(invitacionesGrupoCount + noLeidosGrupoCount) > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">{invitacionesGrupoCount + noLeidosGrupoCount}</span>
                )}
              </button>
            </div>
          ) : (
            <button onClick={() => { setOpen(false); navigate("/registro"); }}
              className="mt-4 w-full rounded-md bg-primary py-2.5 text-sm font-bold uppercase tracking-wider text-primary-foreground">
              Únete gratis
            </button>
          )}
        </div>
      )}
    </header>
  );
}

function LogoutButton({ onConfirm }: { onConfirm: () => void }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-destructive transition-colors">
          <LogOut className="h-4 w-4" /> Salir
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent className="bg-card border-border">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-display text-xl text-foreground">¿Seguro que quieres cerrar sesión?</AlertDialogTitle>
          <AlertDialogDescription className="text-muted-foreground">Tendrás que volver a iniciar sesión para acceder a tu cuenta.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="border-border text-foreground hover:bg-surface-3">Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Cerrar sesión</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
