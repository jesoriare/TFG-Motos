import { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, TextInput, ScrollView, Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getRutas } from '@/lib/api';
import { colors, radius } from '@/constants/theme';
import { CIUDADES_ESPANA } from '@/data/ciudades-espana';
import ChatAccess from '@/components/ChatAccess';

const DIFICULTAD_COLOR: Record<string, string> = {
  facil: colors.success, media: colors.amber,
  media_alta: '#F97316', alta: colors.danger,
};
const DIFICULTAD_LABEL: Record<string, string> = {
  facil: 'Fácil', media: 'Media', media_alta: 'Media-Alta', alta: 'Alta',
};

interface Ruta {
  id: string; nombre: string; region: string;
  distancia_km: number; duracion_min: number;
  dificultad: string; tags: string[];
  rating: number | null; num_valoraciones: number;
  profiles: { username: string };
}

function formatDuracion(min: number) {
  const h = Math.floor(min / 60), m = min % 60;
  return h > 0 ? `${h}h ${m > 0 ? `${m}min` : ''}`.trim() : `${m}min`;
}

export default function RutasScreen() {
  const router = useRouter();
  const [rutas, setRutas] = useState<Ruta[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [regionFilter, setRegionFilter] = useState('');
  const [regionModal, setRegionModal] = useState(false);
  const [regionQuery, setRegionQuery] = useState('');

  async function fetchRutas(region = regionFilter) {
    const data = await getRutas(region ? { region } : {});
    setRutas(data ?? []);
    setLoading(false);
  }

  async function onRefresh() {
    setRefreshing(true);
    await fetchRutas();
    setRefreshing(false);
  }

  useFocusEffect(useCallback(() => {
    setLoading(true);
    fetchRutas();
  }, [regionFilter]));

  function applyRegion(ciudad: string) {
    setRegionFilter(ciudad);
    setRegionModal(false);
    setRegionQuery('');
    setLoading(true);
    fetchRutas(ciudad);
  }

  function clearRegion() {
    setRegionFilter('');
    setLoading(true);
    fetchRutas('');
  }

  return (
    <ChatAccess>
    <View style={s.container}>
      <View style={s.header}>
        <View>
          <Text style={s.title}>RUTAS</Text>
          <Text style={s.sub}>Épicas y publicadas por la comunidad</Text>
        </View>
        <TouchableOpacity style={s.crearBtn} onPress={() => router.push('/rutas/crear' as any)}>
          <Ionicons name="add" size={18} color={colors.primaryFg} />
          <Text style={s.crearBtnText}>Crear</Text>
        </TouchableOpacity>
      </View>

      {/* Filtro región */}
      <View style={s.filterRow}>
        <TouchableOpacity
          style={[s.filterBtn, regionFilter && s.filterBtnActive]}
          onPress={() => { setRegionQuery(''); setRegionModal(true); }}
        >
          <Ionicons name="location-outline" size={14} color={regionFilter ? colors.primary : colors.muted} />
          <Text style={[s.filterBtnText, regionFilter && { color: colors.primary }]} numberOfLines={1}>
            {regionFilter || 'Filtrar por región...'}
          </Text>
          {regionFilter
            ? <TouchableOpacity onPress={clearRegion} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={16} color={colors.primary} />
              </TouchableOpacity>
            : <Ionicons name="chevron-down" size={14} color={colors.muted} />
          }
        </TouchableOpacity>
        {regionFilter && !loading && (
          <Text style={s.filterCount}>{rutas.length} {rutas.length === 1 ? 'ruta' : 'rutas'}</Text>
        )}
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={rutas}
          keyExtractor={r => r.id}
          contentContainerStyle={{ padding: 20, paddingTop: 12, paddingBottom: 100, gap: 12 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={s.emptyContainer}>
              <Ionicons name="map-outline" size={48} color={colors.muted + '40'} />
              <Text style={s.emptyTitle}>
                {regionFilter ? `Sin rutas en "${regionFilter}"` : 'No hay rutas publicadas'}
              </Text>
              {regionFilter && (
                <TouchableOpacity style={s.clearFilterBtn} onPress={clearRegion}>
                  <Ionicons name="close" size={14} color={colors.muted} />
                  <Text style={s.clearFilterText}>Quitar filtro</Text>
                </TouchableOpacity>
              )}
            </View>
          }
          renderItem={({ item: r }) => {
            const difColor = DIFICULTAD_COLOR[r.dificultad] ?? colors.muted;
            return (
              <TouchableOpacity style={s.card} onPress={() => router.push(`/rutas/${r.id}` as any)} activeOpacity={0.8}>
                <View style={s.cardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.rutaNombre}>{r.nombre}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                      <Ionicons name="location-outline" size={12} color={colors.muted} />
                      <Text style={s.region}>{r.region}</Text>
                    </View>
                  </View>
                  <View style={[s.difBadge, { borderColor: difColor + '50', backgroundColor: difColor + '15' }]}>
                    <Text style={[s.difText, { color: difColor }]}>{DIFICULTAD_LABEL[r.dificultad] ?? r.dificultad}</Text>
                  </View>
                </View>

                <View style={s.stats}>
                  <View style={s.stat}>
                    <Ionicons name="navigate-outline" size={14} color={colors.primary} />
                    <Text style={s.statText}>{r.distancia_km} km</Text>
                  </View>
                  <View style={s.stat}>
                    <Ionicons name="time-outline" size={14} color={colors.primary} />
                    <Text style={s.statText}>{formatDuracion(r.duracion_min)}</Text>
                  </View>
                  {r.rating && (
                    <View style={s.stat}>
                      <Ionicons name="star" size={14} color={colors.amber} />
                      <Text style={s.statText}>{r.rating}</Text>
                    </View>
                  )}
                </View>

                {r.tags?.length > 0 && (
                  <View style={s.tagsRow}>
                    {r.tags.map(tag => (
                      <View key={tag} style={s.tag}>
                        <Text style={s.tagText}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                )}

                <Text style={s.autor}>por @{r.profiles?.username ?? 'anónimo'}</Text>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* Modal selector región */}
      <Modal visible={regionModal} transparent animationType="fade" onRequestClose={() => { setRegionModal(false); setRegionQuery(''); }}>
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => { setRegionModal(false); setRegionQuery(''); }}>
          <TouchableOpacity style={s.modalCard} activeOpacity={1} onPress={() => {}}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Filtrar por región</Text>
              <TouchableOpacity onPress={() => { setRegionModal(false); setRegionQuery(''); }}>
                <Ionicons name="close" size={22} color={colors.muted} />
              </TouchableOpacity>
            </View>
            <View style={s.modalSearch}>
              <Ionicons name="search" size={16} color={colors.muted} />
              <TextInput
                style={s.modalInput}
                value={regionQuery}
                onChangeText={setRegionQuery}
                placeholder="Buscar ciudad..."
                placeholderTextColor={colors.muted}
                autoFocus
              />
            </View>
            <ScrollView style={{ maxHeight: 380 }} keyboardShouldPersistTaps="handled">
              {regionFilter && (
                <TouchableOpacity style={s.ciudadItem} onPress={clearRegion}>
                  <Ionicons name="close-circle-outline" size={16} color={colors.danger} style={{ marginRight: 8 }} />
                  <Text style={{ color: colors.danger, fontSize: 14 }}>Quitar filtro</Text>
                </TouchableOpacity>
              )}
              {CIUDADES_ESPANA.filter(c => c.toLowerCase().includes(regionQuery.toLowerCase())).slice(0, 60).map(ciudad => (
                <TouchableOpacity
                  key={ciudad}
                  style={[s.ciudadItem, regionFilter === ciudad && s.ciudadItemActive]}
                  onPress={() => applyRegion(ciudad)}
                >
                  {regionFilter === ciudad && <Ionicons name="checkmark" size={16} color={colors.primary} style={{ marginRight: 8 }} />}
                  <Text style={[s.ciudadText, regionFilter === ciudad && { color: colors.primary }]}>{ciudad}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
    </ChatAccess>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: 20, paddingTop: 56, paddingBottom: 12 },
  title: { fontSize: 36, fontWeight: '900', color: colors.foreground },
  sub: { color: colors.primary, fontSize: 13, fontWeight: '700' },
  crearBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primary, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 8 },
  crearBtnText: { color: colors.primaryFg, fontWeight: '800', fontSize: 13 },
  filterRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingBottom: 12 },
  filterBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.surface2, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 10 },
  filterBtnActive: { borderColor: colors.primary + '60', backgroundColor: colors.primary + '10' },
  filterBtnText: { flex: 1, color: colors.muted, fontSize: 13 },
  filterCount: { color: colors.muted, fontSize: 12, flexShrink: 0 },
  card: { backgroundColor: colors.surface1, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 10 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  rutaNombre: { color: colors.foreground, fontWeight: '800', fontSize: 16 },
  region: { color: colors.muted, fontSize: 12 },
  difBadge: { borderWidth: 1, borderRadius: radius.full, paddingHorizontal: 8, paddingVertical: 3 },
  difText: { fontSize: 10, fontWeight: '700' },
  stats: { flexDirection: 'row', gap: 16 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText: { color: colors.muted, fontSize: 13 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { backgroundColor: colors.surface3, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 8, paddingVertical: 3 },
  tagText: { color: colors.muted, fontSize: 11 },
  autor: { color: colors.muted, fontSize: 11, textAlign: 'right' },
  emptyContainer: { alignItems: 'center', marginTop: 48, gap: 8 },
  emptyTitle: { color: colors.foreground, fontWeight: '700', fontSize: 15, textAlign: 'center' },
  clearFilterBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 8 },
  clearFilterText: { color: colors.muted, fontSize: 13 },
  modalOverlay: { flex: 1, backgroundColor: '#000000AA', paddingTop: 100, paddingHorizontal: 0 },
  modalCard: { backgroundColor: colors.surface1, flex: 1, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  modalTitle: { color: colors.foreground, fontWeight: '700', fontSize: 16 },
  modalSearch: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.surface3, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10 },
  modalInput: { flex: 1, color: colors.foreground, fontSize: 14 },
  ciudadItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: colors.border + '40' },
  ciudadItemActive: { backgroundColor: colors.primary + '10' },
  ciudadText: { color: colors.foreground, fontSize: 14 },
});
