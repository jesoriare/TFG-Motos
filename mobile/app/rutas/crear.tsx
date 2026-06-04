import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { colors, radius } from '@/constants/theme';

const DIFICULTADES = [
  { key: 'facil', label: 'Fácil', color: colors.success },
  { key: 'media', label: 'Media', color: colors.amber },
  { key: 'media_alta', label: 'Media-Alta', color: '#F97316' },
  { key: 'alta', label: 'Alta', color: colors.danger },
];

export default function CrearRutaScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [form, setForm] = useState({
    nombre: '', region: '', distancia_km: '',
    horas: '', minutos: '', dificultad: 'media',
    descripcion: '', tags: [] as string[],
  });

  function set(key: keyof typeof form) {
    return (val: string) => setForm(prev => ({ ...prev, [key]: val }));
  }

  function addTag() {
    const t = tagInput.trim();
    if (t && !(form.tags as string[]).includes(t)) {
      setForm(prev => ({ ...prev, tags: [...(prev.tags as string[]), t] }));
    }
    setTagInput('');
  }

  async function handleSubmit() {
    if (!form.nombre || !form.region || !form.distancia_km) {
      Alert.alert('Error', 'Rellena los campos obligatorios');
      return;
    }
    setLoading(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { Alert.alert('Error', 'Debes iniciar sesión'); setLoading(false); return; }

    const duracion_min = (parseInt(form.horas || '0') * 60) + parseInt(form.minutos || '0');

    const { error } = await supabase.from('rutas').insert({
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
    if (error) { Alert.alert('Error', error.message); return; }
    Alert.alert('¡Ruta publicada!', 'Tu ruta ya está disponible para la comunidad', [
      { text: 'OK', onPress: () => router.back() },
    ]);
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView style={s.scroll} contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={18} color={colors.muted} />
          <Text style={s.backText}>Volver</Text>
        </TouchableOpacity>
        <Text style={s.title}>PUBLICA <Text style={s.titleOrange}>TU RUTA</Text></Text>

        <View style={s.card}>
          <Label text="NOMBRE DE LA RUTA *" />
          <Field value={form.nombre} onChange={set('nombre')} placeholder="Ruta de las Águilas" />

          <Label text="REGIÓN / PROVINCIA *" />
          <Field value={form.region} onChange={set('region')} placeholder="Sierra de Gredos, Ávila" />

          <View style={s.row}>
            <View style={{ flex: 1 }}>
              <Label text="DISTANCIA (KM) *" />
              <Field value={form.distancia_km} onChange={set('distancia_km')} placeholder="186" keyboardType="numeric" />
            </View>
            <View style={{ flex: 1 }}>
              <Label text="DURACIÓN" />
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <TextInput style={[s.input, { flex: 1 }]} value={form.horas} onChangeText={set('horas')} placeholder="3h" keyboardType="numeric" placeholderTextColor={colors.muted + '60'} />
                <TextInput style={[s.input, { flex: 1 }]} value={form.minutos} onChangeText={set('minutos')} placeholder="30m" keyboardType="numeric" placeholderTextColor={colors.muted + '60'} />
              </View>
            </View>
          </View>

          {/* Dificultad */}
          <Label text="DIFICULTAD" />
          <View style={s.difRow}>
            {DIFICULTADES.map(d => (
              <TouchableOpacity
                key={d.key}
                style={[s.difBtn, form.dificultad === d.key && { borderColor: d.color, backgroundColor: d.color + '20' }]}
                onPress={() => setForm(p => ({ ...p, dificultad: d.key }))}
              >
                <Text style={[s.difText, form.dificultad === d.key && { color: d.color }]}>{d.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Tags */}
          <Label text="ETIQUETAS" />
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
            <TextInput
              style={[s.input, { flex: 1 }]}
              value={tagInput}
              onChangeText={setTagInput}
              onSubmitEditing={addTag}
              placeholder="Montaña, Curvas..."
              placeholderTextColor={colors.muted + '60'}
              returnKeyType="done"
            />
            <TouchableOpacity style={s.addTagBtn} onPress={addTag}>
              <Ionicons name="add" size={18} color={colors.muted} />
            </TouchableOpacity>
          </View>
          {(form.tags as string[]).length > 0 && (
            <View style={s.tagsRow}>
              {(form.tags as string[]).map(tag => (
                <TouchableOpacity key={tag} style={s.tag} onPress={() => setForm(p => ({ ...p, tags: (p.tags as string[]).filter(t => t !== tag) }))}>
                  <Text style={s.tagText}>{tag}</Text>
                  <Ionicons name="close" size={12} color={colors.muted} />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Descripción */}
          <Label text="DESCRIPCIÓN" />
          <TextInput
            style={[s.input, { height: 90, textAlignVertical: 'top' }]}
            value={form.descripcion}
            onChangeText={set('descripcion')}
            placeholder="Describe los puntos de interés, dificultades..."
            placeholderTextColor={colors.muted + '60'}
            multiline
          />

          <TouchableOpacity style={[s.btn, loading && { opacity: 0.5 }]} onPress={handleSubmit} disabled={loading}>
            {loading ? <ActivityIndicator color={colors.primaryFg} /> : <Text style={s.btnText}>PUBLICAR RUTA</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Label({ text }: { text: string }) {
  return <Text style={{ color: colors.muted, fontSize: 11, fontWeight: '700', marginBottom: 6, letterSpacing: 1 }}>{text}</Text>;
}

function Field({ value, onChange, placeholder, keyboardType }: {
  value: string; onChange: (v: string) => void; placeholder?: string; keyboardType?: any;
}) {
  return (
    <TextInput
      style={s.input}
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={colors.muted + '60'}
      keyboardType={keyboardType}
      autoCapitalize="words"
      autoCorrect={false}
    />
  );
}

const s = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.background },
  container: { padding: 20, paddingTop: 56, paddingBottom: 40 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
  backText: { color: colors.muted, fontSize: 14, fontWeight: '600' },
  title: { fontSize: 34, fontWeight: '900', color: colors.foreground, marginBottom: 24 },
  titleOrange: { color: colors.primary },
  card: { backgroundColor: colors.surface1, borderRadius: radius.xl, padding: 20, borderWidth: 1, borderColor: colors.border, gap: 10 },
  row: { flexDirection: 'row', gap: 10 },
  input: { backgroundColor: colors.surface3, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, color: colors.foreground, fontSize: 14, paddingHorizontal: 12, paddingVertical: 12, marginBottom: 4 },
  difRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  difBtn: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.full, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: colors.surface2 },
  difText: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  addTagBtn: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface2 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 4 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.surface3, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 10, paddingVertical: 5 },
  tagText: { color: colors.muted, fontSize: 12 },
  btn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  btnText: { color: colors.primaryFg, fontWeight: '800', fontSize: 14, letterSpacing: 1.5 },
});
