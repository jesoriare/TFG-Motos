import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { colors, radius } from '@/constants/theme';

interface Waypoint { lat: number; lng: number; }

const DIFICULTADES = [
  { key: 'facil', label: 'Fácil', color: colors.success },
  { key: 'media', label: 'Media', color: colors.amber },
  { key: 'media_alta', label: 'Media-Alta', color: '#F97316' },
  { key: 'alta', label: 'Alta', color: colors.danger },
];

async function getOsrmRoute(pts: Waypoint[]) {
  if (pts.length < 2) return null;
  try {
    const coords = pts.map(p => `${p.lng},${p.lat}`).join(';');
    const res = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`
    );
    if (!res.ok) return null;
    const data = await res.json();
    const route = data.routes?.[0];
    if (!route) return null;
    return {
      coords: route.geometry.coordinates.map(([lng, lat]: number[]) => ({ latitude: lat, longitude: lng })),
      distanceKm: Math.round(route.distance / 1000),
      durationMin: Math.round(route.duration / 60),
    };
  } catch { return null; }
}

export default function CrearRutaScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [routeCoords, setRouteCoords] = useState<{ latitude: number; longitude: number }[]>([]);
  const [form, setForm] = useState({
    nombre: '', region: '', distancia_km: '',
    horas: '', minutos: '', dificultad: 'media',
    descripcion: '', tags: [] as string[],
  });

  useEffect(() => {
    if (waypoints.length >= 2) {
      getOsrmRoute(waypoints).then(route => {
        if (route) {
          setRouteCoords(route.coords);
          setForm(p => ({
            ...p,
            distancia_km: String(route.distanceKm),
            horas: String(Math.floor(route.durationMin / 60)),
            minutos: String(route.durationMin % 60),
          }));
        }
      });
    } else {
      setRouteCoords([]);
    }
  }, [waypoints]);

  function set(key: keyof typeof form) {
    return (val: string) => setForm(prev => ({ ...prev, [key]: val }));
  }

  function addWaypoint(lat: number, lng: number) {
    setWaypoints(prev => [...prev, { lat, lng }]);
  }

  function removeWaypoint(i: number) {
    setWaypoints(prev => prev.filter((_, idx) => idx !== i));
  }

  function addTag() {
    const t = tagInput.trim();
    if (t && !(form.tags as string[]).includes(t)) {
      setForm(prev => ({ ...prev, tags: [...(prev.tags as string[]), t] }));
    }
    setTagInput('');
  }

  async function handleSubmit() {
    if (!form.nombre || !form.region || !form.distancia_km) {
      Alert.alert('Error', 'Rellena los campos obligatorios');
      return;
    }
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { Alert.alert('Error', 'Debes iniciar sesión'); setLoading(false); return; }
    const duracion_min = (parseInt(form.horas || '0') * 60) + parseInt(form.minutos || '0');
    const { error } = await supabase.from('rutas').insert({
      user_id: session.user.id,
      nombre: form.nombre,
      region: form.region,
      distancia_km: parseInt(form.distancia_km),
      duracion_min,
      dificultad: form.dificultad,
      descripcion: form.descripcion || null,
      tags: form.tags,
      waypoints,
    });
    setLoading(false);
    if (error) { Alert.alert('Error', error.message); return; }
    Alert.alert('¡Ruta publicada!', 'Tu ruta ya está disponible para la comunidad', [
      { text: 'OK', onPress: () => router.back() },
    ]);
  }

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={18} color={colors.muted} />
        </TouchableOpacity>
        <Text style={s.title}>PUBLICA <Text style={s.titleOrange}>TU RUTA</Text></Text>
        <View style={{ width: 32 }} />
      </View>

      {/* Map */}
      <View style={s.mapContainer}>
        <MapView
          style={s.map}
          provider={PROVIDER_DEFAULT}
          initialRegion={{ latitude: 40.4, longitude: -3.7, latitudeDelta: 8, longitudeDelta: 8 }}
          onPress={e => addWaypoint(e.nativeEvent.coordinate.latitude, e.nativeEvent.coordinate.longitude)}
        >
          {waypoints.map((wp, i) => (
            <Marker key={i} coordinate={{ latitude: wp.lat, longitude: wp.lng }}>
              <View style={s.markerCircle}>
                <Text style={s.markerLabel}>{String.fromCharCode(65 + i)}</Text>
              </View>
            </Marker>
          ))}
          {routeCoords.length > 0 && (
            <Polyline coordinates={routeCoords} strokeColor={colors.primary} strokeWidth={4} />
          )}
        </MapView>
        <View style={s.mapHint} pointerEvents="none">
          <Ionicons name="location-outline" size={12} color={colors.muted} />
          <Text style={s.mapHintText}>Toca el mapa para añadir paradas</Text>
        </View>
      </View>

      {/* Waypoints horizontal list */}
      {waypoints.length > 0 && (
        <View style={s.waypointBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingVertical: 10 }}>
            {waypoints.map((wp, i) => (
              <View key={i} style={s.waypointChip}>
                <View style={s.waypointBubble}>
                  <Text style={s.waypointBubbleText}>{String.fromCharCode(65 + i)}</Text>
                </View>
                <Text style={s.waypointCoords}>{wp.lat.toFixed(3)}, {wp.lng.toFixed(3)}</Text>
                <TouchableOpacity onPress={() => removeWaypoint(i)}>
                  <Ionicons name="close" size={13} color={colors.muted} />
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity style={s.clearBtn} onPress={() => { setWaypoints([]); setRouteCoords([]); }}>
              <Ionicons name="trash-outline" size={13} color={colors.danger} />
              <Text style={[s.waypointCoords, { color: colors.danger }]}>Limpiar</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      {/* Form */}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView style={s.scroll} contentContainerStyle={s.formContainer} keyboardShouldPersistTaps="handled">
          <View style={s.card}>
            <Label text="NOMBRE DE LA RUTA *" />
            <Field value={form.nombre} onChange={set('nombre')} placeholder="Ruta de las Águilas" />

            <Label text="REGIÓN / PROVINCIA *" />
            <Field value={form.region} onChange={set('region')} placeholder="Sierra de Gredos, Ávila" />

            <View style={s.row}>
              <View style={{ flex: 1 }}>
                <Label text="DISTANCIA (KM) *" />
                <Field value={form.distancia_km} onChange={set('distancia_km')} placeholder="186" keyboardType="numeric" />
              </View>
              <View style={{ flex: 1 }}>
                <Label text="DURACIÓN" />
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <TextInput style={[s.input, { flex: 1 }]} value={form.horas} onChangeText={set('horas')} placeholder="3h" keyboardType="numeric" placeholderTextColor={colors.muted + '60'} />
                  <TextInput style={[s.input, { flex: 1 }]} value={form.minutos} onChangeText={set('minutos')} placeholder="30m" keyboardType="numeric" placeholderTextColor={colors.muted + '60'} />
                </View>
              </View>
            </View>

            <Label text="DIFICULTAD" />
            <View style={s.difRow}>
              {DIFICULTADES.map(d => (
                <TouchableOpacity
                  key={d.key}
                  style={[s.difBtn, form.dificultad === d.key && { borderColor: d.color, backgroundColor: d.color + '20' }]}
                  onPress={() => setForm(p => ({ ...p, dificultad: d.key }))}
                >
                  <Text style={[s.difText, form.dificultad === d.key && { color: d.color }]}>{d.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Label text="ETIQUETAS" />
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
              <TextInput
                style={[s.input, { flex: 1 }]}
                value={tagInput}
                onChangeText={setTagInput}
                onSubmitEditing={addTag}
                placeholder="Montaña, Curvas..."
                placeholderTextColor={colors.muted + '60'}
                returnKeyType="done"
              />
              <TouchableOpacity style={s.addTagBtn} onPress={addTag}>
                <Ionicons name="add" size={18} color={colors.muted} />
              </TouchableOpacity>
            </View>
            {(form.tags as string[]).length > 0 && (
              <View style={s.tagsRow}>
                {(form.tags as string[]).map(tag => (
                  <TouchableOpacity key={tag} style={s.tag} onPress={() => setForm(p => ({ ...p, tags: (p.tags as string[]).filter(t => t !== tag) }))}>
                    <Text style={s.tagText}>{tag}</Text>
                    <Ionicons name="close" size={12} color={colors.muted} />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Label text="DESCRIPCIÓN" />
            <TextInput
              style={[s.input, { height: 80, textAlignVertical: 'top' }]}
              value={form.descripcion}
              onChangeText={set('descripcion')}
              placeholder="Describe los puntos de interés..."
              placeholderTextColor={colors.muted + '60'}
              multiline
            />

            <TouchableOpacity style={[s.btn, loading && { opacity: 0.5 }]} onPress={handleSubmit} disabled={loading}>
              {loading ? <ActivityIndicator color={colors.primaryFg} /> : <Text style={s.btnText}>PUBLICAR RUTA</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function Label({ text }: { text: string }) {
  return <Text style={{ color: colors.muted, fontSize: 11, fontWeight: '700', marginBottom: 6, letterSpacing: 1 }}>{text}</Text>;
}
function Field({ value, onChange, placeholder, keyboardType }: {
  value: string; onChange: (v: string) => void; placeholder?: string; keyboardType?: any;
}) {
  return (
    <TextInput style={s.input} value={value} onChangeText={onChange} placeholder={placeholder}
      placeholderTextColor={colors.muted + '60'} keyboardType={keyboardType}
      autoCapitalize="words" autoCorrect={false} />
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 52, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn: { padding: 4 },
  title: { fontSize: 20, fontWeight: '900', color: colors.foreground },
  titleOrange: { color: colors.primary },
  mapContainer: { height: 280, position: 'relative' },
  map: { flex: 1 },
  mapHint: { position: 'absolute', bottom: 10, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.surface1 + 'DD', borderRadius: radius.full, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: colors.border },
  mapHintText: { color: colors.muted, fontSize: 11 },
  markerCircle: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'white' },
  markerLabel: { color: 'white', fontWeight: '800', fontSize: 11 },
  waypointBar: { borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface1 },
  waypointChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.surface2, borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: colors.border },
  waypointBubble: { width: 18, height: 18, borderRadius: 9, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  waypointBubbleText: { color: 'white', fontWeight: '800', fontSize: 9 },
  waypointCoords: { color: colors.muted, fontSize: 11 },
  clearBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5 },
  scroll: { flex: 1 },
  formContainer: { padding: 16, paddingBottom: 40 },
  card: { backgroundColor: colors.surface1, borderRadius: radius.xl, padding: 16, borderWidth: 1, borderColor: colors.border, gap: 8 },
  row: { flexDirection: 'row', gap: 10 },
  input: { backgroundColor: colors.surface3, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, color: colors.foreground, fontSize: 14, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 4 },
  difRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  difBtn: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.full, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: colors.surface2 },
  difText: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  addTagBtn: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface2 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 4 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.surface3, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 10, paddingVertical: 5 },
  tagText: { color: colors.muted, fontSize: 12 },
  btn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  btnText: { color: colors.primaryFg, fontWeight: '800', fontSize: 14, letterSpacing: 1.5 },
});
