import { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getIncidencias } from '@/lib/api';
import { colors, radius } from '@/constants/theme';

const TIPO_ICON: Record<string, string> = {
  control_gc: 'shield', radar: 'speedometer', firme_mal_estado: 'warning',
  accidente: 'car-crash', obras: 'construct', otro: 'alert-circle',
};
const TIPO_LABEL: Record<string, string> = {
  control_gc: 'Control GC', radar: 'Radar móvil', firme_mal_estado: 'Firme en mal estado',
  accidente: 'Accidente', obras: 'Obras', otro: 'Otro',
};
const SEV_COLOR: Record<string, string> = {
  high: colors.danger, medium: colors.amber, low: '#3B82F6', resolved: colors.success,
};

interface Incidencia {
  id: string; tipo: string; descripcion: string; via: string;
  severidad: string; confirmaciones: number; created_at: string;
  profiles: { username: string };
}

function timeAgo(dateStr: string) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return 'Hace un momento';
  if (diff < 3600) return `Hace ${Math.floor(diff / 60)}min`;
  return `Hace ${Math.floor(diff / 3600)}h`;
}

export default function IncidenciasScreen() {
  const [incidencias, setIncidencias] = useState<Incidencia[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getIncidencias().then(data => { setIncidencias(data); setLoading(false); });
  }, []);

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>INCIDENCIAS</Text>
        <Text style={s.sub}>En tiempo real</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={incidencias}
          keyExtractor={i => i.id}
          contentContainerStyle={{ padding: 20, paddingTop: 0, gap: 12 }}
          ListEmptyComponent={<Text style={s.empty}>No hay incidencias activas</Text>}
          renderItem={({ item: inc }) => {
            const sevColor = SEV_COLOR[inc.severidad] ?? colors.muted;
            return (
              <View style={[s.card, { borderLeftColor: sevColor, borderLeftWidth: 3 }]}>
                <View style={s.cardTop}>
                  <View style={[s.iconBox, { backgroundColor: sevColor + '20' }]}>
                    <Ionicons name={(TIPO_ICON[inc.tipo] ?? 'alert-circle') as any} size={18} color={sevColor} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.tipo}>{TIPO_LABEL[inc.tipo] ?? inc.tipo}</Text>
                    <Text style={s.via}>{inc.via}</Text>
                  </View>
                  <View style={[s.sevBadge, { backgroundColor: sevColor + '20', borderColor: sevColor + '40' }]}>
                    <Text style={[s.sevText, { color: sevColor }]}>{inc.severidad.toUpperCase()}</Text>
                  </View>
                </View>

                <Text style={s.desc}>{inc.descripcion}</Text>

                <View style={s.footer}>
                  <Text style={s.meta}>{timeAgo(inc.created_at)}</Text>
                  <TouchableOpacity style={s.confirmBtn}>
                    <Ionicons name="checkmark-circle-outline" size={14} color={colors.muted} />
                    <Text style={s.confirmText}>{inc.confirmaciones} confirmaciones</Text>
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
  card: { backgroundColor: colors.surface1, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 10 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBox: { width: 38, height: 38, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  tipo: { color: colors.foreground, fontWeight: '700', fontSize: 14 },
  via: { color: colors.muted, fontSize: 12 },
  sevBadge: { borderWidth: 1, borderRadius: radius.full, paddingHorizontal: 8, paddingVertical: 3 },
  sevText: { fontSize: 9, fontWeight: '700', letterSpacing: 1 },
  desc: { color: colors.muted, fontSize: 13, lineHeight: 20 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  meta: { color: colors.muted, fontSize: 11 },
  confirmBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  confirmText: { color: colors.muted, fontSize: 11 },
  empty: { color: colors.muted, textAlign: 'center', marginTop: 40 },
});
