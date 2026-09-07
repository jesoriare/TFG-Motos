import { useEffect, useState, useCallback } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getRiders } from '@/lib/api';
import { getSession } from '@/lib/auth';
import { colors, radius } from '@/constants/theme';
import ChatAccess from '@/components/ChatAccess';

const TIPOS = ['Todos', 'Sport', 'Naked', 'Adventure', 'Custom', 'Touring', 'Enduro'];


interface Rider {
  id: string; nombre: string; apellidos: string; username: string;
  avatar_url: string | null; zona: string | null; verified: boolean; online: boolean;
  motos: { marca_modelo: string; cilindrada: number; tipo: string }[];
}

export default function MoteroScreen() {
  const router = useRouter();
  const [riders, setRiders] = useState<Rider[]>([]);
  const [query, setQuery] = useState('');
  const [tipo, setTipo] = useState('Todos');
  const [cilMin, setCilMin] = useState('');
  const [cilMax, setCilMax] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    getSession().then((session) => setCurrentUserId(session?.user.id ?? null));
  }, []);

  const fetch = useCallback(async (q: string, t: string, min: string, max: string) => {
    setLoading(true);
    const data = await getRiders(q, t, min, max);
    setRiders(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetch('', 'Todos', '', ''); }, [fetch]);

  useEffect(() => {
    const t = setTimeout(() => fetch(query, tipo, cilMin, cilMax), 300);
    return () => clearTimeout(t);
  }, [query, tipo, cilMin, cilMax, fetch]);

  async function onRefresh() {
    setRefreshing(true);
    await fetch(query, tipo, cilMin, cilMax);
    setRefreshing(false);
  }

  return (
    <ChatAccess>
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.title}>MOTEROS</Text>
        <Text style={s.sub}>Cerca de ti</Text>
      </View>

      {/* Buscador */}
      <View style={s.searchRow}>
        <Ionicons name="search" size={16} color={colors.muted} style={{ marginRight: 8 }} />
        <TextInput
          style={s.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Buscar por zona, nombre o @usuario..."
          placeholderTextColor={colors.muted}
          autoCapitalize="none"
        />
        {query ? <TouchableOpacity onPress={() => setQuery('')}><Ionicons name="close" size={16} color={colors.muted} /></TouchableOpacity> : null}
      </View>

      {/* Filtros tipo */}
      <FlatList
        horizontal
        data={TIPOS}
        keyExtractor={i => i}
        showsHorizontalScrollIndicator={false}
        style={{ maxHeight: 40, marginBottom: 10 }}
        contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[s.chip, tipo === item && s.chipActive]}
            onPress={() => setTipo(item)}
          >
            <Text style={[s.chipText, tipo === item && s.chipTextActive]}>{item.toUpperCase()}</Text>
          </TouchableOpacity>
        )}
      />

      {/* Filtro cilindrada */}
      <View style={s.cilRow}>
        <Text style={s.cilLabel}>CILINDRADA:</Text>
        <TextInput
          style={s.cilInput}
          value={cilMin}
          onChangeText={setCilMin}
          placeholder="Mín cc"
          placeholderTextColor={colors.muted}
          keyboardType="number-pad"
        />
        <Text style={s.cilLabel}>—</Text>
        <TextInput
          style={s.cilInput}
          value={cilMax}
          onChangeText={setCilMax}
          placeholder="Máx cc"
          placeholderTextColor={colors.muted}
          keyboardType="number-pad"
        />
        {(cilMin || cilMax) ? (
          <TouchableOpacity onPress={() => { setCilMin(''); setCilMax(''); }}>
            <Ionicons name="close-circle" size={18} color={colors.muted} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Lista */}
      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={riders.filter(r => r.id !== currentUserId)}
          keyExtractor={r => r.id}
          contentContainerStyle={{ padding: 20, paddingTop: 0, paddingBottom: 100, gap: 12 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListEmptyComponent={<Text style={s.empty}>No se encontraron moteros</Text>}
          renderItem={({ item: r }) => {
            const moto = r.motos?.[0];
            const initials = `${r.nombre.charAt(0)}${r.apellidos?.charAt(0) ?? ''}`.toUpperCase();
            return (
              <View style={s.card}>
                <View style={s.cardTop}>
                  <View style={s.avatar}>
                    {r.avatar_url
                      ? <Image source={{ uri: r.avatar_url }} style={s.avatarImg} />
                      : <Text style={s.avatarText}>{initials}</Text>
                    }
                    {r.online && <View style={s.onlineDot} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Text style={s.name}>{r.nombre} {r.apellidos}</Text>
                      {r.verified && <Ionicons name="shield-checkmark" size={14} color={colors.primary} />}
                    </View>
                    <Text style={s.handle}>@{r.username}</Text>
                  </View>
                  <Text style={[s.onlineText, { color: r.online ? colors.success : colors.muted }]}>
                    {r.online ? '● En línea' : '● Desconectado'}
                  </Text>
                </View>

                {moto && (
                  <View style={s.motoBox}>
                    <Text style={s.motoName}>{moto.marca_modelo}</Text>
                    <Text style={s.motoSub}>{moto.cilindrada}cc · {moto.tipo}</Text>
                  </View>
                )}

                <View style={s.cardBottom}>
                  {r.zona ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><Ionicons name="location-outline" size={12} color={colors.muted} /><Text style={s.zona}>{r.zona}</Text></View> : <View />}
                  <TouchableOpacity style={s.btn} onPress={() => router.push(`/perfil/${r.username}` as any)}>
                    <Text style={s.btnText}>VER PERFIL</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
    </ChatAccess>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16 },
  title: { fontSize: 36, fontWeight: '900', color: colors.foreground },
  sub: { color: colors.primary, fontSize: 13, fontWeight: '700' },
  searchRow: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginBottom: 14, backgroundColor: colors.surface2, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 10 },
  searchInput: { flex: 1, color: colors.foreground, fontSize: 14 },
  chip: { borderRadius: radius.full, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface2 },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.muted, fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  chipTextActive: { color: colors.primaryFg },
  cilRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, marginBottom: 14 },
  cilLabel: { color: colors.muted, fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  cilInput: {
    width: 72, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface2,
    borderRadius: radius.md, paddingHorizontal: 8, paddingVertical: 6, color: colors.foreground, fontSize: 12,
  },
  card: { backgroundColor: colors.surface1, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 10 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 44, height: 44, borderRadius: 10, backgroundColor: colors.primary + '30', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImg: { width: '100%', height: '100%' },
  avatarText: { color: colors.primary, fontWeight: '800', fontSize: 14 },
  onlineDot: { position: 'absolute', bottom: -2, right: -2, width: 12, height: 12, borderRadius: 6, backgroundColor: colors.success, borderWidth: 2, borderColor: colors.surface1 },
  name: { color: colors.foreground, fontWeight: '700', fontSize: 14 },
  handle: { color: colors.muted, fontSize: 12 },
  onlineText: { fontSize: 10, fontWeight: '600' },
  motoBox: { backgroundColor: colors.surface3, borderRadius: radius.md, padding: 10, borderLeftWidth: 3, borderLeftColor: colors.primary },
  motoName: { color: colors.foreground, fontWeight: '700', fontSize: 13 },
  motoSub: { color: colors.muted, fontSize: 11, marginTop: 2 },
  cardBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  zona: { color: colors.muted, fontSize: 12 },
  btn: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 6 },
  btnText: { color: colors.muted, fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  empty: { color: colors.muted, textAlign: 'center', marginTop: 40 },
});
