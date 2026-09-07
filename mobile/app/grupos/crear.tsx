import { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getSession } from '@/lib/auth';
import { colors, radius } from '@/constants/theme';
import { getRutas, crearGrupo } from '@/lib/api';

interface RutaPropia {
  id: string;
  nombre: string;
  region: string;
}

export default function CrearGrupoScreen() {
  const router = useRouter();
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [privacidad, setPrivacidad] = useState<'privado' | 'publico'>('privado');
  const [rutaId, setRutaId] = useState<string | null>(null);
  const [rutas, setRutas] = useState<RutaPropia[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSession().then(async (session) => {
      if (!session) { router.replace('/entrar'); return; }
      const propias = await getRutas({ username: session.user.username });
      setRutas(propias);
    });
  }, []);

  async function handleCrear() {
    const session = await getSession();
    if (!session) return;
    if (!nombre.trim()) { setError('El nombre es obligatorio'); return; }

    setLoading(true);
    setError(null);
    const { data, error: err } = await crearGrupo(
      { nombre: nombre.trim(), ruta_id: rutaId, descripcion: descripcion.trim() || null, privacidad },
      session.token
    );
    setLoading(false);

    if (err) { setError(err); return; }
    router.replace(`/grupos/${data.id}` as any);
  }

  return (
    <View style={s.screen}>
      <View style={s.header}>
        <TouchableOpacity style={s.back} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={colors.foreground} />
          <Text style={s.backText}>Volver</Text>
        </TouchableOpacity>
        <Text style={s.eyebrow}>COMUNIDAD</Text>
        <Text style={s.title}>CREAR GRUPO</Text>
      </View>

      <ScrollView contentContainerStyle={s.body}>
        <Text style={s.label}>Nombre del grupo</Text>
        <TextInput
          style={s.input}
          value={nombre}
          onChangeText={setNombre}
          placeholder="Rodada de los sábados"
          placeholderTextColor={colors.muted}
        />

        <Text style={[s.label, { marginTop: 20 }]}>Descripción (opcional)</Text>
        <TextInput
          style={[s.input, s.textArea]}
          value={descripcion}
          onChangeText={setDescripcion}
          placeholder="De qué va el grupo, qué tipo de rutas hacéis..."
          placeholderTextColor={colors.muted}
          multiline
          numberOfLines={3}
        />

        <Text style={[s.label, { marginTop: 20 }]}>Privacidad</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            style={[s.rutaChip, { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }, privacidad === 'privado' && s.rutaChipActive]}
            onPress={() => setPrivacidad('privado')}
          >
            <Ionicons name="lock-closed-outline" size={14} color={privacidad === 'privado' ? colors.primary : colors.muted} />
            <Text style={[s.rutaChipText, privacidad === 'privado' && s.rutaChipTextActive]}>Privado</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.rutaChip, { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }, privacidad === 'publico' && s.rutaChipActive]}
            onPress={() => setPrivacidad('publico')}
          >
            <Ionicons name="globe-outline" size={14} color={privacidad === 'publico' ? colors.primary : colors.muted} />
            <Text style={[s.rutaChipText, privacidad === 'publico' && s.rutaChipTextActive]}>Público</Text>
          </TouchableOpacity>
        </View>
        <Text style={s.hint}>
          {privacidad === 'privado' ? 'Solo entra quien invites tú (debe ser tu amigo).' : 'Cualquiera puede encontrarlo y unirse desde "Grupos públicos".'}
        </Text>

        <Text style={[s.label, { marginTop: 20 }]}>Ruta vinculada (opcional)</Text>
        {rutas.length === 0 ? (
          <Text style={s.hint}>No tienes rutas propias creadas todavía.</Text>
        ) : (
          <View style={{ gap: 8 }}>
            <TouchableOpacity
              style={[s.rutaChip, rutaId === null && s.rutaChipActive]}
              onPress={() => setRutaId(null)}
            >
              <Text style={[s.rutaChipText, rutaId === null && s.rutaChipTextActive]}>Sin ruta</Text>
            </TouchableOpacity>
            {rutas.map((r) => (
              <TouchableOpacity
                key={r.id}
                style={[s.rutaChip, rutaId === r.id && s.rutaChipActive]}
                onPress={() => setRutaId(r.id)}
              >
                <Text style={[s.rutaChipText, rutaId === r.id && s.rutaChipTextActive]} numberOfLines={1}>
                  {r.nombre} — {r.region}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {error && <Text style={s.error}>{error}</Text>}

        <TouchableOpacity style={s.submitBtn} onPress={handleCrear} disabled={loading}>
          {loading ? <ActivityIndicator color={colors.primaryFg} /> : <Text style={s.submitBtnText}>CREAR GRUPO</Text>}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginBottom: 20 },
  backText: { color: colors.foreground, fontSize: 14, fontWeight: '600' },
  eyebrow: { color: colors.primary, fontSize: 11, fontWeight: '800', letterSpacing: 2, marginBottom: 4 },
  title: { color: colors.foreground, fontSize: 26, fontWeight: '900', letterSpacing: 0.5 },
  body: { paddingHorizontal: 20, paddingBottom: 60 },
  label: { color: colors.muted, fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 8 },
  hint: { color: colors.muted, fontSize: 12, opacity: 0.7 },
  input: {
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface2,
    borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 12,
    color: colors.foreground, fontSize: 14,
  },
  textArea: { textAlignVertical: 'top', minHeight: 80 },
  rutaChip: {
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface2,
    borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 12,
  },
  rutaChipActive: { borderColor: colors.primary, backgroundColor: 'rgba(255,107,26,0.12)' },
  rutaChipText: { color: colors.muted, fontSize: 13, fontWeight: '600' },
  rutaChipTextActive: { color: colors.primary },
  error: { color: colors.danger, fontSize: 13, marginTop: 16 },
  submitBtn: {
    marginTop: 28, backgroundColor: colors.primary, borderRadius: radius.md,
    paddingVertical: 14, alignItems: 'center',
  },
  submitBtnText: { color: colors.primaryFg, fontWeight: '800', fontSize: 14, letterSpacing: 1 },
});
