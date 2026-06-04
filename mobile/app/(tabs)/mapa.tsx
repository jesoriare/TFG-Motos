import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path, Defs, Pattern, Rect, Line } from 'react-native-svg';
import { supabase } from '@/lib/supabase';
import { colors, radius } from '@/constants/theme';

const { width } = Dimensions.get('window');
const MAP_HEIGHT = width * 0.85;

const MOCK_RIDERS = [
  { id: 1, name: 'Carlos M.', bike: 'Ducati 950', online: true, x: 35, y: 38 },
  { id: 2, name: 'Ana R.', bike: 'BMW R1250', online: true, x: 58, y: 52 },
  { id: 3, name: 'Javi P.', bike: 'KTM 890', online: true, x: 72, y: 28 },
  { id: 4, name: 'Sara L.', bike: 'Honda CB650', online: false, x: 22, y: 64 },
];

const POIS = [
  { id: 1, tipo: 'mirador', label: 'Mirador Picos', x: 45, y: 22, icon: 'eye', color: colors.success },
  { id: 2, tipo: 'descanso', label: 'Bar La Curva', x: 63, y: 48, icon: 'cafe', color: colors.amber },
  { id: 3, tipo: 'alerta', label: 'Control GC', x: 30, y: 46, icon: 'warning', color: colors.danger },
  { id: 4, tipo: 'recarga', label: 'Gasolinera', x: 80, y: 62, icon: 'flash', color: colors.primary },
];

export default function MapaScreen() {
  const [liveRiders, setLiveRiders] = useState(MOCK_RIDERS);
  const [selected, setSelected] = useState<number | null>(null);

  useEffect(() => {
    // Intentar cargar riders reales del backend
    supabase.from('ubicaciones').select('user_id, lat, lng, profiles(username, online, motos(marca_modelo))').then(({ data }) => {
      if (data && data.length > 0) {
        // Si hay riders reales, mezclarlos con los mock posicionados
      }
    });
  }, []);

  const onlineCount = liveRiders.filter(r => r.online).length;

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.title}>MAPA</Text>
          <Text style={s.sub}>En tiempo real</Text>
        </View>
        <View style={s.onlineBadge}>
          <View style={s.onlineDot} />
          <Text style={s.onlineText}>{onlineCount} en línea</Text>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 20 }}>
        {/* Mapa */}
        <View style={[s.mapContainer, { height: MAP_HEIGHT }]}>
          {/* Fondo tipo mapa oscuro */}
          <Svg width="100%" height="100%" style={StyleSheet.absoluteFillObject}>
            <Defs>
              <Pattern id="grid" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                <Line x1="40" y1="0" x2="0" y2="0" stroke="hsl(220,10%,25%)" strokeWidth="0.5" />
                <Line x1="0" y1="0" x2="0" y2="40" stroke="hsl(220,10%,25%)" strokeWidth="0.5" />
              </Pattern>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#grid)" />
            {/* Carreteras simuladas */}
            <Path d={`M ${width*0.05} ${MAP_HEIGHT*0.5} Q ${width*0.25} ${MAP_HEIGHT*0.2} ${width*0.55} ${MAP_HEIGHT*0.35} T ${width*0.92} ${MAP_HEIGHT*0.4}`}
              fill="none" stroke="hsl(220,10%,22%)" strokeWidth="5" />
            <Path d={`M ${width*0.05} ${MAP_HEIGHT*0.5} Q ${width*0.25} ${MAP_HEIGHT*0.2} ${width*0.55} ${MAP_HEIGHT*0.35} T ${width*0.92} ${MAP_HEIGHT*0.4}`}
              fill="none" stroke={colors.primary + '60'} strokeWidth="2.5" strokeDasharray="10,5" />
            <Path d={`M ${width*0.15} ${MAP_HEIGHT*0.8} Q ${width*0.45} ${MAP_HEIGHT*0.6} ${width*0.72} ${MAP_HEIGHT*0.7}`}
              fill="none" stroke="hsl(220,10%,22%)" strokeWidth="4" />
            <Path d={`M ${width*0.6} ${MAP_HEIGHT*0.05} Q ${width*0.68} ${MAP_HEIGHT*0.4} ${width*0.75} ${MAP_HEIGHT*0.65}`}
              fill="none" stroke="hsl(220,10%,20%)" strokeWidth="3" />
          </Svg>

          {/* POIs */}
          {POIS.map(poi => (
            <View key={poi.id} style={[s.poi, {
              left: `${poi.x}%`, top: `${poi.y}%`,
              backgroundColor: poi.color + '20',
              borderColor: poi.color + '60',
            }]}>
              <Ionicons name={poi.icon as any} size={12} color={poi.color} />
              <Text style={[s.poiLabel, { color: poi.color }]}>{poi.label}</Text>
            </View>
          ))}

          {/* Riders */}
          {liveRiders.map(rider => (
            <TouchableOpacity
              key={rider.id}
              style={[s.riderPin, { left: `${rider.x}%`, top: `${rider.y}%` }]}
              onPress={() => setSelected(selected === rider.id ? null : rider.id)}
            >
              <View style={[s.riderCircle, {
                borderColor: rider.online ? colors.primary : colors.muted,
                backgroundColor: rider.online ? colors.primary + '25' : colors.muted + '20',
              }]}>
                <Ionicons name="navigate" size={14} color={rider.online ? colors.primary : colors.muted} />
                {rider.online && <View style={s.liveIndicator} />}
              </View>
              {selected === rider.id && (
                <View style={s.tooltip}>
                  <Text style={s.tooltipName}>{rider.name}</Text>
                  <Text style={s.tooltipBike}>{rider.bike}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}

          {/* Controles zoom (decorativos) */}
          <View style={s.zoomControls}>
            {['+', '−'].map(c => (
              <TouchableOpacity key={c} style={s.zoomBtn}>
                <Text style={s.zoomText}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Leyenda */}
          <View style={s.legend}>
            <Text style={s.legendTitle}>LEYENDA</Text>
            <View style={s.legendItem}><Ionicons name="navigate" size={11} color={colors.primary} /><Text style={[s.legendText, { color: colors.primary }]}>Moteros online</Text></View>
            <View style={s.legendItem}><Ionicons name="eye" size={11} color={colors.success} /><Text style={[s.legendText, { color: colors.success }]}>Miradores</Text></View>
            <View style={s.legendItem}><Ionicons name="warning" size={11} color={colors.danger} /><Text style={[s.legendText, { color: colors.danger }]}>Incidencias</Text></View>
            <View style={s.legendItem}><Ionicons name="cafe" size={11} color={colors.amber} /><Text style={[s.legendText, { color: colors.amber }]}>Paradas</Text></View>
          </View>
        </View>

        {/* Panel grupo activo */}
        <View style={s.panel}>
          <View style={s.panelCard}>
            <Text style={s.panelTitle}>GRUPO ACTIVO</Text>
            {liveRiders.map(r => (
              <View key={r.id} style={s.riderRow}>
                <View style={[s.dot, { backgroundColor: r.online ? colors.success : colors.muted }]} />
                <View style={{ flex: 1 }}>
                  <Text style={s.riderName}>{r.name}</Text>
                  <Text style={s.riderBike}>{r.bike}</Text>
                </View>
                {r.online && <Text style={s.liveBadge}>● Live</Text>}
              </View>
            ))}
          </View>

          <View style={s.panelCard}>
            <Text style={s.panelTitle}>RUTA ACTUAL</Text>
            <Text style={s.routeKm}>247 km</Text>
            <Text style={s.routeName}>Madrid → Cuenca circular</Text>
            {[['Duración est.', '3h 40min'], ['Paradas', '3 planificadas'], ['Dificultad', 'Media']].map(([k, v]) => (
              <View key={k} style={s.routeRow}>
                <Text style={s.routeKey}>{k}</Text>
                <Text style={[s.routeVal, k === 'Dificultad' && { color: colors.primary }]}>{v}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity style={s.joinBtn}>
            <Ionicons name="people" size={16} color={colors.primaryFg} />
            <Text style={s.joinBtnText}>UNIRME A ESTA RUTA</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
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
  tooltip: { position: 'absolute', top: 40, left: '50%', transform: [{ translateX: -50 }], backgroundColor: colors.card ?? colors.surface1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 8, paddingVertical: 6, minWidth: 100, zIndex: 20 },
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
  routeKm: { fontSize: 28, fontWeight: '900', color: colors.foreground, fontFamily: 'System' },
  routeName: { color: colors.muted, fontSize: 12, marginTop: -4, marginBottom: 6 },
  routeRow: { flexDirection: 'row', justifyContent: 'space-between' },
  routeKey: { color: colors.muted, fontSize: 12 },
  routeVal: { color: colors.foreground, fontWeight: '600', fontSize: 12 },
  joinBtn: { backgroundColor: colors.primary, borderRadius: radius.lg, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  joinBtnText: { color: colors.primaryFg, fontWeight: '800', fontSize: 13, letterSpacing: 1 },
});
