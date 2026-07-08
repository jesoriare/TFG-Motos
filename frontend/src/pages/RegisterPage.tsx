import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, ArrowLeft, User, Mail, AtSign, Bike, Gauge, Eye, EyeOff } from "lucide-react";
import { register } from "@/lib/api";

export default function RegisterPage() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    nombre: "", apellidos: "", correo: "", username: "",
    moto: "", cilindrada: "", password: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await register({
        nombre: form.nombre,
        apellidos: form.apellidos,
        email: form.correo,
        username: form.username,
        password: form.password,
        marca_modelo: form.moto || undefined,
        cilindrada: form.cilindrada || undefined,
      });
      navigate("/");
    } catch (err: any) {
      setError(err.message ?? 'Error al crear la cuenta');
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
        <div className="w-full max-w-lg">
          <div className="mb-8 text-center">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 py-1.5">
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse-orange" />
              <span className="text-xs font-bold uppercase tracking-widest text-primary">Únete a la comunidad</span>
            </div>
            <h1 className="font-display text-4xl sm:text-5xl text-foreground leading-none mb-2">
              CREA TU <span className="text-gradient-orange">CUENTA</span>
            </h1>
            <p className="text-sm text-muted-foreground">Rellena el formulario y empieza a rodar con nosotros</p>
          </div>

          <div className="card-surface rounded-xl p-6 sm:p-8">
            <p className="text-xs text-muted-foreground mb-1">
              Los campos marcados con <span className="text-primary font-bold">*</span> son obligatorios
            </p>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Nombre" name="nombre" value={form.nombre} onChange={handleChange} placeholder="Pedro" icon={<User className="h-4 w-4" />} required />
                <Field label="Apellidos" name="apellidos" value={form.apellidos} onChange={handleChange} placeholder="García López" icon={<User className="h-4 w-4" />} required />
              </div>

              <Field label="Correo electrónico" name="correo" type="email" value={form.correo} onChange={handleChange} placeholder="pedro@ejemplo.com" icon={<Mail className="h-4 w-4" />} required />
              <Field label="Nombre de usuario" name="username" value={form.username} onChange={handleChange} autoComplete="off" icon={<AtSign className="h-4 w-4" />} required />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Tu moto" name="moto" value={form.moto} onChange={handleChange} placeholder="Honda CB650R" icon={<Bike className="h-4 w-4" />} required />
                <Field label="Cilindrada" name="cilindrada" value={form.cilindrada} onChange={handleChange} placeholder="650 cc" icon={<Gauge className="h-4 w-4" />} required />
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
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    className="w-full rounded-md border border-border bg-surface-3 pl-10 pr-10 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
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
                type="submit"
                disabled={loading}
                className="w-full rounded-md bg-primary py-3 text-sm font-bold uppercase tracking-wider text-primary-foreground transition-all hover:opacity-90 hover:shadow-[0_0_30px_hsl(25_100%_52%/0.5)] mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Creando cuenta..." : "Crear cuenta"}
              </button>

              <p className="text-center text-sm text-muted-foreground">
                ¿Ya tienes cuenta?{" "}
                <button type="button" onClick={() => navigate("/entrar")} className="font-semibold text-primary hover:underline">
                  Inicia sesión
                </button>
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

interface FieldProps {
  label: string; name: string; value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string; type?: string; icon: React.ReactNode;
  required?: boolean; autoComplete?: string;
}

function Field({ label, name, value, onChange, placeholder, type = "text", icon, required, autoComplete }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
        {label}{required && <span className="text-primary ml-0.5">*</span>}
      </label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{icon}</span>
        <input
          type={type} name={name} value={value} onChange={onChange}
          placeholder={placeholder} required={required} autoComplete={autoComplete}
          className="w-full rounded-md border border-border bg-surface-3 pl-10 pr-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>
    </div>
  );
}
