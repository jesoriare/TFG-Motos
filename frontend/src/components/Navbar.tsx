import { MapPin, Menu, X, User, LogOut } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import type { User as SupabaseUser } from "@supabase/supabase-js";
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
  const navigate = useNavigate();

  const links = [
    { label: "Mapa", href: "#mapa" },
    { label: "Rutas", href: "#rutas" },
    { label: "Moteros", href: "#moteros" },
    { label: "Incidencias", href: "#incidencias" },
  ];

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) loadProfile(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) loadProfile(session.user.id);
      else { setAvatarUrl(null); setUsername(null); }
    });

    return () => subscription.unsubscribe();
  }, []);

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

  async function handleLogout() {
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
              {/* Avatar */}
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-full border-2 border-primary overflow-hidden bg-surface-3 flex items-center justify-center">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={username ?? "avatar"} className="h-full w-full object-cover" />
                  ) : (
                    <User className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                {username && (
                  <span className="text-sm font-semibold text-foreground">@{username}</span>
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
            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-full border-2 border-primary overflow-hidden bg-surface-3 flex items-center justify-center">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={username ?? "avatar"} className="h-full w-full object-cover" />
                  ) : (
                    <User className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                {username && (
                  <span className="text-sm font-semibold text-foreground">@{username}</span>
                )}
              </div>
              <LogoutButton onConfirm={() => { setOpen(false); handleLogout(); }} />
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
