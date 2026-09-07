import { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, Image, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getSession } from '@/lib/auth';
import { colors, radius } from '@/constants/theme';
import { getAmigos } from '@/lib/api';

interface Amigo {
  id: string;
  username: string;
  nombre: string;
  apellidos: string;
  avatar_url: string | null;
  verified: boolean;
  online: boolean;
}

export default function AmigosScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const router = useRouter();
  const [amigos, setAmigos] = useState<Amigo[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const session = await getSession();
    if (!session) { setForbidden(true); setLoading(false); return; }

    const { status, data } = await getAmigos(username, session.token);
    if (status === 403) { setForbidden(true); setLoading(false); return; }
    if (status === 404) { setNotFound(true); setLoading(false); return; }
    if (data) setAmigos(data);
    setLoading(false);
  }, [username]);

  useEffect(() => { load(); }, [load]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  return (
    <View style={s.screen}>
      <View style={s.header}>
        <TouchableOpacity style={s.back} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={colors.foreground} />
          <Text style={s.backText}>Volver</Text>
        </TouchableOpacity>
        <Text style={s.eyebrow}>COMUNIDAD</Text>
        <Text style={s.title}>AMIGOS DE @{username}</Text>
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator color={colors.primary} /></View>
      ) : (
        <FlatList
          data={amigos}
          keyExtractor={(item) => item.id}
          contentContainerStyle={amigos.length === 0 ? [s.list, { flexGrow: 1 }] : s.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListEmptyComponent={
            forbidden ? (
              <View style={s.empty}>
                <Ionicons name="lock-closed-outline" size={40} color={colors.muted} style={{ opacity: 0.4 }} />
                <Text style={s.emptyText}>No eres amigo de este usuario</Text>
              </View>
            ) : notFound ? (
              <View style={s.empty}>
                <Text style={s.emptyText}>Usuario no encontrado</Text>
              </View>
            ) : (
              <View style={s.empty}>
                <Ionicons name="people-outline" size={40} color={colors.muted} style={{ opacity: 0.4 }} />
                <Text style={s.emptyText}>Todavía no tiene amigos</Text>
              </View>
            )
          }
          renderItem={({ item }) => {
            const initials = `${item.nombre.charAt(0)}${item.apellidos?.charAt(0) ?? ''}`.toUpperCase();
            return (
              <TouchableOpacity style={s.card} onPress={() => router.push(`/perfil/${item.username}` as any)}>
                <View style={s.avatarWrap}>
                  {item.avatar_url
                    ? <Image source={{ uri: item.avatar_url }} style={s.avatarImg} />
                    : <Text style={s.avatarText}>{initials}</Text>
                  }
                  {item.online && <View style={s.onlineDot} />}
                </View>

                <View style={s.info}>
                  <View style={s.nameRow}>
                    <Text style={s.name} numberOfLines={1}>{item.nombre} {item.apellidos}</Text>
                    {item.verified && <Ionicons name="shield-checkmark" size={14} color={colors.primary} />}
                  </View>
                  <Text style={s.username} numberOfLines={1}>@{item.username}</Text>
                </View>

                <Ionicons name="chevron-forward" size={18} color={colors.muted} />
              </TouchableOpacity>
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
  onlineDot: { position: 'absolute', bottom: 2, right: 2, width: 12, height: 12, borderRadius: 6, backgroundColor: colors.success, borderWidth: 2, borderColor: colors.surface1 },
  info: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { color: colors.foreground, fontWeight: '700', fontSize: 14, flexShrink: 1 },
  username: { color: colors.muted, fontSize: 12, marginTop: 2 },
});
