import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { login } from '@/lib/api';
import { colors, radius } from '@/constants/theme';

export default function EntrarScreen() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!username || !password) {
      Alert.alert('Error', 'Rellena todos los campos');
      return;
    }
    setLoading(true);

    const { error } = await login(username, password);
    if (error) {
      Alert.alert('Error', error);
      setLoading(false);
      return;
    }

    setLoading(false);
    router.replace('/(tabs)');
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <ScrollView style={s.scroll} contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
      {/* Botón volver */}
      <TouchableOpacity style={s.backBtn} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
        <Ionicons name="arrow-back" size={18} color={colors.muted} />
        <Text style={s.backText}>Volver</Text>
      </TouchableOpacity>

      {/* Badge */}
      <View style={s.badge}>
        <View style={s.dot} />
        <Text style={s.badgeText}>BIENVENIDO DE VUELTA</Text>
      </View>

      <Text style={s.title}>INICIA{'\n'}<Text style={s.titleOrange}>SESIÓN</Text></Text>
      <Text style={s.subtitle}>Accede a tu cuenta y vuelve a la carretera</Text>

      {/* Card */}
      <View style={s.card}>
        <Label text="NOMBRE DE USUARIO *" />
        <View style={s.inputRow}>
          <Text style={s.inputIcon}>@</Text>
          <TextInput
            style={s.input}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="off"
            placeholderTextColor={colors.muted}
          />
        </View>

        <Label text="CONTRASEÑA *" />
        <View style={s.inputRow}>
          <Text style={s.inputIcon}>🔒</Text>
          <TextInput
            style={s.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPass}
            autoComplete="current-password"
            placeholderTextColor={colors.muted}
          />
          <TouchableOpacity onPress={() => setShowPass(!showPass)}>
            <Text style={s.showPass}>{showPass ? 'Ocultar' : 'Ver'}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={[s.btn, loading && s.btnDisabled]} onPress={handleLogin} disabled={loading}>
          {loading ? <ActivityIndicator color={colors.primaryFg} /> : <Text style={s.btnText}>INICIAR SESIÓN</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/registro')}>
          <Text style={s.link}>¿No tienes cuenta? <Text style={s.linkOrange}>Regístrate gratis</Text></Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Label({ text }: { text: string }) {
  return <Text style={{ color: colors.muted, fontSize: 11, fontWeight: '700', marginBottom: 6, letterSpacing: 1 }}>{text}</Text>;
}

const s = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.background },
  container: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginBottom: 24 },
  backText: { color: colors.muted, fontSize: 14, fontWeight: '600' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: colors.primary + '60', backgroundColor: colors.primary + '18', borderRadius: radius.full, paddingHorizontal: 14, paddingVertical: 6, marginBottom: 20 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  badgeText: { color: colors.primary, fontSize: 11, fontWeight: '700', letterSpacing: 2 },
  title: { fontSize: 48, fontWeight: '900', color: colors.foreground, textAlign: 'center', lineHeight: 52, marginBottom: 10 },
  titleOrange: { color: colors.primary },
  subtitle: { color: colors.muted, fontSize: 14, textAlign: 'center', marginBottom: 32 },
  card: { width: '100%', backgroundColor: colors.surface1, borderRadius: radius.xl, padding: 24, borderWidth: 1, borderColor: colors.border, gap: 14 },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface3, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, marginBottom: 6 },
  inputIcon: { color: colors.muted, marginRight: 8, fontSize: 16 },
  input: { flex: 1, color: colors.foreground, fontSize: 14, paddingVertical: 12 },
  showPass: { color: colors.primary, fontSize: 12, fontWeight: '600' },
  btn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: colors.primaryFg, fontWeight: '800', fontSize: 14, letterSpacing: 1.5 },
  link: { color: colors.muted, fontSize: 13, textAlign: 'center', marginTop: 4 },
  linkOrange: { color: colors.primary, fontWeight: '600' },
});
