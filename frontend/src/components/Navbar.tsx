import { MapPin, Menu, X, User, LogOut, UserPlus, MessageCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import type { User as SupabaseUser } from "@supabase/supabase-js";

const API_URL = (import.meta.env.VITE_API_URL as string) || "http://localhost:3001";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [solicitudesCount, setSolicitudesCount] = useState(0);
  const [noLeidosCount, setNoLeidosCount] = useState(0);
  const navigate = useNavigate();

  const links = [
    { label: "Mapa", href: "/#mapa" },
    { label: "Rutas", href: "/#rutas" },
    { label: "Moteros", href: "/#moteros" },
    { label: "Incidencias", href: "/#incidencias" },
  ];

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
        setOnline(session.user.id, true);
        loadSolicitudesCount(session.access_token);
        loadNoLeidosCount(session.access_token);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
        setOnline(session.user.id, true);
        loadSolicitudesCount(session.access_token);
        loadNoLeidosCount(session.access_token);
      } else {
        setAvatarUrl(null);
        setUsername(null);
        setSolicitudesCount(0);
        setNoLeidosCount(0);
      }
    });

    // Marcar offline al cerrar la pestaña
    const handleUnload = () => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) setOnline(session.user.id, false);
      });
    };
    window.addEventListener("beforeunload", handleUnload);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("beforeunload", handleUnload);
    };
  }, []);

  async function setOnline(userId: string, online: boolean) {
    await supabase.from("profiles").update({ online, last_seen: new Date().toISOString() }).eq("id", userId);
  }

  async function loadProfile(userId: string) {
    const { data } = await supabase
      .from("profiles")
      .select("avatar_url, username")
      .eq("id", userId)
      .single();
    if (data) {
      setAvatarUrl(data.avatar_url);
      setUsername(data.username);
    }
  }

  async function loadSolicitudesCount(token: string) {
    try {
      const res = await fetch(`${API_URL}/amistad/solicitudes`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setSolicitudesCount((await res.json()).length);
    } catch { /* backend no disponible */ }
  }

  async function loadNoLeidosCount(token: string) {
    try {
      const res = await fetch(`${API_URL}/chat/no-leidos`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setNoLeidosCount((await res.json()).count);
    } catch { /* backend no disponible */ }
  }

  async function handleLogout() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await supabase.from("profiles").update({ online: false, last_seen: new Date().toISOString() }).eq("id", session.user.id);
    }
    await supabase.auth.signOut();
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
          <span className="font-display text-2xl tracking-tight text-foreground">
            RODADA<span className="text-primary">MOTO</span>
          </span>
        </a>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="px-4 py-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-primary"
            >
              {l.label}
            </a>
          ))}
        </nav>

        {/* CTA desktop */}
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              {/* Solicitudes de amistad */}
              <button
                onClick={() => navigate("/solicitudes")}
                className="relative h-9 w-9 rounded-full border border-border bg-surface-3 flex items-center justify-center hover:border-primary/50 hover:text-primary transition-colors text-muted-foreground"
                title="Solicitudes de amistad"
              >
                <UserPlus className="h-4 w-4" />
                {solicitudesCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                    {solicitudesCount}
                  </span>
                )}
              </button>

              {/* Mensajes */}
              <button
                onClick={() => navigate("/chats")}
                className="relative h-9 w-9 rounded-full border border-border bg-surface-3 flex items-center justify-center hover:border-primary/50 hover:text-primary transition-colors text-muted-foreground"
                title="Mensajes"
              >
                <MessageCircle className="h-4 w-4" />
                {noLeidosCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                    {noLeidosCount}
                  </span>
                )}
              </button>

              {/* Avatar */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate(`/perfil/${username}`)}
                  className="h-9 w-9 rounded-full border-2 border-primary overflow-hidden bg-surface-3 flex items-center justify-center hover:border-primary/70 transition-colors"
                >
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={username ?? "avatar"} className="h-full w-full object-cover" />
                  ) : (
                    <User className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
                {username && (
                  <button
                    onClick={() => navigate(`/perfil/${username}`)}
                    className="text-sm font-semibold text-foreground hover:text-primary transition-colors"
                  >
                    @{username}
                  </button>
                )}
              </div>
              {/* Logout */}
              <LogoutButton onConfirm={handleLogout} />
            </div>
          ) : (
            <>
              <button
                onClick={() => navigate("/entrar")}
                className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
              >
                Entrar
              </button>
              <button
                onClick={() => navigate("/registro")}
                className="rounded-md bg-primary px-4 py-2 text-sm font-bold uppercase tracking-wider text-primary-foreground transition-all hover:opacity-90 hover:shadow-[0_0_20px_hsl(25_100%_52%/0.4)] glow-orange"
              >
                Únete gratis
              </button>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button className="md:hidden text-muted-foreground" onClick={() => setOpen(!open)}>
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden surface-1 border-t border-border px-4 pb-4">
          {links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block py-3 text-sm font-bold uppercase tracking-wider text-muted-foreground hover:text-primary border-b border-border/40 last:border-0"
            >
              {l.label}
            </a>
          ))}

          {user ? (
            <div className="mt-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setOpen(false); navigate(`/perfil/${username}`); }}
                    className="h-9 w-9 rounded-full border-2 border-primary overflow-hidden bg-surface-3 flex items-center justify-center hover:border-primary/70 transition-colors"
                  >
                    {avatarUrl ? (
                      <img src={avatarUrl} alt={username ?? "avatar"} className="h-full w-full object-cover" />
                    ) : (
                      <User className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                  {username && (
                    <button
                      onClick={() => { setOpen(false); navigate(`/perfil/${username}`); }}
                      className="text-sm font-semibold text-foreground hover:text-primary transition-colors"
                    >
                      @{username}
                    </button>
                  )}
                </div>
                <LogoutButton onConfirm={() => { setOpen(false); handleLogout(); }} />
              </div>
              <button
                onClick={() => { setOpen(false); navigate("/solicitudes"); }}
                className="flex items-center justify-between rounded-md border border-border bg-surface-3 px-4 py-2.5 text-sm font-semibold text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
              >
                <span className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4" />
                  Solicitudes de amistad
                </span>
                {solicitudesCount > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                    {solicitudesCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => { setOpen(false); navigate("/chats"); }}
                className="flex items-center justify-between rounded-md border border-border bg-surface-3 px-4 py-2.5 text-sm font-semibold text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
              >
                <span className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4" />
                  Mensajes
                </span>
                {noLeidosCount > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                    {noLeidosCount}
                  </span>
                )}
              </button>
            </div>
          ) : (
            <button
              onClick={() => { setOpen(false); navigate("/registro"); }}
              className="mt-4 w-full rounded-md bg-primary py-2.5 text-sm font-bold uppercase tracking-wider text-primary-foreground"
            >
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
          <LogOut className="h-4 w-4" />
          Salir
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent className="bg-card border-border">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-display text-xl text-foreground">
            ¿Seguro que quieres cerrar sesión?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-muted-foreground">
            Tendrás que volver a iniciar sesión para acceder a tu cuenta.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="border-border text-foreground hover:bg-surface-3">
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Cerrar sesión
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
