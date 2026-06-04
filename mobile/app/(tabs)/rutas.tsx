import { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getRutas } from '@/lib/api';
import { colors, radius } from '@/constants/theme';

const MOCK_RUTAS = [
  { id: '1', nombre: 'Ruta de las Águilas', region: 'Sierra de Gredos, Ávila', distancia_km: 186, duracion_min: 195, dificultad: 'media_alta', tags: ['montaña', 'curvas', 'paisaje'], rating: 4.9, num_valoraciones: 47, profiles: { username: 'carlos_ducatero' } },
  { id: '2', nombre: 'Costa Brava Express', region: 'Girona, Cataluña', distancia_km: 312, duracion_min: 255, dificultad: 'media', tags: ['costa', 'mar', 'pinos'], rating: 4.8, num_valoraciones: 89, profiles: { username: 'ana_bmwrider' } },
  { id: '3', nombre: 'Bosques del Norte', region: 'Asturias', distancia_km: 245, duracion_min: 240, dificultad: 'facil', tags: ['verde', 'lluvia', 'puertos'], rating: 4.6, num_valoraciones: 31, profiles: { username: 'rob_honda' } },
  { id: '4', nombre: 'Ruta del Mediterráneo', region: 'Valencia - Alicante', distancia_km: 280, duracion_min: 210, dificultad: 'facil', tags: ['costa', 'sol', 'naranjos'], rating: 4.7, num_valoraciones: 62, profiles: { username: 'maria_harley' } },
  { id: '5', nombre: 'Desfiladero del Cares', region: 'Picos de Europa, Asturias', distancia_km: 158, duracion_min: 180, dificultad: 'alta', tags: ['montaña', 'técnica', 'vértigo'], rating: 5.0, num_valoraciones: 23, profiles: { username: 'javi_ktm' } },
];

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

  useEffect(() => {
    getRutas().then(data => { setRutas(data?.length ? data : MOCK_RUTAS); setLoading(false); });
  }, []);

  return (
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

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={rutas}
          keyExtractor={r => r.id}
          contentContainerStyle={{ padding: 20, paddingTop: 0, gap: 12 }}
          ListEmptyComponent={<Text style={s.empty}>No hay rutas publicadas aún</Text>}
          renderItem={({ item: r }) => {
            const difColor = DIFICULTAD_COLOR[r.dificultad] ?? colors.muted;
            return (
              <View style={s.card}>
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16 },
  title: { fontSize: 36, fontWeight: '900', color: colors.foreground },
  sub: { color: colors.primary, fontSize: 13, fontWeight: '700' },
  crearBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primary, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 8 },
  crearBtnText: { color: colors.primaryFg, fontWeight: '800', fontSize: 13 },
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
  empty: { color: colors.muted, textAlign: 'center', marginTop: 40 },
});
