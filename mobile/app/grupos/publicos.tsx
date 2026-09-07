import { useEffect, useState } from 'react';
import { View, Text, TextInput, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getSession } from '@/lib/auth';
import { colors, radius } from '@/constants/theme';
import { getGruposPublicos, unirseAGrupo } from '@/lib/api';

interface GrupoPublico {
  id: string;
  nombre: string;
  descripcion: string | null;
  lider_username: string;
  ruta: { id: string; nombre: string; region: string } | null;
}

export default function GruposPublicosScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [grupos, setGrupos] = useState<GrupoPublico[]>([]);
  const [loading, setLoading] = useState(true);
  const [joiningIds, setJoiningIds] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function load(q: string) {
    const session = await getSession();
    if (!session) { router.replace('/entrar'); return; }
    setLoading(true);
    const data = await getGruposPublicos(q, session.token);
    setGrupos(data);
    setLoading(false);
  }

  useEffect(() => {
    const timeout = setTimeout(() => load(query), 300);
    return () => clearTimeout(timeout);
  }, [query]);

  async function handleUnirse(id: string) {
    const session = await getSession();
    if (!session) return;
    setJoiningIds(prev => new Set(prev).add(id));
    setErrors(prev => { const next = { ...prev }; delete next[id]; return next; });
    const { error } = await unirseAGrupo(id, session.token);
    setJoiningIds(prev => { const next = new Set(prev); next.delete(id); return next; });
    if (error) { setErrors(prev => ({ ...prev, [id]: error })); return; }
    router.replace(`/grupos/${id}` as any);
  }

  return (
    <View style={s.screen}>
      <View style={s.header}>
        <TouchableOpacity style={s.back} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={colors.foreground} />
          <Text style={s.backText}>Mis grupos</Text>
        </TouchableOpacity>
        <Text style={s.eyebrow}>COMUNIDAD</Text>
        <Text style={s.title}>GRUPOS PÚBLICOS</Text>

        <View style={s.searchBox}>
          <Ionicons name="search" size={16} color={colors.muted} />
          <TextInput
            style={s.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar por nombre o descripción..."
            placeholderTextColor={colors.muted}
          />
        </View>
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator color={colors.primary} /></View>
      ) : (
        <FlatList
          data={grupos}
          keyExtractor={(item) => item.id}
          contentContainerStyle={grupos.length === 0 ? [s.list, { flexGrow: 1 }] : s.list}
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="globe-outline" size={40} color={colors.muted} style={{ opacity: 0.4 }} />
              <Text style={s.emptyText}>
                {query ? 'No se encontraron grupos públicos con ese término' : 'No hay grupos públicos disponibles todavía'}
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const joining = joiningIds.has(item.id);
            return (
              <View style={s.card}>
                <View style={s.groupIcon}>
                  <Ionicons name="globe" size={20} color={colors.primary} />
                </View>
                <View style={s.info}>
                  <Text style={s.name} numberOfLines={1}>{item.nombre}</Text>
                  <Text style={s.username} numberOfLines={1}>Liderado por @{item.lider_username}</Text>
                  {item.descripcion && <Text style={s.desc} numberOfLines={2}>{item.descripcion}</Text>}
                  {errors[item.id] && <Text style={s.error}>{errors[item.id]}</Text>}
                </View>
                <TouchableOpacity style={s.joinBtn} onPress={() => handleUnirse(item.id)} disabled={joining}>
                  {joining ? <ActivityIndicator size="small" color={colors.primaryFg} /> : <Text style={s.joinBtnText}>Unirse</Text>}
                </TouchableOpacity>
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
  title: { color: colors.foreground, fontSize: 26, fontWeight: '900', letterSpacing: 0.5, marginBottom: 16 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface2,
    borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 10,
  },
  searchInput: { flex: 1, color: colors.foreground, fontSize: 13 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 10 },
  emptyText: { color: colors.muted, fontSize: 14, textAlign: 'center' },
  list: { paddingHorizontal: 20, paddingBottom: 40, gap: 10 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.surface1, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 12,
  },
  groupIcon: {
    width: 48, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,107,26,0.15)',
  },
  info: { flex: 1, minWidth: 0 },
  name: { color: colors.foreground, fontWeight: '700', fontSize: 14 },
  username: { color: colors.muted, fontSize: 12, marginTop: 2 },
  desc: { color: colors.muted, fontSize: 12, marginTop: 4, opacity: 0.8 },
  error: { color: colors.danger, fontSize: 11, marginTop: 4 },
  joinBtn: {
    backgroundColor: colors.primary, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 9,
    alignItems: 'center', justifyContent: 'center', minWidth: 64,
  },
  joinBtnText: { color: colors.primaryFg, fontWeight: '800', fontSize: 12 },
});
