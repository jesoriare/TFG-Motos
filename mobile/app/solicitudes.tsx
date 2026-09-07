import { useEffect, useState } from 'react';
import { View, Text, FlatList, Image, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getSession } from '@/lib/auth';
import { colors, radius } from '@/constants/theme';
import { getSolicitudesAmistad, aceptarSolicitudAmistad, rechazarSolicitudAmistad } from '@/lib/api';

interface Solicitud {
  id: string;
  created_at: string;
  profiles: {
    username: string;
    nombre: string;
    apellidos: string;
    avatar_url: string | null;
    verified: boolean;
  };
}

export default function SolicitudesScreen() {
  const router = useRouter();
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    const session = await getSession();
    if (!session) { router.replace('/entrar'); return; }
    setSolicitudes(await getSolicitudesAmistad(session.token));
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function handleAceptar(id: string) {
    const session = await getSession();
    if (!session) return;
    setProcessingIds(prev => new Set(prev).add(id));
    if (await aceptarSolicitudAmistad(id, session.token)) {
      setSolicitudes(prev => prev.filter(s => s.id !== id));
    }
    setProcessingIds(prev => { const next = new Set(prev); next.delete(id); return next; });
  }

  async function handleRechazar(id: string) {
    const session = await getSession();
    if (!session) return;
    setProcessingIds(prev => new Set(prev).add(id));
    if (await rechazarSolicitudAmistad(id, session.token)) {
      setSolicitudes(prev => prev.filter(s => s.id !== id));
    }
    setProcessingIds(prev => { const next = new Set(prev); next.delete(id); return next; });
  }

  return (
    <View style={s.screen}>
      <View style={s.header}>
        <TouchableOpacity style={s.back} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={colors.foreground} />
          <Text style={s.backText}>Volver</Text>
        </TouchableOpacity>
        <Text style={s.eyebrow}>COMUNIDAD</Text>
        <Text style={s.title}>SOLICITUDES DE AMISTAD</Text>
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator color={colors.primary} /></View>
      ) : (
        <FlatList
          data={solicitudes}
          keyExtractor={(item) => item.id}
          contentContainerStyle={solicitudes.length === 0 ? [s.list, { flexGrow: 1 }] : s.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="people-outline" size={40} color={colors.muted} style={{ opacity: 0.4 }} />
              <Text style={s.emptyText}>No tienes solicitudes de amistad pendientes</Text>
            </View>
          }
          renderItem={({ item }) => {
            const p = item.profiles;
            const initials = `${p.nombre.charAt(0)}${p.apellidos?.charAt(0) ?? ''}`.toUpperCase();
            const processing = processingIds.has(item.id);
            return (
              <View style={s.card}>
                <TouchableOpacity style={s.avatarWrap} onPress={() => router.push(`/perfil/${p.username}` as any)}>
                  {p.avatar_url
                    ? <Image source={{ uri: p.avatar_url }} style={s.avatarImg} />
                    : <Text style={s.avatarText}>{initials}</Text>
                  }
                </TouchableOpacity>

                <TouchableOpacity style={s.info} onPress={() => router.push(`/perfil/${p.username}` as any)}>
                  <View style={s.nameRow}>
                    <Text style={s.name} numberOfLines={1}>{p.nombre} {p.apellidos}</Text>
                    {p.verified && <Ionicons name="shield-checkmark" size={14} color={colors.primary} />}
                  </View>
                  <Text style={s.username} numberOfLines={1}>@{p.username}</Text>
                </TouchableOpacity>

                <View style={s.actions}>
                  <TouchableOpacity
                    style={[s.actionBtn, s.acceptBtn]}
                    onPress={() => handleAceptar(item.id)}
                    disabled={processing}
                  >
                    {processing ? <ActivityIndicator size="small" color={colors.success} /> : <Ionicons name="checkmark" size={18} color={colors.success} />}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={s.actionBtn}
                    onPress={() => handleRechazar(item.id)}
                    disabled={processing}
                  >
                    <Ionicons name="close" size={18} color={colors.muted} />
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      )}
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 10 },
  emptyText: { color: colors.muted, fontSize: 14, textAlign: 'center' },
  list: { paddingHorizontal: 20, paddingBottom: 40, gap: 10 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.surface1, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 12,
  },
  avatarWrap: {
    width: 48, height: 48, borderRadius: radius.md, overflow: 'hidden',
    backgroundColor: 'rgba(255,107,26,0.15)', alignItems: 'center', justifyContent: 'center',
  },
  avatarImg: { width: '100%', height: '100%' },
  avatarText: { color: colors.primary, fontWeight: '800', fontSize: 15 },
  info: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { color: colors.foreground, fontWeight: '700', fontSize: 14, flexShrink: 1 },
  username: { color: colors.muted, fontSize: 12, marginTop: 2 },
  actions: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    width: 36, height: 36, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center',
  },
  acceptBtn: { borderColor: colors.success + '40', backgroundColor: 'rgba(34,197,94,0.1)' },
});
