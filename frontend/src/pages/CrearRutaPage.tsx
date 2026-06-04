import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, ArrowLeft, Route, MapPinned, Gauge, Clock, Mountain, Tag, X } from "lucide-react";
import { supabase } from "@/lib/supabase";

const DIFICULTADES = [
  { key: "facil", label: "Fácil" },
  { key: "media", label: "Media" },
  { key: "media_alta", label: "Media-Alta" },
  { key: "alta", label: "Alta" },
];

export default function CrearRutaPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState("");
  const [form, setForm] = useState({
    nombre: "",
    region: "",
    distancia_km: "",
    horas: "",
    minutos: "",
    dificultad: "media",
    descripcion: "",
    tags: [] as string[],
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    if (error) setError(null);
  };

  function addTag() {
    const t = tagInput.trim();
    if (t && !form.tags.includes(t)) {
      setForm(prev => ({ ...prev, tags: [...prev.tags, t] }));
    }
    setTagInput("");
  }

  function removeTag(tag: string) {
    setForm(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate("/entrar"); return; }

    const duracion_min = (parseInt(form.horas || "0") * 60) + parseInt(form.minutos || "0");

    const { error: err } = await supabase.from("rutas").insert({
      user_id: session.user.id,
      nombre: form.nombre,
      region: form.region,
      distancia_km: parseInt(form.distancia_km),
      duracion_min,
      dificultad: form.dificultad,
      descripcion: form.descripcion || null,
      tags: form.tags,
    });

    setLoading(false);
    if (err) { setError(err.message); return; }
    navigate("/");
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
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
            <span className="font-display text-xl tracking-tight text-foreground">
              RODADA<span className="text-primary">MOTO</span>
            </span>
          </a>
          <div className="w-16" />
        </div>
      </header>

      <div className="flex flex-1 justify-center px-4 py-10">
        <div className="w-full max-w-lg">
          <div className="mb-8 text-center">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 py-1.5">
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse-orange" />
              <span className="text-xs font-bold uppercase tracking-widest text-primary">Nueva ruta</span>
            </div>
            <h1 className="font-display text-4xl sm:text-5xl text-foreground leading-none mb-2">
              PUBLICA <span className="text-gradient-orange">TU RUTA</span>
            </h1>
          </div>

          <div className="card-surface rounded-xl p-6 sm:p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              <Field label="Nombre de la ruta" name="nombre" value={form.nombre} onChange={handleChange} placeholder="Ruta de las Águilas" icon={<Route className="h-4 w-4" />} required />
              <Field label="Región / Provincia" name="region" value={form.region} onChange={handleChange} placeholder="Sierra de Gredos, Ávila" icon={<MapPinned className="h-4 w-4" />} required />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Distancia (km)" name="distancia_km" value={form.distancia_km} onChange={handleChange} placeholder="186" icon={<Gauge className="h-4 w-4" />} type="number" required />
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Duración<span className="text-primary ml-0.5">*</span>
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"><Clock className="h-4 w-4" /></span>
                      <input name="horas" value={form.horas} onChange={handleChange} placeholder="3h" type="number" min="0"
                        className="w-full rounded-md border border-border bg-surface-3 pl-10 pr-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary" />
                    </div>
                    <div className="relative flex-1">
                      <input name="minutos" value={form.minutos} onChange={handleChange} placeholder="30min" type="number" min="0" max="59"
                        className="w-full rounded-md border border-border bg-surface-3 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Dificultad */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Dificultad<span className="text-primary ml-0.5">*</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {DIFICULTADES.map(d => (
                    <button key={d.key} type="button"
                      onClick={() => setForm(p => ({ ...p, dificultad: d.key }))}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${form.dificultad === d.key ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}>
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tags */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">Etiquetas</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"><Tag className="h-4 w-4" /></span>
                    <input value={tagInput} onChange={e => setTagInput(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addTag())}
                      placeholder="Montaña, Curvas..." type="text"
                      className="w-full rounded-md border border-border bg-surface-3 pl-10 pr-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary" />
                  </div>
                  <button type="button" onClick={addTag} className="rounded-md border border-border px-3 py-2 text-xs font-bold text-muted-foreground hover:text-primary hover:border-primary/50 transition-all">
                    Añadir
                  </button>
                </div>
                {form.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {form.tags.map(tag => (
                      <span key={tag} className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-surface-3 border border-border text-muted-foreground">
                        {tag}
                        <button type="button" onClick={() => removeTag(tag)}><X className="h-3 w-3 hover:text-destructive" /></button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Descripción */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">Descripción</label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-muted-foreground"><Mountain className="h-4 w-4" /></span>
                  <textarea name="descripcion" value={form.descripcion} onChange={handleChange} rows={3} placeholder="Describe los puntos de interés, dificultades..."
                    className="w-full rounded-md border border-border bg-surface-3 pl-10 pr-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary resize-none" />
                </div>
              </div>

              {error && <p className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">{error}</p>}

              <button type="submit" disabled={loading}
                className="w-full rounded-md bg-primary py-3 text-sm font-bold uppercase tracking-wider text-primary-foreground transition-all hover:opacity-90 hover:shadow-[0_0_30px_hsl(25_100%_52%/0.5)] disabled:opacity-50 disabled:cursor-not-allowed">
                {loading ? "Publicando..." : "Publicar ruta"}
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
  placeholder?: string; icon: React.ReactNode; required?: boolean; type?: string;
}
function Field({ label, name, value, onChange, placeholder, icon, required, type = "text" }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
        {label}{required && <span className="text-primary ml-0.5">*</span>}
      </label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{icon}</span>
        <input type={type} name={name} value={value} onChange={onChange} placeholder={placeholder} required={required}
          className="w-full rounded-md border border-border bg-surface-3 pl-10 pr-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary" />
      </div>
    </div>
  );
}
