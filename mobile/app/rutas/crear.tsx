import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView,
  Platform, Switch, FlatList,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getSession } from '@/lib/auth';
import { crearRuta } from '@/lib/api';
import { Spinner } from '@/components/Spinner';
import { colors, radius } from '@/constants/theme';
import { CIUDADES_ESPANA } from '@/data/ciudades-espana';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

interface Waypoint { lat: number; lng: number; name?: string; }
interface SearchResult { label: string; lat: number; lng: number; }

type PoiTipo = 'mirador' | 'descanso' | 'gasolinera';
interface PuntoInteres { lat: number; lng: number; tipo: PoiTipo; nombre?: string; }

const POI_TIPOS: { key: PoiTipo; label: string; emoji: string; color: string }[] = [
  { key: 'mirador',    label: 'Mirador',    emoji: '👁️', color: '#22C55E' },
  { key: 'descanso',   label: 'Descanso',   emoji: '☕', color: '#3B82F6' },
  { key: 'gasolinera', label: 'Gasolinera', emoji: '⛽', color: '#A855F7' },
];

const DIFICULTADES = [
  { key: 'facil', label: 'Fácil', color: colors.success },
  { key: 'media', label: 'Media', color: colors.amber },
  { key: 'media_alta', label: 'Media-Alta', color: '#F97316' },
  { key: 'alta', label: 'Alta', color: colors.danger },
];

async function getRoute(pts: Waypoint[], avoidHighways: boolean) {
  if (pts.length < 2) return null;
  try {
    const res = await fetch(`${API_URL}/geocode/route`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ waypoints: pts.map(p => ({ lat: p.lat, lon: p.lng })), avoidHighways }),
    });
    if (!res.ok) return null;
    const data = await res.json() as { coords: [number, number][]; distanceKm: number; durationMin: number } | null;
    if (!data) return null;
    return {
      coords: data.coords.map(([lat, lng]) => ({ latitude: lat, longitude: lng })),
      distanceKm: data.distanceKm,
      durationMin: data.durationMin,
    };
  } catch { return null; }
}

export default function CrearRutaScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [routeCoords, setRouteCoords] = useState<{ latitude: number; longitude: number }[]>([]);
  const [avoidHighways, setAvoidHighways] = useState(false);
  const [mode, setMode] = useState<'parada' | 'poi'>('parada');
  const [poiTipo, setPoiTipo] = useState<PoiTipo>('mirador');
  const [puntosInteres, setPuntosInteres] = useState<PuntoInteres[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [regionModal, setRegionModal] = useState(false);
  const [regionQuery, setRegionQuery] = useState('');
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  const [form, setForm] = useState({
    nombre: '', region: '', distancia_km: '',
    horas: '', minutos: '', dificultad: 'media',
    descripcion: '', tags: [] as string[],
  });

  // Recalcular ruta al cambiar waypoints o toggle
  useEffect(() => {
    if (waypoints.length >= 2) {
      getRoute(waypoints, avoidHighways).then(route => {
        if (!mountedRef.current || !route) return;
        setRouteCoords(route.coords);
        setForm(p => ({
          ...p,
          distancia_km: String(route.distanceKm),
          horas: String(Math.floor(route.durationMin / 60)),
          minutos: String(route.durationMin % 60),
        }));
      });
    } else {
      setRouteCoords([]);
    }
  }, [waypoints, avoidHighways]);

  // Búsqueda con debounce
  useEffect(() => {
    if (searchQuery.trim().length < 2) { setSearchResults([]); return; }
    setSearchLoading(true);
    const t = setTimeout(() => {
      fetch(`${API_URL}/geocode/search?q=${encodeURIComponent(searchQuery)}`)
        .then(r => r.ok ? r.json() : [])
        .then((data: SearchResult[]) => { if (mountedRef.current) setSearchResults(data); })
        .finally(() => { if (mountedRef.current) setSearchLoading(false); });
    }, 350);
    return () => clearTimeout(t);
  }, [searchQuery]);

  function set(key: keyof typeof form) {
    return (val: string) => setForm(prev => ({ ...prev, [key]: val }));
  }

  function addWaypointWithName(lat: number, lng: number, name?: string) {
    const idx = waypoints.length;
    setWaypoints(prev => [...prev, { lat, lng, name }]);
    if (!name) {
      fetch(`${API_URL}/geocode/reverse?lat=${lat}&lng=${lng}`)
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (!mountedRef.current || !data?.name) return;
          setWaypoints(prev => prev.map((wp, i) => i === idx ? { ...wp, name: data.name } : wp));
        })
        .catch(() => {});
    }
  }

  function pickSearchResult(result: SearchResult) {
    addWaypointWithName(result.lat, result.lng, result.label);
    setSearchQuery('');
    setSearchResults([]);
  }

  function removeWaypoint(i: number) {
    setWaypoints(prev => prev.filter((_, idx) => idx !== i));
  }

  function addPoi(lat: number, lng: number) {
    const idx = puntosInteres.length;
    setPuntosInteres(prev => [...prev, { lat, lng, tipo: poiTipo }]);
    fetch(`${API_URL}/geocode/reverse?lat=${lat}&lng=${lng}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!mountedRef.current || !data?.name) return;
        setPuntosInteres(prev => prev.map((p, i) => i === idx ? { ...p, nombre: data.name } : p));
      })
      .catch(() => {});
  }

  function removePoi(i: number) {
    setPuntosInteres(prev => prev.filter((_, idx) => idx !== i));
  }

  function handleMapPress(lat: number, lng: number) {
    if (mode === 'poi') addPoi(lat, lng);
    else addWaypointWithName(lat, lng);
  }

  function addTag() {
    const t = tagInput.trim();
    if (t && !(form.tags as string[]).includes(t))
      setForm(prev => ({ ...prev, tags: [...(prev.tags as string[]), t] }));
    setTagInput('');
  }

  async function handleSubmit() {
    if (!form.nombre || !form.region || !form.distancia_km) {
      Alert.alert('Error', 'Rellena los campos obligatorios');
      return;
    }
    setLoading(true);
    const session = await getSession();
    if (!session) { Alert.alert('Error', 'Debes iniciar sesión'); setLoading(false); return; }
    const duracion_min = (parseInt(form.horas || '0') * 60) + parseInt(form.minutos || '0');
    const { error } = await crearRuta({
      nombre: form.nombre,
      region: form.region,
      distancia_km: parseInt(form.distancia_km),
      duracion_min,
      dificultad: form.dificultad,
      descripcion: form.descripcion || null,
      tags: form.tags,
      waypoints: waypoints.map(({ lat, lng }) => ({ lat, lng })),
      puntos_interes: puntosInteres.map(({ lat, lng, tipo, nombre }) => ({ lat, lng, tipo, nombre })),
      avoid_highways: avoidHighways,
    }, session.token);
    setLoading(false);
    if (error) { Alert.alert('Error', error); return; }
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
          onPress={e => handleMapPress(e.nativeEvent.coordinate.latitude, e.nativeEvent.coordinate.longitude)}
        >
          {waypoints.map((wp, i) => (
            <Marker key={i} coordinate={{ latitude: wp.lat, longitude: wp.lng }}>
              <View style={s.markerCircle}>
                <Text style={s.markerLabel}>{String.fromCharCode(65 + i)}</Text>
              </View>
            </Marker>
          ))}
          {puntosInteres.map((p, i) => (
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

        {/* Selector de modo */}
        <View style={s.modeSelector} pointerEvents="box-none">
          <View style={s.modeTabs}>
            <TouchableOpacity style={[s.modeTab, mode === 'parada' && s.modeTabActive]} onPress={() => setMode('parada')}>
              <Text style={[s.modeTabText, mode === 'parada' && s.modeTabTextActive]}>Parada</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.modeTab, mode === 'poi' && s.modeTabActive]} onPress={() => setMode('poi')}>
              <Text style={[s.modeTabText, mode === 'poi' && s.modeTabTextActive]}>Punto de interés</Text>
            </TouchableOpacity>
          </View>
          {mode === 'poi' && (
            <View style={s.poiTiposRow}>
              {POI_TIPOS.map(t => (
                <TouchableOpacity
                  key={t.key}
                  style={[s.poiTipoChip, poiTipo === t.key && { backgroundColor: t.color }]}
                  onPress={() => setPoiTipo(t.key)}
                >
                  <Text style={s.poiTipoEmoji}>{t.emoji}</Text>
                  <Text style={[s.poiTipoText, poiTipo === t.key && { color: 'white' }]}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View style={s.mapHint} pointerEvents="none">
          <Ionicons name="location-outline" size={12} color={colors.muted} />
          <Text style={s.mapHintText}>{mode === 'poi' ? 'Toca el mapa para añadir un punto de interés' : 'Toca el mapa para añadir paradas'}</Text>
        </View>
      </View>

      {/* Search bar */}
      <View style={s.searchContainer}>
        <View style={s.searchInputRow}>
          <Ionicons name="search" size={15} color={colors.muted} style={{ marginLeft: 12 }} />
          <TextInput
            style={s.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Añadir parada por nombre..."
            placeholderTextColor={colors.muted + '60'}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {searchLoading
            ? <Spinner size="small" />
            : searchQuery.length > 0
              ? <TouchableOpacity onPress={() => { setSearchQuery(''); setSearchResults([]); }} style={{ paddingRight: 12 }}>
                  <Ionicons name="close" size={15} color={colors.muted} />
                </TouchableOpacity>
              : null
          }
        </View>
        {searchResults.length > 0 && (
          <View style={s.searchDropdown}>
            <FlatList
              data={searchResults}
              keyExtractor={(_, i) => String(i)}
              scrollEnabled={false}
              renderItem={({ item }) => (
                <TouchableOpacity style={s.searchResult} onPress={() => pickSearchResult(item)}>
                  <Ionicons name="location" size={14} color={colors.primary} />
                  <Text style={s.searchResultText} numberOfLines={1}>{item.label}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        )}
      </View>

      {/* Waypoints list */}
      {waypoints.length > 0 && (
        <View style={s.waypointBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingVertical: 10 }}>
            {waypoints.map((wp, i) => (
              <View key={i} style={s.waypointChip}>
                <View style={s.waypointBubble}>
                  <Text style={s.waypointBubbleText}>{String.fromCharCode(65 + i)}</Text>
                </View>
                {wp.name !== undefined
                  ? <Text style={s.waypointName} numberOfLines={1} ellipsizeMode="tail">{wp.name}</Text>
                  : <ActivityIndicator size="small" color={colors.primary} style={{ marginHorizontal: 4 }} />
                }
                <TouchableOpacity onPress={() => removeWaypoint(i)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close" size={13} color={colors.muted} />
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity style={s.clearBtn} onPress={() => { setWaypoints([]); setRouteCoords([]); }}>
              <Ionicons name="trash-outline" size={13} color={colors.danger} />
              <Text style={{ color: colors.danger, fontSize: 11 }}>Limpiar</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      {/* Puntos de interés list */}
      {puntosInteres.length > 0 && (
        <View style={s.waypointBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingVertical: 10 }}>
            {puntosInteres.map((p, i) => {
              const meta = POI_TIPOS.find(t => t.key === p.tipo)!;
              return (
                <View key={i} style={s.waypointChip}>
                  <View style={[s.poiBubble, { backgroundColor: meta.color }]}>
                    <Text style={s.poiBubbleEmoji}>{meta.emoji}</Text>
                  </View>
                  {p.nombre !== undefined
                    ? <Text style={s.waypointName} numberOfLines={1} ellipsizeMode="tail">{p.nombre}</Text>
                    : <ActivityIndicator size="small" color={colors.primary} style={{ marginHorizontal: 4 }} />
                  }
                  <TouchableOpacity onPress={() => removePoi(i)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="close" size={13} color={colors.muted} />
                  </TouchableOpacity>
                </View>
              );
            })}
            <TouchableOpacity style={s.clearBtn} onPress={() => setPuntosInteres([])}>
              <Ionicons name="trash-outline" size={13} color={colors.danger} />
              <Text style={{ color: colors.danger, fontSize: 11 }}>Limpiar</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      {/* Form */}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView style={s.scroll} contentContainerStyle={s.formContainer} keyboardShouldPersistTaps="handled">
          <View style={s.card}>

            {/* Toggle evitar autopistas */}
            <View style={s.toggleRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.toggleLabel}>EVITAR AUTOPISTAS</Text>
                <Text style={s.toggleSub}>Recalcula la ruta evitando vías rápidas</Text>
              </View>
              <Switch
                value={avoidHighways}
                onValueChange={setAvoidHighways}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="white"
              />
            </View>

            <View style={s.divider} />

            <Label text="NOMBRE DE LA RUTA *" />
            <Field value={form.nombre} onChange={set('nombre')} placeholder="Ruta de las Águilas" />

            <Label text="REGIÓN / PROVINCIA *" />
            <TouchableOpacity style={s.selector} onPress={() => { setRegionQuery(''); setRegionModal(true); }}>
              <Ionicons name="location-outline" size={16} color={colors.muted} />
              <Text style={[s.selectorText, !form.region && { color: colors.muted + '60' }]}>
                {form.region || 'Selecciona una ciudad...'}
              </Text>
              <Ionicons name="chevron-down" size={16} color={colors.muted} />
            </TouchableOpacity>

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

      {/* Modal selector región */}
      {regionModal && (
        <View style={s.modal}>
          <View style={s.modalCard}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Región / Ciudad</Text>
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
            <ScrollView style={{ maxHeight: 360 }} keyboardShouldPersistTaps="handled">
              {CIUDADES_ESPANA.filter(c => c.toLowerCase().includes(regionQuery.toLowerCase())).slice(0, 60).map(ciudad => (
                <TouchableOpacity
                  key={ciudad}
                  style={[s.ciudadItem, form.region === ciudad && s.ciudadItemActive]}
                  onPress={() => { setForm(p => ({ ...p, region: ciudad })); setRegionModal(false); setRegionQuery(''); }}
                >
                  {form.region === ciudad && <Ionicons name="checkmark" size={16} color={colors.primary} style={{ marginRight: 8 }} />}
                  <Text style={[s.ciudadText, form.region === ciudad && { color: colors.primary }]}>{ciudad}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      )}
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
  mapContainer: { height: 260, position: 'relative' },
  map: { flex: 1 },
  mapHint: { position: 'absolute', bottom: 10, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.surface1 + 'DD', borderRadius: radius.full, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: colors.border },
  mapHintText: { color: colors.muted, fontSize: 11 },
  markerCircle: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'white' },
  markerLabel: { color: 'white', fontWeight: '800', fontSize: 11 },
  poiCircle: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'white' },
  poiEmoji: { fontSize: 13 },
  poiBubble: { width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  poiBubbleEmoji: { fontSize: 10 },
  modeSelector: { position: 'absolute', top: 10, alignSelf: 'center', alignItems: 'center', gap: 6 },
  modeTabs: { flexDirection: 'row', backgroundColor: colors.surface1 + 'EE', borderRadius: radius.full, padding: 3, borderWidth: 1, borderColor: colors.border },
  modeTab: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full },
  modeTabActive: { backgroundColor: colors.primary },
  modeTabText: { color: colors.muted, fontSize: 11, fontWeight: '700' },
  modeTabTextActive: { color: colors.primaryFg },
  poiTiposRow: { flexDirection: 'row', gap: 4, backgroundColor: colors.surface1 + 'EE', borderRadius: radius.full, padding: 3, borderWidth: 1, borderColor: colors.border },
  poiTipoChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.full },
  poiTipoEmoji: { fontSize: 11 },
  poiTipoText: { color: colors.muted, fontSize: 10, fontWeight: '700' },
  searchContainer: { borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface1 },
  searchInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingRight: 4, paddingVertical: 2 },
  searchInput: { flex: 1, color: colors.foreground, fontSize: 14, paddingVertical: 10, paddingHorizontal: 8 },
  searchDropdown: { borderTopWidth: 1, borderTopColor: colors.border },
  searchResult: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.border + '40' },
  searchResultText: { flex: 1, color: colors.foreground, fontSize: 13 },
  waypointBar: { borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface1 },
  waypointChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.surface2, borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: colors.border, width: 180 },
  waypointBubble: { width: 18, height: 18, borderRadius: 9, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  waypointBubbleText: { color: 'white', fontWeight: '800', fontSize: 9 },
  waypointName: { color: colors.foreground, fontSize: 11, flex: 1 },
  clearBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 },
  toggleLabel: { color: colors.muted, fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  toggleSub: { color: colors.muted + '80', fontSize: 11, marginTop: 2 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 4 },
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
  selector: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.surface3, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 12, marginBottom: 4 },
  selectorText: { flex: 1, color: colors.foreground, fontSize: 14 },
  modal: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000000AA', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: colors.surface1, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: 20, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  modalTitle: { color: colors.foreground, fontWeight: '700', fontSize: 16 },
  modalSearch: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.surface3, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10 },
  modalInput: { flex: 1, color: colors.foreground, fontSize: 14 },
  ciudadItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: colors.border + '40' },
  ciudadItemActive: { backgroundColor: colors.primary + '10' },
  ciudadText: { color: colors.foreground, fontSize: 14 },
});
