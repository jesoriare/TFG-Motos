import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, ArrowLeft, AtSign, Eye, EyeOff } from "lucide-react";
import { login } from "@/lib/api";

export default function LoginPage() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ username: "", password: "" });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await login(form.username, form.password);
      navigate("/");
    } catch (err: any) {
      setError(err.message ?? "Nombre de usuario o contraseña incorrectos");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-md px-4 py-3">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <button onClick={() => navigate("/")} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm font-semibold">Volver</span>
          </button>
          <a href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary">
              <MapPin className="h-4 w-4 text-primary-foreground" strokeWidth={2.5} />
            </div>
            <span className="font-display text-xl tracking-tight text-foreground">RODADA<span className="text-primary">MOTO</span></span>
          </a>
          <div className="w-16" />
        </div>
      </header>

      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 py-1.5">
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse-orange" />
              <span className="text-xs font-bold uppercase tracking-widest text-primary">Bienvenido de vuelta</span>
            </div>
            <h1 className="font-display text-4xl sm:text-5xl text-foreground leading-none mb-2">
              INICIA <span className="text-gradient-orange">SESIÓN</span>
            </h1>
            <p className="text-sm text-muted-foreground">Accede a tu cuenta y vuelve a la carretera</p>
          </div>

          <div className="card-surface rounded-xl p-6 sm:p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Nombre de usuario<span className="text-primary ml-0.5">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <AtSign className="h-4 w-4" />
                  </span>
                  <input
                    type="text" name="username" value={form.username} onChange={handleChange}
                    required autoComplete="off"
                    className="w-full rounded-md border border-border bg-surface-3 pl-10 pr-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Contraseña<span className="text-primary ml-0.5">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <Eye className="h-4 w-4" />
                  </span>
                  <input
                    type={showPassword ? "text" : "password"} name="password" value={form.password} onChange={handleChange}
                    required autoComplete="current-password"
                    className="w-full rounded-md border border-border bg-surface-3 pl-10 pr-10 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <p className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">{error}</p>
              )}

              <button
                type="submit" disabled={loading}
                className="w-full rounded-md bg-primary py-3 text-sm font-bold uppercase tracking-wider text-primary-foreground transition-all hover:opacity-90 hover:shadow-[0_0_30px_hsl(25_100%_52%/0.5)] mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Entrando..." : "Iniciar sesión"}
              </button>

              <p className="text-center text-sm text-muted-foreground">
                ¿No tienes cuenta?{" "}
                <button type="button" onClick={() => navigate("/registro")} className="font-semibold text-primary hover:underline">
                  Regístrate gratis
                </button>
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
