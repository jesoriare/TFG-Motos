import { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, Alert, Image,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { supabase } from '@/lib/supabase';
import { colors, radius } from '@/constants/theme';
import { CIUDADES_ESPANA } from '@/data/ciudades-espana';

export default function EditarPerfilScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [motoId, setMotoId] = useState<string | null>(null);
  const [ciudadModal, setCiudadModal] = useState(false);
  const [ciudadQuery, setCiudadQuery] = useState('');
  const [form, setForm] = useState({
    nombre: '', apellidos: '', username: '',
    zona: '', avatar_url: '', marca_modelo: '', cilindrada: '',
  });

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace('/entrar'); return; }

      const [{ data: p }, { data: m }] = await Promise.all([
        supabase.from('profiles').select('nombre,apellidos,username,zona,avatar_url').eq('id', session.user.id).single(),
        supabase.from('motos').select('id,marca_modelo,cilindrada').eq('user_id', session.user.id).eq('principal', true).single(),
      ]);

      if (p) setForm({
        nombre: p.nombre ?? '', apellidos: p.apellidos ?? '',
        username: p.username ?? '', zona: p.zona ?? '',
        avatar_url: p.avatar_url ?? '',
        marca_modelo: m?.marca_modelo ?? '',
        cilindrada: m?.cilindrada?.toString() ?? '',
      });
      if (m) setMotoId(m.id);
      setLoading(false);
    }
    load();
  }, []);

  function set(key: keyof typeof form) {
    return (val: string) => setForm(prev => ({ ...prev, [key]: val }));
  }

  async function handlePickAvatar() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permiso necesario', 'Necesitamos acceso a tu galería para cambiar el avatar.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (result.canceled) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    setUploadingAvatar(true);

    const uri = result.assets[0].uri;
    const ext = uri.split('.').pop() ?? 'jpg';
    const path = `${session.user.id}/avatar.${ext}`;

    const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
    const arrayBuffer = decode(base64);

    const { error } = await supabase.storage.from('avatars').upload(path, arrayBuffer, {
      contentType: `image/${ext}`,
      upsert: true,
    });

    if (error) {
      Alert.alert('Error', 'No se pudo subir la imagen: ' + error.message);
      setUploadingAvatar(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
    const urlConCache = `${publicUrl}?t=${Date.now()}`;

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: urlConCache })
      .eq('id', session.user.id);

    if (updateError) {
      Alert.alert('Error al guardar', updateError.message);
      setUploadingAvatar(false);
      return;
    }

    set('avatar_url')(urlConCache);
    setUploadingAvatar(false);
  }

  async function handleSave() {
    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { error } = await supabase.from('profiles').update({
      nombre: form.nombre, apellidos: form.apellidos,
      username: form.username, zona: form.zona || null,
      avatar_url: form.avatar_url || null,
    }).eq('id', session.user.id);

    if (error) { Alert.alert('Error', error.message); setSaving(false); return; }

    if (form.marca_modelo && form.cilindrada) {
      if (motoId) {
        await supabase.from('motos').update({ marca_modelo: form.marca_modelo, cilindrada: parseInt(form.cilindrada) }).eq('id', motoId);
      } else {
        await supabase.from('motos').insert({ user_id: session.user.id, marca_modelo: form.marca_modelo, cilindrada: parseInt(form.cilindrada), principal: true });
      }
    }

    setSaving(false);
    Alert.alert('¡Listo!', 'Perfil actualizado', [{ text: 'OK', onPress: () => router.back() }]);
  }

  const ciudadesFiltradas = CIUDADES_ESPANA.filter(c =>
    c.toLowerCase().includes(ciudadQuery.toLowerCase())
  ).slice(0, 50);

  if (loading) return (
    <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color={colors.primary} />
    </View>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView style={s.scroll} contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={18} color={colors.muted} />
            <Text style={s.backText}>Volver</Text>
          </TouchableOpacity>
          <Text style={s.title}>EDITAR <Text style={s.titleOrange}>PERFIL</Text></Text>
        </View>

        {/* Avatar picker */}
        <View style={s.avatarSection}>
          <TouchableOpacity style={s.avatarWrap} onPress={handlePickAvatar} disabled={uploadingAvatar}>
            {uploadingAvatar
              ? <ActivityIndicator color={colors.primary} />
              : form.avatar_url
                ? <Image source={{ uri: form.avatar_url }} style={s.avatarImg} />
                : <Ionicons name="person" size={36} color={colors.muted} />
            }
            <View style={s.avatarOverlay}>
              <Ionicons name="camera" size={20} color="white" />
            </View>
          </TouchableOpacity>
          <Text style={s.avatarHint}>Pulsa para cambiar foto</Text>
        </View>

        {/* Card */}
        <View style={s.card}>

          <View style={s.row}>
            <View style={{ flex: 1 }}>
              <Label text="NOMBRE *" />
              <Field value={form.nombre} onChange={set('nombre')} placeholder="Pedro" />
            </View>
            <View style={{ flex: 1 }}>
              <Label text="APELLIDOS *" />
              <Field value={form.apellidos} onChange={set('apellidos')} placeholder="García" />
            </View>
          </View>

          <Label text="NOMBRE DE USUARIO *" />
          <Field value={form.username} onChange={set('username')} autoCapitalize="none" />

          {/* Zona — selector */}
          <Label text="ZONA / CIUDAD" />
          <TouchableOpacity style={s.selector} onPress={() => setCiudadModal(true)}>
            <Ionicons name="location-outline" size={16} color={colors.muted} />
            <Text style={[s.selectorText, !form.zona && { color: colors.muted + '80' }]}>
              {form.zona || 'Selecciona tu ciudad...'}
            </Text>
            <Ionicons name="chevron-down" size={16} color={colors.muted} />
          </TouchableOpacity>

          <View style={s.divider}>
            <View style={s.dividerLine} />
            <Text style={s.dividerText}>TU MOTO</Text>
            <View style={s.dividerLine} />
          </View>

          <View style={s.row}>
            <View style={{ flex: 1 }}>
              <Label text="MODELO" />
              <Field value={form.marca_modelo} onChange={set('marca_modelo')} placeholder="Honda CB650R" />
            </View>
            <View style={{ flex: 1 }}>
              <Label text="CILINDRADA" />
              <Field value={form.cilindrada} onChange={set('cilindrada')} placeholder="650" keyboardType="numeric" />
            </View>
          </View>

          <TouchableOpacity style={[s.btn, saving && s.btnDisabled]} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color={colors.primaryFg} /> : <Text style={s.btnText}>GUARDAR CAMBIOS</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modal selector ciudad */}
      {ciudadModal && (
        <View style={s.modal}>
          <View style={s.modalCard}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Selecciona tu ciudad</Text>
              <TouchableOpacity onPress={() => { setCiudadModal(false); setCiudadQuery(''); }}>
                <Ionicons name="close" size={22} color={colors.muted} />
              </TouchableOpacity>
            </View>
            <View style={s.modalSearch}>
              <Ionicons name="search" size={16} color={colors.muted} />
              <TextInput
                style={s.modalInput}
                value={ciudadQuery}
                onChangeText={setCiudadQuery}
                placeholder="Buscar ciudad..."
                placeholderTextColor={colors.muted}
                autoFocus
              />
            </View>
            <ScrollView style={{ maxHeight: 340 }}>
              {ciudadesFiltradas.map(ciudad => (
                <TouchableOpacity
                  key={ciudad}
                  style={[s.ciudadItem, form.zona === ciudad && s.ciudadItemActive]}
                  onPress={() => { set('zona')(ciudad); setCiudadModal(false); setCiudadQuery(''); }}
                >
                  {form.zona === ciudad && <Ionicons name="checkmark" size={16} color={colors.primary} style={{ marginRight: 8 }} />}
                  <Text style={[s.ciudadText, form.zona === ciudad && { color: colors.primary }]}>{ciudad}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

function Label({ text }: { text: string }) {
  return <Text style={{ color: colors.muted, fontSize: 11, fontWeight: '700', marginBottom: 6, letterSpacing: 1 }}>{text}</Text>;
}

function Field({ value, onChange, placeholder, keyboardType, autoCapitalize, secureTextEntry }: {
  value: string; onChange: (v: string) => void; placeholder?: string;
  keyboardType?: any; autoCapitalize?: any; secureTextEntry?: boolean;
}) {
  return (
    <TextInput
      style={s.input}
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={colors.muted + '60'}
      keyboardType={keyboardType}
      autoCapitalize={autoCapitalize ?? 'words'}
      secureTextEntry={secureTextEntry}
      autoCorrect={false}
    />
  );
}

const s = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.background },
  container: { padding: 20, paddingTop: 56, paddingBottom: 40 },
  header: { marginBottom: 24 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
  backText: { color: colors.muted, fontSize: 14, fontWeight: '600' },
  title: { fontSize: 36, fontWeight: '900', color: colors.foreground },
  titleOrange: { color: colors.primary },
  avatarSection: { alignItems: 'center', marginBottom: 24 },
  avatarWrap: { width: 88, height: 88, borderRadius: 44, borderWidth: 3, borderColor: colors.primary, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  avatarImg: { width: 82, height: 82, borderRadius: 41 },
  avatarOverlay: { position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarHint: { color: colors.muted, fontSize: 12 },
  card: { backgroundColor: colors.surface1, borderRadius: radius.xl, padding: 20, borderWidth: 1, borderColor: colors.border, gap: 10 },
  row: { flexDirection: 'row', gap: 10 },
  input: { backgroundColor: colors.surface3, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, color: colors.foreground, fontSize: 14, paddingHorizontal: 12, paddingVertical: 12, marginBottom: 4 },
  selector: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.surface3, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 12, marginBottom: 4 },
  selectorText: { flex: 1, color: colors.foreground, fontSize: 14 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 4 },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { color: colors.muted, fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  btn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: colors.primaryFg, fontWeight: '800', fontSize: 14, letterSpacing: 1.5 },
  modal: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000000AA', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: colors.surface1, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: 20, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  modalTitle: { color: colors.foreground, fontWeight: '700', fontSize: 16 },
  modalSearch: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.surface3, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10 },
  modalInput: { flex: 1, color: colors.foreground, fontSize: 14 },
  ciudadItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: colors.border + '40' },
  ciudadItemActive: { backgroundColor: colors.primary + '10' },
  ciudadText: { color: colors.foreground, fontSize: 14 },
});
