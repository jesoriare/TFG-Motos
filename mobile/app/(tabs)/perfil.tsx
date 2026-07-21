import { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, Alert, RefreshControl } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getSession, subscribe } from '@/lib/auth';
import { colors, radius } from '@/constants/theme';
import { getSolicitudesAmistad, getAmigosCount, getMe, getRutas, logout } from '@/lib/api';
import ChatAccess from '@/components/ChatAccess';

function SinSesion() {
  const router = useRouter();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
      <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: colors.surface2, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
        <Ionicons name="person-outline" size={36} color={colors.muted} />
      </View>
      <Text style={{ fontSize: 26, fontWeight: '900', color: colors.foreground, marginBottom: 8 }}>TU PERFIL</Text>
      <Text style={{ color: colors.muted, fontSize: 14, textAlign: 'center', marginBottom: 32, lineHeight: 22 }}>
        Inicia sesión para ver tu perfil, rutas publicadas y conectar con otros moteros.
      </Text>
      <TouchableOpacity
        style={{ backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 14, paddingHorizontal: 40, marginBottom: 12, width: '100%', alignItems: 'center' }}
        onPress={() => router.push('/entrar')}
      >
        <Text style={{ color: colors.primaryFg, fontWeight: '800', fontSize: 14, letterSpacing: 1.5 }}>INICIAR SESIÓN</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={{ borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingVertical: 14, paddingHorizontal: 40, width: '100%', alignItems: 'center' }}
        onPress={() => router.push('/registro')}
      >
        <Text style={{ color: colors.foreground, fontWeight: '700', fontSize: 14 }}>Crear cuenta gratis</Text>
      </TouchableOpacity>
    </View>
  );
}

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
  const [sinSesion, setSinSesion] = useState(false);
  const [solicitudesCount, setSolicitudesCount] = useState(0);
  const [friendCount, setFriendCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(useCallback(() => {
    load();
  }, []));

  useEffect(() => {
    const unsubscribe = subscribe((session) => {
      if (!session) { setSinSesion(true); setProfile(null); }
      else { setSinSesion(false); load(); }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (sinSesion) router.replace('/entrar');
  }, [sinSesion]);

  if (sinSesion) return null;

  async function load() {
    const session = await getSession();
    if (!session) { setSinSesion(true); return; }

    const me = await getMe(session.token);
    if (me) {
      setProfile(me);
      setMotos(me.motos ?? []);
      getAmigosCount(me.username).then(setFriendCount);
    }

    const rutas = await getRutas({ username: me?.username });
    setRutasCount(rutas.length);

    const solicitudes = await getSolicitudesAmistad(session.token);
    setSolicitudesCount(solicitudes.length);
  }

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function handleLogout() {
    Alert.alert('Cerrar sesión', '¿Seguro que quieres cerrar sesión?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Cerrar sesión', style: 'destructive', onPress: async () => {
          const session = await getSession();
          if (session) await logout(session.token);
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
    <ChatAccess>
    <ScrollView
      style={s.scroll}
      contentContainerStyle={s.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
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
        <TouchableOpacity style={[s.stat, s.statBorder]} onPress={() => router.push(`/amigos/${profile.username}` as any)}>
          <Text style={s.statValue}>{friendCount}</Text>
          <Text style={s.statLabel}>Amigos</Text>
        </TouchableOpacity>
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

        <TouchableOpacity style={s.actionBtn} onPress={() => router.push('/solicitudes' as any)}>
          <Ionicons name="person-add-outline" size={18} color={colors.foreground} />
          <Text style={s.actionText}>Solicitudes de amistad</Text>
          {solicitudesCount > 0 && (
            <View style={[s.badge, { marginLeft: 'auto' }]}>
              <Text style={s.badgeText}>{solicitudesCount}</Text>
            </View>
          )}
          <Ionicons name="chevron-forward" size={16} color={colors.muted} style={{ marginLeft: solicitudesCount > 0 ? 8 : 'auto' }} />
        </TouchableOpacity>

        <TouchableOpacity style={[s.actionBtn, s.logoutBtn]} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={18} color={colors.danger} />
          <Text style={[s.actionText, { color: colors.danger }]}>Cerrar sesión</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
    </ChatAccess>
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
  actions: { width: '100%', gap: 10, paddingBottom: 100 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface1, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 16 },
  actionText: { color: colors.foreground, fontSize: 15, fontWeight: '600' },
  logoutBtn: { borderColor: colors.danger + '40', backgroundColor: colors.danger + '10' },
  badge: { backgroundColor: colors.primary, borderRadius: radius.full, minWidth: 22, height: 22, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  badgeText: { color: colors.primaryFg, fontSize: 12, fontWeight: '800' },
});
