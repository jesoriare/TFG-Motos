import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getSession } from '@/lib/auth';
import { valorarRuta } from '@/lib/api';
import { colors, radius } from '@/constants/theme';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

interface Waypoint { lat: number; lng: number; }
type PoiTipo = 'mirador' | 'descanso' | 'gasolinera';
interface PuntoInteres { lat: number; lng: number; tipo: PoiTipo; nombre?: string; }
interface Valoracion {
  puntuacion: number; comentario: string | null; created_at: string;
  profiles: { username: string };
}
interface Ruta {
  id: string; user_id: string; nombre: string; region: string;
  distancia_km: number; duracion_min: number; dificultad: string;
  descripcion: string | null; tags: string[]; waypoints: Waypoint[];
  puntos_interes: PuntoInteres[];
  avoid_highways: boolean; created_at: string;
  profiles: { username: string; verified: boolean; zona: string | null };
  valoraciones_ruta: Valoracion[];
}

const POI_TIPOS: { key: PoiTipo; label: string; emoji: string; color: string }[] = [
  { key: 'mirador',    label: 'Mirador',    emoji: '👁️', color: '#22C55E' },
  { key: 'descanso',   label: 'Descanso',   emoji: '☕', color: '#3B82F6' },
  { key: 'gasolinera', label: 'Gasolinera', emoji: '⛽', color: '#A855F7' },
];

const DIFICULTAD: Record<string, { label: string; color: string }> = {
  facil:      { label: 'Fácil',      color: colors.success },
  media:      { label: 'Media',      color: colors.amber },
  media_alta: { label: 'Media-Alta', color: '#F97316' },
  alta:       { label: 'Alta',       color: colors.danger },
};

function formatDuracion(min: number) {
  const h = Math.floor(min / 60), m = min % 60;
  return h > 0 ? `${h}h${m > 0 ? ` ${m}min` : ''}` : `${m}min`;
}

async function getRouteCoords(pts: Waypoint[], avoidHighways: boolean) {
  if (pts.length < 2) return null;
  try {
    const res = await fetch(`${API_URL}/geocode/route`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ waypoints: pts.map(p => ({ lat: p.lat, lon: p.lng })), avoidHighways }),
    });
    if (!res.ok) return null;
    const data = await res.json() as { coords: [number, number][] } | null;
    return data?.coords?.map(([lat, lng]) => ({ latitude: lat, longitude: lng })) ?? null;
  } catch { return null; }
}

export default function RutaDetalleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [ruta, setRuta] = useState<Ruta | null>(null);
  const [loading, setLoading] = useState(true);
  const [routeCoords, setRouteCoords] = useState<{ latitude: number; longitude: number }[]>([]);
  const [waypointNames, setWaypointNames] = useState<string[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [puntuacion, setPuntuacion] = useState(0);
  const [comentario, setComentario] = useState('');
  const [enviandoVal, setEnviandoVal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    getSession().then((session) => setCurrentUserId(session?.user.id ?? null));
  }, []);

  const loadRuta = useCallback(async () => {
    const r = await fetch(`${API_URL}/rutas/${id}`).catch(() => null);
    if (r?.ok) setRuta(await r.json());
    setLoading(false);
  }, [id]);

  useEffect(() => { loadRuta(); }, [loadRuta]);

  async function onRefresh() {
    setRefreshing(true);
    await loadRuta();
    setRefreshing(false);
  }

  useEffect(() => {
    if (!ruta?.waypoints?.length) return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    getRouteCoords(ruta.waypoints, ruta.avoid_highways ?? false).then(coords => {
      if (!ctrl.signal.aborted && coords) setRouteCoords(coords);
    });

    (async () => {
      const names: string[] = [];
      for (const wp of ruta.waypoints) {
        if (ctrl.signal.aborted) break;
        try {
          const res = await fetch(`${API_URL}/geocode/reverse?lat=${wp.lat}&lng=${wp.lng}`, { signal: ctrl.signal });
          const data = res.ok ? await res.json() : null;
          names.push(data?.name ?? `${wp.lat.toFixed(4)}, ${wp.lng.toFixed(4)}`);
          if (!ctrl.signal.aborted) setWaypointNames([...names]);
        } catch { break; }
      }
    })();

    return () => ctrl.abort();
  }, [ruta]);

  async function handleValorar() {
    if (puntuacion === 0) { Alert.alert('Selecciona una puntuación'); return; }
    const session = await getSession();
    if (!session) { Alert.alert('Debes iniciar sesión'); return; }
    setEnviandoVal(true);
    const { error } = await valorarRuta(id!, puntuacion, comentario || null, session.token);
    setEnviandoVal(false);
    if (error) { Alert.alert('Error', error); return; }
    Alert.alert('¡Gracias!', 'Valoración enviada');
    setPuntuacion(0); setComentario('');
    fetch(`${API_URL}/rutas/${id}`)
      .then(r => r.json())
      .then((data: Ruta) => setRuta(data));
  }

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!ruta) {
    return (
      <View style={s.center}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.muted} />
        <Text style={s.notFoundText}>Ruta no encontrada</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: colors.primary, marginTop: 8 }}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const dif = DIFICULTAD[ruta.dificultad] ?? { label: ruta.dificultad, color: colors.muted };
  const isOwner = currentUserId === ruta.user_id;
  const avgRating = ruta.valoraciones_ruta?.length
    ? +(ruta.valoraciones_ruta.reduce((s, v) => s + v.puntuacion, 0) / ruta.valoraciones_ruta.length).toFixed(1)
    : null;
  const mapCenter = ruta.waypoints?.[0]
    ? { latitude: ruta.waypoints[0].lat, longitude: ruta.waypoints[0].lng }
    : { latitude: 40.4, longitude: -3.7 };

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={18} color={colors.muted} />
        </TouchableOpacity>
        <Text style={s.headerTitle} numberOfLines={1}>{ruta.nombre}</Text>
        {isOwner ? (
          <TouchableOpacity
            style={s.editBtn}
            onPress={() => router.push(`/rutas/editar/${id}` as any)}
          >
            <Ionicons name="pencil" size={14} color={colors.primary} />
            <Text style={s.editBtnText}>Editar</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 64 }} />
        )}
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >

        {/* Mapa */}
        <View style={s.mapContainer}>
          <MapView
            style={s.map}
            provider={PROVIDER_DEFAULT}
            initialRegion={{ ...mapCenter, latitudeDelta: 3, longitudeDelta: 3 }}
            zoomEnabled
            scrollEnabled
            pitchEnabled
            rotateEnabled
          >
            {ruta.waypoints.map((wp, i) => (
              <Marker key={i} coordinate={{ latitude: wp.lat, longitude: wp.lng }}>
                <View style={s.markerCircle}>
                  <Text style={s.markerLabel}>{String.fromCharCode(65 + i)}</Text>
                </View>
              </Marker>
            ))}
            {ruta.puntos_interes?.map((p, i) => (
              <Marker key={`poi-${i}`} coordinate={{ latitude: p.lat, longitude: p.lng }}>
                <View style={[s.poiCircle, { backgroundColor: POI_TIPOS.find(t => t.key === p.tipo)!.color }]}>
                  <Text style={s.poiEmoji}>{POI_TIPOS.find(t => t.key === p.tipo)!.emoji}</Text>
                </View>
              </Marker>
            ))}
            {routeCoords.length > 0 && (
              <Polyline coordinates={routeCoords} strokeColor={colors.primary} strokeWidth={4} />
            )}
          </MapView>
        </View>

        <View style={s.content}>

          {/* Título + dificultad */}
          <View style={s.titleRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.nombre}>{ruta.nombre}</Text>
              <View style={s.regionRow}>
                <Ionicons name="location-outline" size={13} color={colors.muted} />
                <Text style={s.region}>{ruta.region}</Text>
              </View>
            </View>
            <View style={[s.difBadge, { borderColor: dif.color + '50', backgroundColor: dif.color + '18' }]}>
              <Text style={[s.difText, { color: dif.color }]}>{dif.label}</Text>
            </View>
          </View>

          {/* Stats */}
          <View style={s.statsRow}>
            <Stat icon="navigate-outline" value={`${ruta.distancia_km} km`} label="Distancia" />
            <Stat icon="time-outline" value={formatDuracion(ruta.duracion_min)} label="Duración" />
            <Stat icon="star" value={avgRating ? `${avgRating}/5` : '—'} label="Valoración" iconColor={colors.amber} />
          </View>

          {/* Autor */}
          <View style={s.autorRow}>
            <View style={s.avatarCircle}>
              <Ionicons name="person" size={16} color={colors.primary} />
            </View>
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={s.autorName}>@{ruta.profiles?.username}</Text>
                {ruta.profiles?.verified && <Ionicons name="shield-checkmark" size={13} color={colors.primary} />}
              </View>
              {ruta.profiles?.zona && <Text style={s.autorZona}>{ruta.profiles.zona}</Text>}
            </View>
          </View>

          {/* Waypoints */}
          {ruta.waypoints.length > 0 && (
            <View style={s.card}>
              <SectionTitle icon="map-outline" text={`Paradas (${ruta.waypoints.length})`} />
              <View style={{ gap: 8 }}>
                {ruta.waypoints.map((_, i) => (
                  <View key={i} style={s.waypointRow}>
                    <View style={s.waypointBubble}>
                      <Text style={s.waypointBubbleText}>{String.fromCharCode(65 + i)}</Text>
                    </View>
                    {waypointNames[i]
                      ? <Text style={s.waypointName}>{waypointNames[i]}</Text>
                      : <ActivityIndicator size="small" color={colors.primary} />
                    }
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Puntos de interés */}
          {ruta.puntos_interes?.length > 0 && (
            <View style={s.card}>
              <SectionTitle icon="pin-outline" text={`Puntos de interés (${ruta.puntos_interes.length})`} />
              <View style={{ gap: 8 }}>
                {ruta.puntos_interes.map((p, i) => {
                  const meta = POI_TIPOS.find(t => t.key === p.tipo)!;
                  return (
                    <View key={i} style={s.waypointRow}>
                      <View style={[s.poiBubble, { backgroundColor: meta.color }]}>
                        <Text style={s.poiBubbleEmoji}>{meta.emoji}</Text>
                      </View>
                      <Text style={s.waypointName}>{p.nombre ?? `${p.lat.toFixed(4)}, ${p.lng.toFixed(4)}`}</Text>
                      <Text style={s.poiTipoLabel}>{meta.label}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Descripción */}
          {ruta.descripcion && (
            <View style={s.card}>
              <SectionTitle icon="document-text-outline" text="Descripción" />
              <Text style={s.descripcion}>{ruta.descripcion}</Text>
            </View>
          )}

          {/* Tags */}
          {ruta.tags?.length > 0 && (
            <View style={s.card}>
              <SectionTitle icon="pricetag-outline" text="Etiquetas" />
              <View style={s.tagsRow}>
                {ruta.tags.map(tag => (
                  <View key={tag} style={s.tag}>
                    <Text style={s.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Valoraciones existentes */}
          {ruta.valoraciones_ruta?.length > 0 && (
            <View style={s.card}>
              <SectionTitle icon="star-outline" text={`Valoraciones (${ruta.valoraciones_ruta.length})`} />
              <View style={{ gap: 10 }}>
                {ruta.valoraciones_ruta.map((v, i) => (
                  <View key={i} style={s.valoracionCard}>
                    <View style={s.valoracionHeader}>
                      <Text style={s.valoracionUser}>@{v.profiles?.username}</Text>
                      <View style={s.starsRow}>
                        {Array.from({ length: 5 }).map((_, s) => (
                          <Ionicons
                            key={s} name="star" size={12}
                            color={s < v.puntuacion ? colors.amber : colors.border}
                          />
                        ))}
                      </View>
                    </View>
                    {v.comentario && <Text style={s.valoracionComentario}>{v.comentario}</Text>}
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Dejar valoración */}
          {currentUserId && currentUserId !== ruta.user_id && (
            <View style={s.card}>
              <SectionTitle icon="create-outline" text="Deja tu valoración" />
              <View style={[s.starsRow, { marginBottom: 12 }]}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <TouchableOpacity key={i} onPress={() => setPuntuacion(i + 1)}>
                    <Ionicons
                      name="star" size={28}
                      color={i < puntuacion ? colors.amber : colors.border}
                    />
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity
                style={[s.valBtn, enviandoVal && { opacity: 0.5 }]}
                onPress={handleValorar}
                disabled={enviandoVal}
              >
                {enviandoVal
                  ? <ActivityIndicator color={colors.primaryFg} />
                  : <Text style={s.valBtnText}>ENVIAR VALORACIÓN</Text>
                }
              </TouchableOpacity>
            </View>
          )}

        </View>
      </ScrollView>
    </View>
  );
}

function Stat({ icon, value, label, iconColor }: { icon: any; value: string; label: string; iconColor?: string }) {
  return (
    <View style={s.stat}>
      <Ionicons name={icon} size={16} color={iconColor ?? colors.primary} />
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

function SectionTitle({ icon, text }: { icon: any; text: string }) {
  return (
    <View style={s.sectionTitle}>
      <Ionicons name={icon} size={13} color={colors.muted} />
      <Text style={s.sectionTitleText}>{text}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background, gap: 12 },
  notFoundText: { color: colors.foreground, fontWeight: '700', fontSize: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 52, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn: { padding: 4, width: 32 },
  headerTitle: { flex: 1, color: colors.foreground, fontWeight: '800', fontSize: 16, textAlign: 'center', marginHorizontal: 8 },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: colors.primary + '50', borderRadius: radius.md, paddingHorizontal: 10, paddingVertical: 5 },
  editBtnText: { color: colors.primary, fontWeight: '700', fontSize: 12 },
  scroll: { paddingBottom: 60 },
  mapContainer: { height: 300 },
  map: { flex: 1 },
  markerCircle: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'white' },
  markerLabel: { color: 'white', fontWeight: '800', fontSize: 11 },
  poiCircle: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'white' },
  poiEmoji: { fontSize: 13 },
  poiBubble: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  poiBubbleEmoji: { fontSize: 11 },
  poiTipoLabel: { color: colors.muted, fontSize: 11 },
  content: { padding: 16, gap: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  nombre: { color: colors.foreground, fontWeight: '900', fontSize: 22 },
  regionRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  region: { color: colors.muted, fontSize: 13 },
  difBadge: { borderWidth: 1, borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 4, marginTop: 4 },
  difText: { fontSize: 11, fontWeight: '700' },
  statsRow: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, backgroundColor: colors.surface1, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 12, alignItems: 'center', gap: 4 },
  statValue: { color: colors.foreground, fontWeight: '800', fontSize: 14 },
  statLabel: { color: colors.muted, fontSize: 11 },
  autorRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4, borderTopWidth: 1, borderTopColor: colors.border },
  avatarCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary + '20', alignItems: 'center', justifyContent: 'center' },
  autorName: { color: colors.foreground, fontWeight: '700', fontSize: 14 },
  autorZona: { color: colors.muted, fontSize: 12 },
  card: { backgroundColor: colors.surface1, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 12 },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTitleText: { color: colors.muted, fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
  waypointRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  waypointBubble: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  waypointBubbleText: { color: 'white', fontWeight: '800', fontSize: 10 },
  waypointName: { color: colors.foreground, fontSize: 13, flex: 1 },
  descripcion: { color: colors.muted, fontSize: 14, lineHeight: 22 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { backgroundColor: colors.surface3, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 10, paddingVertical: 4 },
  tagText: { color: colors.muted, fontSize: 12 },
  starsRow: { flexDirection: 'row', gap: 4 },
  valoracionCard: { backgroundColor: colors.surface2, borderRadius: radius.md, padding: 10, gap: 6 },
  valoracionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  valoracionUser: { color: colors.foreground, fontWeight: '700', fontSize: 13 },
  valoracionComentario: { color: colors.muted, fontSize: 13 },
  valBtn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 12, alignItems: 'center' },
  valBtnText: { color: colors.primaryFg, fontWeight: '800', fontSize: 13, letterSpacing: 1 },
});
