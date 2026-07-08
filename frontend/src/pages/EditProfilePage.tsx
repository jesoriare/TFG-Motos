import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, ArrowLeft, User, AtSign, Bike, Gauge, MapPinned, ChevronsUpDown, Check } from "lucide-react";
import { getMe, getToken, apiFetch } from "@/lib/api";
import { CIUDADES_ESPANA } from "@/data/ciudades-espana";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";

export default function EditProfilePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [zonaOpen, setZonaOpen] = useState(false);

  const [form, setForm] = useState({
    nombre: "", apellidos: "", username: "", zona: "",
    avatar_url: "", marca_modelo: "", cilindrada: "",
  });

  useEffect(() => {
    const me = getMe();
    if (!me) { navigate("/entrar"); return; }

    async function loadProfile() {
      const res = await apiFetch(`/usuarios/${me!.username}`);
      if (!res.ok) { navigate("/entrar"); return; }
      const data = await res.json();
      const moto = data.motos?.find((m: any) => m.principal) ?? data.motos?.[0];
      setForm({
        nombre:       data.nombre ?? "",
        apellidos:    data.apellidos ?? "",
        username:     data.username ?? "",
        zona:         data.zona ?? "",
        avatar_url:   data.avatar_url ?? "",
        marca_modelo: moto?.marca_modelo ?? "",
        cilindrada:   moto?.cilindrada?.toString() ?? "",
      });
      setLoading(false);
    }
    loadProfile();
  }, [navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (error) setError(null);
    if (success) setSuccess(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const token = getToken();
    if (!token) { navigate("/entrar"); return; }

    const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3001"}/usuarios/me`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        nombre: form.nombre,
        apellidos: form.apellidos,
        zona: form.zona || null,
        avatar_url: form.avatar_url || null,
        marca_modelo: form.marca_modelo || undefined,
        cilindrada: form.cilindrada || undefined,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Error al guardar");
      setSaving(false);
      return;
    }

    setSaving(false);
    setSuccess(true);
    setTimeout(() => navigate("/"), 800);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

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

      <div className="flex flex-1 justify-center px-4 py-10">
        <div className="w-full max-w-lg">
          <div className="mb-8 text-center">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 py-1.5">
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse-orange" />
              <span className="text-xs font-bold uppercase tracking-widest text-primary">Tu perfil</span>
            </div>
            <h1 className="font-display text-4xl sm:text-5xl text-foreground leading-none mb-2">
              EDITAR <span className="text-gradient-orange">PERFIL</span>
            </h1>
          </div>

          {/* Avatar preview */}
          <div className="flex justify-center mb-6">
            <div className="h-24 w-24 rounded-full border-4 border-primary overflow-hidden bg-surface-3 flex items-center justify-center">
              {form.avatar_url ? (
                <img src={form.avatar_url} alt="Avatar" className="h-full w-full object-cover" onError={() => setForm(p => ({ ...p, avatar_url: "" }))} />
              ) : (
                <User className="h-10 w-10 text-muted-foreground" />
              )}
            </div>
          </div>

          <div className="card-surface rounded-xl p-6 sm:p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Nombre" name="nombre" value={form.nombre} onChange={handleChange} icon={<User className="h-4 w-4" />} required />
                <Field label="Apellidos" name="apellidos" value={form.apellidos} onChange={handleChange} icon={<User className="h-4 w-4" />} required />
              </div>

              <Field label="Nombre de usuario" name="username" value={form.username} onChange={handleChange} icon={<AtSign className="h-4 w-4" />} required />

              <Field label="URL del avatar" name="avatar_url" value={form.avatar_url} onChange={handleChange} placeholder="https://..." icon={<User className="h-4 w-4" />} />

              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">Zona / Ciudad</label>
                <Popover open={zonaOpen} onOpenChange={setZonaOpen}>
                  <PopoverTrigger asChild>
                    <button type="button" className="w-full flex items-center justify-between rounded-md border border-border bg-surface-3 px-3 py-2.5 text-sm text-left focus:outline-none focus:ring-1 focus:ring-primary">
                      <span className="flex items-center gap-2 text-sm">
                        <MapPinned className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className={form.zona ? "text-foreground" : "text-muted-foreground/50"}>{form.zona || "Selecciona tu ciudad..."}</span>
                      </span>
                      <ChevronsUpDown className="h-4 w-4 text-muted-foreground shrink-0" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="p-0 bg-card border-border w-[var(--radix-popover-trigger-width)]" align="start">
                    <Command>
                      <CommandInput placeholder="Buscar ciudad..." className="text-sm" />
                      <CommandList className="max-h-60">
                        <CommandEmpty className="py-4 text-center text-sm text-muted-foreground">Ciudad no encontrada</CommandEmpty>
                        <CommandGroup>
                          {CIUDADES_ESPANA.map((ciudad) => (
                            <CommandItem key={ciudad} value={ciudad} onSelect={(val) => { setForm(p => ({ ...p, zona: val })); setZonaOpen(false); }} className="text-sm cursor-pointer">
                              <Check className={cn("mr-2 h-4 w-4", form.zona === ciudad ? "opacity-100" : "opacity-0")} />
                              {ciudad}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex items-center gap-3 py-1">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Tu moto</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Modelo" name="marca_modelo" value={form.marca_modelo} onChange={handleChange} placeholder="Honda CB650R" icon={<Bike className="h-4 w-4" />} />
                <Field label="Cilindrada" name="cilindrada" value={form.cilindrada} onChange={handleChange} placeholder="650" icon={<Gauge className="h-4 w-4" />} />
              </div>

              {error   && <p className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">{error}</p>}
              {success && <p className="rounded-md border border-green-500/40 bg-green-500/10 px-4 py-2.5 text-sm text-green-400">Perfil actualizado correctamente</p>}

              <button type="submit" disabled={saving}
                className="w-full rounded-md bg-primary py-3 text-sm font-bold uppercase tracking-wider text-primary-foreground transition-all hover:opacity-90 hover:shadow-[0_0_30px_hsl(25_100%_52%/0.5)] disabled:opacity-50 disabled:cursor-not-allowed">
                {saving ? "Guardando..." : "Guardar cambios"}
              </button>
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
  placeholder?: string; icon: React.ReactNode; required?: boolean;
}

function Field({ label, name, value, onChange, placeholder, icon, required }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
        {label}{required && <span className="text-primary ml-0.5">*</span>}
      </label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{icon}</span>
        <input
          type="text" name={name} value={value} onChange={onChange} placeholder={placeholder} required={required}
          className="w-full rounded-md border border-border bg-surface-3 pl-10 pr-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>
    </div>
  );
}
