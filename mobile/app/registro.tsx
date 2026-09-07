import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { registrar } from '@/lib/api';
import { colors, radius } from '@/constants/theme';

export default function RegistroScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    nombre: '', apellidos: '', correo: '',
    username: '', moto: '', cilindrada: '', password: '',
  });

  function set(key: keyof typeof form) {
    return (val: string) => setForm(prev => ({ ...prev, [key]: val }));
  }

  async function handleRegister() {
    const { nombre, apellidos, correo, username, moto, cilindrada, password } = form;
    if (!nombre || !apellidos || !correo || !username || !password) {
      Alert.alert('Error', 'Rellena todos los campos obligatorios');
      return;
    }
    setLoading(true);

    const { error } = await registrar({
      nombre, apellidos, email: correo, username, password,
      marca_modelo: moto || undefined, cilindrada: cilindrada || undefined,
    });

    if (error) {
      Alert.alert('Error', error);
      setLoading(false);
      return;
    }

    setLoading(false);
    Alert.alert('¡Cuenta creada!', 'Ya puedes iniciar sesión', [
      { text: 'OK', onPress: () => router.replace('/entrar') },
    ]);
  }

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
      <View style={s.badge}>
        <View style={s.dot} />
        <Text style={s.badgeText}>ÚNETE A LA COMUNIDAD</Text>
      </View>

      <Text style={s.title}>CREA TU{'\n'}<Text style={s.titleOrange}>CUENTA</Text></Text>
      <Text style={s.subtitle}>Rellena el formulario y empieza a rodar con nosotros</Text>

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

        <Label text="CORREO ELECTRÓNICO *" />
        <Field value={form.correo} onChange={set('correo')} placeholder="pedro@ejemplo.com" keyboardType="email-address" />

        <Label text="NOMBRE DE USUARIO *" />
        <Field value={form.username} onChange={set('username')} autoCapitalize="none" />

        <View style={s.divider}><View style={s.dividerLine} /><Text style={s.dividerText}>TU MOTO</Text><View style={s.dividerLine} /></View>

        <View style={s.row}>
          <View style={{ flex: 1 }}>
            <Label text="MODELO" />
            <Field value={form.moto} onChange={set('moto')} placeholder="Honda CB650R" />
          </View>
          <View style={{ flex: 1 }}>
            <Label text="CILINDRADA" />
            <Field value={form.cilindrada} onChange={set('cilindrada')} placeholder="650" keyboardType="numeric" />
          </View>
        </View>

        <Label text="CONTRASEÑA *" />
        <Field value={form.password} onChange={set('password')} secureTextEntry />

        <TouchableOpacity style={[s.btn, loading && s.btnDisabled]} onPress={handleRegister} disabled={loading}>
          {loading ? <ActivityIndicator color={colors.primaryFg} /> : <Text style={s.btnText}>CREAR CUENTA</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/entrar')}>
          <Text style={s.link}>¿Ya tienes cuenta? <Text style={s.linkOrange}>Inicia sesión</Text></Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
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
      placeholderTextColor={colors.muted}
      keyboardType={keyboardType}
      autoCapitalize={autoCapitalize ?? 'words'}
      secureTextEntry={secureTextEntry}
      autoCorrect={false}
    />
  );
}

const s = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.background },
  container: { flexGrow: 1, alignItems: 'center', padding: 24, paddingTop: 60 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: colors.primary + '60', backgroundColor: colors.primary + '18', borderRadius: radius.full, paddingHorizontal: 14, paddingVertical: 6, marginBottom: 20 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  badgeText: { color: colors.primary, fontSize: 11, fontWeight: '700', letterSpacing: 2 },
  title: { fontSize: 44, fontWeight: '900', color: colors.foreground, textAlign: 'center', lineHeight: 48, marginBottom: 10 },
  titleOrange: { color: colors.primary },
  subtitle: { color: colors.muted, fontSize: 14, textAlign: 'center', marginBottom: 28 },
  card: { width: '100%', backgroundColor: colors.surface1, borderRadius: radius.xl, padding: 20, borderWidth: 1, borderColor: colors.border, gap: 10 },
  row: { flexDirection: 'row', gap: 10 },
  input: { backgroundColor: colors.surface3, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, color: colors.foreground, fontSize: 14, paddingHorizontal: 12, paddingVertical: 12, marginBottom: 4 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 4 },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { color: colors.muted, fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  btn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: colors.primaryFg, fontWeight: '800', fontSize: 14, letterSpacing: 1.5 },
  link: { color: colors.muted, fontSize: 13, textAlign: 'center', marginTop: 4 },
  linkOrange: { color: colors.primary, fontWeight: '600' },
});
