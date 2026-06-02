import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { colors, radius } from '@/constants/theme';

interface Profile {
  id: string; nombre: string; apellidos: string; username: string;
  avatar_url: string | null; zona: string | null; verified: boolean; online: boolean; created_at: string;
}
interface Moto { marca_modelo: string; cilindrada: number; tipo: string; }

export default function PerfilScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [motos, setMotos] = useState<Moto[]>([]);
  const [rutasCount, setRutasCount] = useState(0);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.replace('/entrar'); return; }

    const [{ data: p }, { data: m }, { data: r }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', session.user.id).single(),
      supabase.from('motos').select('marca_modelo, cilindrada, tipo').eq('user_id', session.user.id),
      supabase.from('rutas').select('id', { count: 'exact' }).eq('user_id', session.user.id).eq('publicada', true),
    ]);

    if (p) setProfile(p);
    setMotos(m ?? []);
    setRutasCount(r?.length ?? 0);
  }

  async function handleLogout() {
    Alert.alert('Cerrar sesión', '¿Seguro que quieres cerrar sesión?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Cerrar sesión', style: 'destructive', onPress: async () => {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) await supabase.from('profiles').update({ online: false, last_seen: new Date().toISOString() }).eq('id', session.user.id);
          await supabase.auth.signOut();
          router.replace('/entrar');
        },
      },
    ]);
  }

  if (!profile) return (
    <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name="reload" size={24} color={colors.primary} />
    </View>
  );

  const initials = `${profile.nombre.charAt(0)}${profile.apellidos?.charAt(0) ?? ''}`.toUpperCase();

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.container}>
      {/* Avatar */}
      <View style={s.avatarSection}>
        <View style={s.avatarWrap}>
          {profile.avatar_url
            ? <Image source={{ uri: profile.avatar_url }} style={s.avatarImg} />
            : <Text style={s.avatarText}>{initials}</Text>
          }
          {profile.online && <View style={s.onlineDot} />}
        </View>
        <Text style={s.name}>{profile.nombre} {profile.apellidos}</Text>
        <Text style={s.username}>@{profile.username}</Text>
        {profile.verified && (
          <View style={s.verifiedBadge}>
            <Ionicons name="shield-checkmark" size={12} color={colors.primary} />
            <Text style={s.verifiedText}>Verificado</Text>
          </View>
        )}
      </View>

      {/* Stats */}
      <View style={s.statsRow}>
        <View style={s.stat}>
          <Text style={s.statValue}>{rutasCount}</Text>
          <Text style={s.statLabel}>Rutas</Text>
        </View>
        <View style={[s.stat, s.statBorder]}>
          <Text style={s.statValue}>{motos.length}</Text>
          <Text style={s.statLabel}>Motos</Text>
        </View>
        <View style={s.stat}>
          <Text style={[s.statValue, { color: profile.online ? colors.success : colors.muted, fontSize: 12 }]}>
            {profile.online ? 'En línea' : 'Offline'}
          </Text>
          <Text style={s.statLabel}>Estado</Text>
        </View>
      </View>

      {/* Info */}
      {profile.zona && (
        <View style={s.infoRow}>
          <Ionicons name="location-outline" size={16} color={colors.primary} />
          <Text style={s.infoText}>{profile.zona}</Text>
        </View>
      )}

      {/* Motos */}
      {motos.length > 0 && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>🏍 MI MOTO</Text>
          {motos.map((m, i) => (
            <View key={i} style={s.motoCard}>
              <Text style={s.motoName}>{m.marca_modelo}</Text>
              <Text style={s.motoSub}>{m.cilindrada}cc · {m.tipo}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Acciones */}
      <View style={s.actions}>
        <TouchableOpacity style={s.actionBtn} onPress={() => router.push('/perfil/editar' as any)}>
          <Ionicons name="pencil-outline" size={18} color={colors.foreground} />
          <Text style={s.actionText}>Editar perfil</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.muted} style={{ marginLeft: 'auto' }} />
        </TouchableOpacity>

        <TouchableOpacity style={[s.actionBtn, s.logoutBtn]} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={18} color={colors.danger} />
          <Text style={[s.actionText, { color: colors.danger }]}>Cerrar sesión</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.background },
  container: { padding: 20, paddingTop: 56, alignItems: 'center' },
  avatarSection: { alignItems: 'center', marginBottom: 24 },
  avatarWrap: { width: 96, height: 96, borderRadius: 48, borderWidth: 3, borderColor: colors.primary, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarImg: { width: 90, height: 90, borderRadius: 45 },
  avatarText: { fontSize: 32, fontWeight: '800', color: colors.primary },
  onlineDot: { position: 'absolute', bottom: 2, right: 2, width: 16, height: 16, borderRadius: 8, backgroundColor: colors.success, borderWidth: 3, borderColor: colors.background },
  name: { fontSize: 22, fontWeight: '800', color: colors.foreground },
  username: { color: colors.primary, fontSize: 15, fontWeight: '600', marginTop: 2 },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6, borderWidth: 1, borderColor: colors.primary + '40', borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 3 },
  verifiedText: { color: colors.primary, fontSize: 11, fontWeight: '600' },
  statsRow: { flexDirection: 'row', width: '100%', backgroundColor: colors.surface1, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, marginBottom: 20 },
  stat: { flex: 1, alignItems: 'center', paddingVertical: 16 },
  statBorder: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: colors.border },
  statValue: { fontSize: 20, fontWeight: '800', color: colors.primary },
  statLabel: { color: colors.muted, fontSize: 11, marginTop: 2 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 20 },
  infoText: { color: colors.muted, fontSize: 14 },
  section: { width: '100%', marginBottom: 20 },
  sectionTitle: { color: colors.primary, fontSize: 11, fontWeight: '700', letterSpacing: 2, marginBottom: 10 },
  motoCard: { backgroundColor: colors.surface1, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, borderLeftWidth: 3, borderLeftColor: colors.primary, padding: 12 },
  motoName: { color: colors.foreground, fontWeight: '700', fontSize: 14 },
  motoSub: { color: colors.muted, fontSize: 12, marginTop: 2 },
  actions: { width: '100%', gap: 10 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface1, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 16 },
  actionText: { color: colors.foreground, fontSize: 15, fontWeight: '600' },
  logoutBtn: { borderColor: colors.danger + '40', backgroundColor: colors.danger + '10' },
});
