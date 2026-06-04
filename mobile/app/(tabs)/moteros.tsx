import { useEffect, useState, useCallback } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getRiders } from '@/lib/api';
import { colors, radius } from '@/constants/theme';

const TIPOS = ['Todos', 'Sport', 'Naked', 'Adventure', 'Custom', 'Touring', 'Enduro'];

const MOCK_RIDERS = [
  { id: '1', nombre: 'Carlos', apellidos: 'Mendoza', username: 'carlos_ducatero', avatar_url: null, zona: 'Madrid Norte', verified: true, online: true, motos: [{ marca_modelo: 'Ducati Streetfighter 950', cilindrada: 950, tipo: 'naked' }] },
  { id: '2', nombre: 'Ana', apellidos: 'Rodríguez', username: 'ana_bmwrider', avatar_url: null, zona: 'Madrid Centro', verified: true, online: true, motos: [{ marca_modelo: 'BMW R 1250 GS', cilindrada: 1254, tipo: 'adventure' }] },
  { id: '3', nombre: 'Javier', apellidos: 'Prados', username: 'javi_ktm', avatar_url: null, zona: 'Getafe', verified: false, online: true, motos: [{ marca_modelo: 'KTM 890 Duke R', cilindrada: 890, tipo: 'naked' }] },
  { id: '4', nombre: 'María', apellidos: 'López', username: 'maria_harley', avatar_url: null, zona: 'Alcalá de Henares', verified: true, online: false, motos: [{ marca_modelo: 'Harley-Davidson Iron 883', cilindrada: 883, tipo: 'custom' }] },
  { id: '5', nombre: 'Roberto', apellidos: 'Sanz', username: 'rob_honda', avatar_url: null, zona: 'Pozuelo', verified: true, online: true, motos: [{ marca_modelo: 'Honda Africa Twin 1100', cilindrada: 1100, tipo: 'adventure' }] },
  { id: '6', nombre: 'Lucía', apellidos: 'García', username: 'luci_kawasaki', avatar_url: null, zona: 'Leganés', verified: false, online: false, motos: [{ marca_modelo: 'Kawasaki Z900', cilindrada: 900, tipo: 'naked' }] },
];

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
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async (q: string, t: string) => {
    setLoading(true);
    const data = await getRiders(q, t);
    setRiders(data?.length ? data : MOCK_RIDERS);
    setLoading(false);
  }, []);

  useEffect(() => { fetch('', 'Todos'); }, [fetch]);

  useEffect(() => {
    const t = setTimeout(() => fetch(query, tipo), 300);
    return () => clearTimeout(t);
  }, [query, tipo, fetch]);

  return (
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
        style={{ maxHeight: 40, marginBottom: 14 }}
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

      {/* Lista */}
      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={riders}
          keyExtractor={r => r.id}
          contentContainerStyle={{ padding: 20, paddingTop: 0, gap: 12 }}
          ListEmptyComponent={<Text style={s.empty}>No se encontraron moteros</Text>}
          renderItem={({ item: r }) => {
            const moto = r.motos?.[0];
            const initials = `${r.nombre.charAt(0)}${r.apellidos?.charAt(0) ?? ''}`.toUpperCase();
            return (
              <View style={s.card}>
                <View style={s.cardTop}>
                  <View style={s.avatar}>
                    <Text style={s.avatarText}>{initials}</Text>
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
  card: { backgroundColor: colors.surface1, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 10 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 44, height: 44, borderRadius: 10, backgroundColor: colors.primary + '30', alignItems: 'center', justifyContent: 'center' },
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
