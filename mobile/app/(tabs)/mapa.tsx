import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path, Defs, Pattern, Rect, Line } from 'react-native-svg';
import { supabase } from '@/lib/supabase';
import { colors, radius } from '@/constants/theme';
import ChatAccess from '@/components/ChatAccess';

const { width } = Dimensions.get('window');
const MAP_HEIGHT = width * 0.85;

const TIPO_ICON: Record<string, string> = {
  control_gc: 'shield', radar: 'eye', firme_mal_estado: 'warning',
  accidente: 'warning', obras: 'construct', otro: 'alert-circle',
};
const TIPO_COLOR: Record<string, string> = {
  control_gc: colors.danger, radar: colors.warning ?? '#EAB308',
  firme_mal_estado: colors.amber, accidente: colors.danger,
  obras: colors.amber, otro: colors.muted,
};
const MAP_POSITIONS = [
  { x: 35, y: 38 }, { x: 58, y: 52 }, { x: 72, y: 28 },
  { x: 22, y: 64 }, { x: 48, y: 20 }, { x: 80, y: 45 },
];

interface LiveRider {
  user_id: string; lat: number; lng: number;
  profiles: { username: string; online: boolean; motos: { marca_modelo: string }[] };
}
interface Incidencia {
  id: string; tipo: string; via: string; severidad: string;
}

export default function MapaScreen() {
  const [riders, setRiders] = useState<LiveRider[]>([]);
  const [incidencias, setIncidencias] = useState<Incidencia[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    const [{ data: ubicData }, { data: incData }] = await Promise.all([
      supabase.from('ubicaciones').select('user_id, lat, lng, profiles(username, online, motos(marca_modelo))'),
      supabase.from('incidencias').select('id, tipo, via, severidad').eq('activa', true).gt('expires_at', new Date().toISOString()),
    ]);
    if (ubicData) setRiders(ubicData as unknown as LiveRider[]);
    if (incData) setIncidencias(incData as Incidencia[]);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const onlineRiders = riders.filter(r => r.profiles?.online);

  return (
    <ChatAccess>
    <View style={s.container}>
      <View style={s.header}>
        <View>
          <Text style={s.title}>MAPA</Text>
          <Text style={s.sub}>En tiempo real</Text>
        </View>
        <View style={s.onlineBadge}>
          <View style={s.onlineDot} />
          <Text style={s.onlineText}>{onlineRiders.length} en línea</Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 20 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Mapa decorativo */}
        <View style={[s.mapContainer, { height: MAP_HEIGHT }]}>
          <Svg width="100%" height="100%" style={StyleSheet.absoluteFillObject}>
            <Defs>
              <Pattern id="grid" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                <Line x1="40" y1="0" x2="0" y2="0" stroke="hsl(220,10%,25%)" strokeWidth="0.5" />
                <Line x1="0" y1="0" x2="0" y2="40" stroke="hsl(220,10%,25%)" strokeWidth="0.5" />
              </Pattern>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#grid)" />
            <Path d={`M ${width*0.05} ${MAP_HEIGHT*0.5} Q ${width*0.25} ${MAP_HEIGHT*0.2} ${width*0.55} ${MAP_HEIGHT*0.35} T ${width*0.92} ${MAP_HEIGHT*0.4}`}
              fill="none" stroke="hsl(220,10%,22%)" strokeWidth="5" />
            <Path d={`M ${width*0.05} ${MAP_HEIGHT*0.5} Q ${width*0.25} ${MAP_HEIGHT*0.2} ${width*0.55} ${MAP_HEIGHT*0.35} T ${width*0.92} ${MAP_HEIGHT*0.4}`}
              fill="none" stroke={colors.primary + '60'} strokeWidth="2.5" strokeDasharray="10,5" />
            <Path d={`M ${width*0.15} ${MAP_HEIGHT*0.8} Q ${width*0.45} ${MAP_HEIGHT*0.6} ${width*0.72} ${MAP_HEIGHT*0.7}`}
              fill="none" stroke="hsl(220,10%,22%)" strokeWidth="4" />
            <Path d={`M ${width*0.6} ${MAP_HEIGHT*0.05} Q ${width*0.68} ${MAP_HEIGHT*0.4} ${width*0.75} ${MAP_HEIGHT*0.65}`}
              fill="none" stroke="hsl(220,10%,20%)" strokeWidth="3" />
          </Svg>

          {/* Incidencias como POIs (posiciones ilustrativas) */}
          {incidencias.slice(0, 4).map((inc, i) => {
            const pos = MAP_POSITIONS[i + 2] ?? MAP_POSITIONS[i];
            const icon = TIPO_ICON[inc.tipo] ?? 'warning';
            const color = TIPO_COLOR[inc.tipo] ?? colors.danger;
            return (
              <View key={inc.id} style={[s.poi, {
                left: `${pos.x}%`, top: `${pos.y}%`,
                backgroundColor: color + '20', borderColor: color + '60',
              }]}>
                <Ionicons name={icon as any} size={12} color={color} />
                <Text style={[s.poiLabel, { color }]}>{inc.via.length > 12 ? inc.via.slice(0, 12) + '…' : inc.via}</Text>
              </View>
            );
          })}

          {/* Moteros online (posiciones ilustrativas) */}
          {onlineRiders.slice(0, 4).map((rider, i) => {
            const pos = MAP_POSITIONS[i];
            const uid = rider.user_id;
            return (
              <TouchableOpacity key={uid}
                style={[s.riderPin, { left: `${pos.x}%`, top: `${pos.y}%` }]}
                onPress={() => setSelected(selected === uid ? null : uid)}
              >
                <View style={[s.riderCircle, { borderColor: colors.primary, backgroundColor: colors.primary + '25' }]}>
                  <Ionicons name="navigate" size={14} color={colors.primary} />
                  <View style={s.liveIndicator} />
                </View>
                {selected === uid && (
                  <View style={s.tooltip}>
                    <Text style={s.tooltipName}>@{rider.profiles?.username}</Text>
                    <Text style={s.tooltipBike}>{rider.profiles?.motos?.[0]?.marca_modelo ?? 'Sin moto'}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}

          <View style={s.zoomControls}>
            {['+', '−'].map(c => (
              <TouchableOpacity key={c} style={s.zoomBtn}>
                <Text style={s.zoomText}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={s.legend}>
            <Text style={s.legendTitle}>LEYENDA</Text>
            <View style={s.legendItem}><Ionicons name="navigate" size={11} color={colors.primary} /><Text style={[s.legendText, { color: colors.primary }]}>Moteros online</Text></View>
            <View style={s.legendItem}><Ionicons name="eye" size={11} color={colors.success} /><Text style={[s.legendText, { color: colors.success }]}>Miradores</Text></View>
            <View style={s.legendItem}><Ionicons name="warning" size={11} color={colors.danger} /><Text style={[s.legendText, { color: colors.danger }]}>Incidencias</Text></View>
            <View style={s.legendItem}><Ionicons name="cafe" size={11} color={colors.amber} /><Text style={[s.legendText, { color: colors.amber }]}>Paradas</Text></View>
          </View>
        </View>

        <View style={s.panel}>
          {/* Grupo activo / moteros online */}
          <View style={s.panelCard}>
            <Text style={s.panelTitle}>MOTEROS EN LÍNEA ({onlineRiders.length})</Text>
            {riders.length === 0 ? (
              <Text style={s.empty}>Cargando...</Text>
            ) : onlineRiders.length === 0 ? (
              <Text style={s.empty}>Ningún motero conectado ahora</Text>
            ) : (
              onlineRiders.slice(0, 5).map(r => (
                <View key={r.user_id} style={s.riderRow}>
                  <View style={[s.dot, { backgroundColor: colors.success }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.riderName}>@{r.profiles?.username}</Text>
                    <Text style={s.riderBike}>{r.profiles?.motos?.[0]?.marca_modelo ?? 'Sin moto'}</Text>
                  </View>
                  <Text style={s.liveBadge}>● Live</Text>
                </View>
              ))
            )}
          </View>

          {/* Incidencias activas */}
          {incidencias.length > 0 && (
            <View style={s.panelCard}>
              <Text style={s.panelTitle}>ALERTAS ACTIVAS ({incidencias.length})</Text>
              {incidencias.slice(0, 3).map(inc => {
                const icon = TIPO_ICON[inc.tipo] ?? 'warning';
                const color = TIPO_COLOR[inc.tipo] ?? colors.danger;
                return (
                  <View key={inc.id} style={s.riderRow}>
                    <Ionicons name={icon as any} size={14} color={color} />
                    <View style={{ flex: 1 }}>
                      <Text style={s.riderName}>{inc.tipo.replace(/_/g, ' ')}</Text>
                      <Text style={s.riderBike}>{inc.via}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          <TouchableOpacity style={s.joinBtn}>
            <Ionicons name="people" size={16} color={colors.primaryFg} />
            <Text style={s.joinBtnText}>UNIRME A UNA RUTA</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
    </ChatAccess>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16 },
  title: { fontSize: 36, fontWeight: '900', color: colors.foreground },
  sub: { color: colors.primary, fontSize: 13, fontWeight: '700' },
  onlineBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.success + '20', borderRadius: radius.full, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: colors.success + '40' },
  onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success },
  onlineText: { color: colors.success, fontSize: 12, fontWeight: '700' },
  mapContainer: { marginHorizontal: 16, borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface2 },
  poi: { position: 'absolute', flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: radius.full, paddingHorizontal: 7, paddingVertical: 4, transform: [{ translateX: -40 }, { translateY: -12 }] },
  poiLabel: { fontSize: 9, fontWeight: '700' },
  riderPin: { position: 'absolute', transform: [{ translateX: -18 }, { translateY: -18 }], zIndex: 10 },
  riderCircle: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  liveIndicator: { position: 'absolute', top: -2, right: -2, width: 10, height: 10, borderRadius: 5, backgroundColor: colors.success, borderWidth: 2, borderColor: colors.surface2 },
  tooltip: { position: 'absolute', top: 40, left: '50%', transform: [{ translateX: -50 }], backgroundColor: colors.surface1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 8, paddingVertical: 6, minWidth: 100, zIndex: 20 },
  tooltipName: { color: colors.foreground, fontWeight: '700', fontSize: 11 },
  tooltipBike: { color: colors.muted, fontSize: 10 },
  zoomControls: { position: 'absolute', top: 12, right: 12, gap: 4 },
  zoomBtn: { width: 32, height: 32, backgroundColor: colors.surface1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  zoomText: { color: colors.foreground, fontWeight: '700', fontSize: 16 },
  legend: { position: 'absolute', bottom: 12, left: 12, backgroundColor: colors.surface1 + 'EE', borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 10, gap: 5 },
  legendTitle: { color: colors.foreground, fontWeight: '700', fontSize: 9, letterSpacing: 1, marginBottom: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendText: { fontSize: 10 },
  panel: { padding: 16, gap: 12 },
  panelCard: { backgroundColor: colors.surface1, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 10 },
  panelTitle: { color: colors.primary, fontSize: 10, fontWeight: '700', letterSpacing: 2 },
  riderRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  riderName: { color: colors.foreground, fontWeight: '700', fontSize: 13 },
  riderBike: { color: colors.muted, fontSize: 11 },
  liveBadge: { color: colors.success, fontSize: 11, fontWeight: '700' },
  empty: { color: colors.muted, fontSize: 12, textAlign: 'center', paddingVertical: 8 },
  joinBtn: { backgroundColor: colors.primary, borderRadius: radius.lg, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  joinBtnText: { color: colors.primaryFg, fontWeight: '800', fontSize: 13, letterSpacing: 1 },
});
