import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, Polyline, Callout, PROVIDER_DEFAULT } from 'react-native-maps';
import { getRutas, getIncidencias } from '@/lib/api';
import { colors, radius } from '@/constants/theme';
import ChatAccess from '@/components/ChatAccess';

const SPAIN_REGION = { latitude: 40.4, longitude: -3.7, latitudeDelta: 8, longitudeDelta: 8 };

const TIPO_ICON: Record<string, string> = {
  control_gc: 'shield', radar: 'eye', firme_mal_estado: 'warning',
  accidente: 'warning', obras: 'construct', otro: 'alert-circle',
};
const TIPO_LABEL: Record<string, string> = {
  control_gc: 'Control GC', radar: 'Radar', firme_mal_estado: 'Firme en mal estado',
  accidente: 'Accidente', obras: 'Obras', otro: 'Otro',
};
const SEV_COLOR: Record<string, string> = {
  high: colors.danger, medium: colors.amber, low: colors.primary, resolved: colors.success,
};

interface Waypoint { lat: number; lng: number; }
interface Ruta {
  id: string; nombre: string; region: string; distancia_km: number; dificultad: string;
  waypoints: Waypoint[];
}
interface Incidencia {
  id: string; tipo: string; via: string; descripcion: string; severidad: string;
  lat: number | string; lng: number | string;
}

export default function MapaScreen() {
  const router = useRouter();
  const [rutas, setRutas] = useState<Ruta[]>([]);
  const [incidencias, setIncidencias] = useState<Incidencia[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    const [rutasData, incData] = await Promise.all([getRutas(), getIncidencias()]);
    setRutas((rutasData ?? []) as Ruta[]);
    setIncidencias((incData ?? []) as Incidencia[]);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const activas = incidencias.filter(i => i.severidad !== 'resolved');

  return (
    <ChatAccess>
    <View style={s.container}>
      <View style={s.header}>
        <View>
          <Text style={s.title}>MAPA</Text>
          <Text style={s.sub}>Rutas e incidencias</Text>
        </View>
        <View style={s.alertBadge}>
          <View style={s.alertDot} />
          <Text style={s.alertText}>{activas.length} alertas</Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 20 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <View style={s.mapContainer}>
          <MapView
            style={{ flex: 1 }}
            provider={PROVIDER_DEFAULT}
            initialRegion={SPAIN_REGION}
          >
            {rutas.map((ruta) => {
              const pts = (ruta.waypoints ?? []).map(w => ({ latitude: w.lat, longitude: w.lng }));
              if (pts.length === 0) return null;
              return (
                <View key={ruta.id}>
                  {pts.length > 1 && (
                    <Polyline coordinates={pts} strokeColor={colors.primary} strokeWidth={3} lineDashPattern={[8, 6]} />
                  )}
                  <Marker coordinate={pts[0]}>
                    <View style={s.routePin}>
                      <Text style={s.routePinText}>R</Text>
                    </View>
                    <Callout onPress={() => router.push(`/rutas/${ruta.id}` as any)}>
                      <View style={{ maxWidth: 180 }}>
                        <Text style={s.calloutTitle}>{ruta.nombre}</Text>
                        <Text style={s.calloutSub}>{ruta.region} · {ruta.distancia_km} km</Text>
                        <Text style={s.calloutLink}>Ver ruta →</Text>
                      </View>
                    </Callout>
                  </Marker>
                </View>
              );
            })}

            {activas.map((inc) => {
              const lat = Number(inc.lat), lng = Number(inc.lng);
              if (lat === 0 && lng === 0) return null;
              const color = SEV_COLOR[inc.severidad] ?? SEV_COLOR.medium;
              return (
                <Marker key={inc.id} coordinate={{ latitude: lat, longitude: lng }}>
                  <View style={[s.incPin, { backgroundColor: color }]}>
                    <Ionicons name={(TIPO_ICON[inc.tipo] ?? 'warning') as any} size={13} color="#fff" />
                  </View>
                  <Callout>
                    <View style={{ maxWidth: 180 }}>
                      <Text style={s.calloutTitle}>{TIPO_LABEL[inc.tipo] ?? inc.tipo}</Text>
                      <Text style={s.calloutSub}>{inc.via}</Text>
                      <Text style={s.calloutDesc}>{inc.descripcion}</Text>
                    </View>
                  </Callout>
                </Marker>
              );
            })}
          </MapView>
        </View>

        <View style={s.panel}>
          <View style={s.panelCard}>
            <Text style={s.panelTitle}>ALERTAS ACTIVAS ({activas.length})</Text>
            {incidencias.length === 0 ? (
              <Text style={s.empty}>Sin incidencias activas</Text>
            ) : (
              activas.slice(0, 4).map(inc => (
                <View key={inc.id} style={s.row}>
                  <Ionicons name={(TIPO_ICON[inc.tipo] ?? 'warning') as any} size={14} color={SEV_COLOR[inc.severidad] ?? SEV_COLOR.medium} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.rowTitle}>{TIPO_LABEL[inc.tipo] ?? inc.tipo}</Text>
                    <Text style={s.rowSub}>{inc.via}</Text>
                  </View>
                </View>
              ))
            )}
          </View>

          <View style={s.panelCard}>
            <Text style={s.panelTitle}>RUTAS EN EL MAPA ({rutas.length})</Text>
            {rutas.length === 0 ? (
              <Text style={s.empty}>Todavía no hay rutas publicadas</Text>
            ) : (
              rutas.slice(0, 4).map(r => (
                <TouchableOpacity key={r.id} style={s.row} onPress={() => router.push(`/rutas/${r.id}` as any)}>
                  <Ionicons name="trail-sign-outline" size={14} color={colors.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.rowTitle}>{r.nombre}</Text>
                    <Text style={s.rowSub}>{r.region}</Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
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
  alertBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.danger + '20', borderRadius: radius.full, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: colors.danger + '40' },
  alertDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.danger },
  alertText: { color: colors.danger, fontSize: 12, fontWeight: '700' },
  mapContainer: { marginHorizontal: 16, height: 340, borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  routePin: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.primary, borderWidth: 2, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  routePinText: { color: '#fff', fontWeight: '800', fontSize: 11 },
  incPin: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  calloutTitle: { fontWeight: '700', fontSize: 13, marginBottom: 2 },
  calloutSub: { color: '#666', fontSize: 11, marginBottom: 2 },
  calloutDesc: { fontSize: 11 },
  calloutLink: { color: colors.primary, fontWeight: '700', fontSize: 11, marginTop: 2 },
  panel: { padding: 16, gap: 12 },
  panelCard: { backgroundColor: colors.surface1, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 10 },
  panelTitle: { color: colors.primary, fontSize: 10, fontWeight: '700', letterSpacing: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowTitle: { color: colors.foreground, fontWeight: '700', fontSize: 13 },
  rowSub: { color: colors.muted, fontSize: 11 },
  empty: { color: colors.muted, fontSize: 12, textAlign: 'center', paddingVertical: 8 },
});
